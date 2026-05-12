#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as cheerio from "cheerio";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

// Define the Context interface if not already defined
interface Context {
  error(message: string): Promise<void>;
}

interface CreateServerOptions {
  config: Record<string, unknown>;
}

// Server implementation
export default function createServer({ config }: CreateServerOptions) {
  // config contains user-provided settings (see configSchema below)
  const server = new McpServer(
    {
      name: "web-scout",
      version: "1.5.5"
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

// Define interfaces for the data structures
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface MemoryStats {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  usagePercentage: number;
}

/**
 * Rate limiter class to throttle requests
 */
class RateLimiter {
  private requestsPerMinute: number;
  private requests: Date[];

  constructor(requestsPerMinute: number = 30) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }

  async acquire(): Promise<void> {
    const now = new Date();
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(
      req => now.getTime() - req.getTime() < 60 * 1000
    );

    if (this.requests.length >= this.requestsPerMinute) {
      // Wait until we can make another request
      const oldestRequest = this.requests[0];
      const waitTime = 60 - (now.getTime() - oldestRequest.getTime()) / 1000;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }

    this.requests.push(now);
  }
}

/**
 * DuckDuckGo search implementation
 */
class DuckDuckGoSearcher {
  private static readonly BASE_URL = "https://html.duckduckgo.com/html";
  private static readonly HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  };

  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter();
  }

  formatResultsForLLM(results: SearchResult[]): string {
    if (!results.length) {
      return "No results were found for your search query. Please try rephrasing your search or try again in a few minutes.";
    }

    const output: string[] = [];
    output.push(`Found ${results.length} search results:\n`);

    for (const result of results) {
      output.push(`${result.position}. ${result.title}`);
      output.push(`   URL: ${result.link}`);
      output.push(`   Summary: ${result.snippet}`);
      output.push("");  // Empty line between results
    }

    return output.join("\n");
  }

  async search(query: string, ctx: Context, maxResults: number = 10): Promise<SearchResult[]> {
    try {
      // Apply rate limiting
      await this.rateLimiter.acquire();

      // Create form data for POST request
      const data = {
        q: query,
        b: "",
        kl: "",
      };

      const response = await axios.post(
        DuckDuckGoSearcher.BASE_URL,
        new URLSearchParams(data),
        {
          headers: DuckDuckGoSearcher.HEADERS,
          timeout: 30000
        }
      );

      // Parse HTML response
      const $ = cheerio.load(response.data);
      if (!$) {
        await ctx.error("Failed to parse HTML response");
        return [];
      }

      const results: SearchResult[] = [];
      $('.result').each((_, element) => {
        const titleElem = $(element).find('.result__title');
        if (!titleElem.length) return;

        const linkElem = titleElem.find('a');
        if (!linkElem.length) return;

        const title = linkElem.text().trim();
        let link = linkElem.attr('href') || "";

        // Skip ad results
        if (link.includes("y.js")) return;

        // Clean up DuckDuckGo redirect URLs
        if (link.startsWith("//duckduckgo.com/l/?uddg=")) {
          link = decodeURIComponent(link.split("uddg=")[1].split("&")[0]);
        }

        const snippetElem = $(element).find('.result__snippet');
        const snippet = snippetElem.length ? snippetElem.text().trim() : "";

        results.push({
          title,
          link,
          snippet,
          position: results.length + 1,
        });

        if (results.length >= maxResults) {
          return false; // Break out of the loop
        }
      });

      return results;

    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        await ctx.error("Search request timed out");
      } else if (axios.isAxiosError(error)) {
        await ctx.error(`HTTP error occurred: ${error.message}`);
      } else {
        await ctx.error(`Unexpected error during search: ${(error as Error).message}`);
      }
      return [];
    }
  }
}

/**
 * Web content fetcher with memory management optimizations
 */
class WebContentFetcher {
  private rateLimiter: RateLimiter;
  private tempFiles: string[] = [];
  private readonly MAX_IN_MEMORY_SIZE = 5 * 1024 * 1024; // 5MB

  constructor() {
    this.rateLimiter = new RateLimiter(20);
    
    // Set up cleanup on process exit
    process.on('exit', this.cleanup.bind(this));
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit();
    });
  }

  private async cleanup(): Promise<void> {
    // Clean up temporary files
    for (const file of this.tempFiles) {
      try {
        await fs.unlink(file);
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  }

  private async getMemoryStats(): Promise<MemoryStats> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercentage = (usedMemory / totalMemory) * 100;

    return {
      totalMemory,
      freeMemory,
      usedMemory,
      usagePercentage
    };
  }

  private async processHtml(html: string): Promise<string> {
    // Process in memory or offload to temp file based on size
    const memoryStats = await this.getMemoryStats();
    
    if (html.length > this.MAX_IN_MEMORY_SIZE || memoryStats.usagePercentage > 70) {
      // Write to temporary file and process in chunks
      const tempFilePath = path.join(os.tmpdir(), `mcp-fetch-${uuidv4()}.html`);
      this.tempFiles.push(tempFilePath);
      
      await fs.writeFile(tempFilePath, html);
      
      // Process the file in a memory-efficient way
      const fileData = await fs.readFile(tempFilePath, 'utf-8');
      const $ = cheerio.load(fileData);
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Get the text content
      let text = $.text();
      
      // Clean up the text
      text = text.replace(/\s+/g, ' ').trim();
      
      // Truncate if too long
      if (text.length > 8000) {
        text = text.substring(0, 8000) + "... [content truncated]";
      }
      
      // Remove the temp file
      try {
        await fs.unlink(tempFilePath);
        const index = this.tempFiles.indexOf(tempFilePath);
        if (index > -1) {
          this.tempFiles.splice(index, 1);
        }
      } catch (err) {
        // File will be cleaned up on exit
      }
      
      return text;
    } else {
      // Process in memory
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Get the text content
      let text = $.text();
      
      // Clean up the text
      text = text.replace(/\s+/g, ' ').trim();
      
      // Truncate if too long
      if (text.length > 8000) {
        text = text.substring(0, 8000) + "... [content truncated]";
      }
      
      return text;
    }
  }

  async fetchAndParse(urlStr: string, ctx: Context): Promise<string> {
    try {
      await this.rateLimiter.acquire();

      const response = await axios.get(urlStr, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        maxRedirects: 5,
        timeout: 30000,
        responseType: 'text'
      });

      const text = await this.processHtml(response.data);

      return text;

    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        await ctx.error(`Request timed out for URL: ${urlStr}`);
        return `Error: The request timed out while trying to fetch the webpage.`;
      } else if (axios.isAxiosError(error)) {
        await ctx.error(`HTTP error occurred while fetching ${urlStr}: ${error.message}`);
        return `Error: Could not access the webpage (${error.message})`;
      } else {
        await ctx.error(`Error fetching content from ${urlStr}: ${(error as Error).message}`);
        return `Error: An unexpected error occurred while fetching the webpage (${(error as Error).message})`;
      }
    }
  }

  async fetchMultipleUrls(urls: string[], ctx: Context): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const memoryStats = await this.getMemoryStats();
    
    // Determine batch size based on available memory
    let batchSize = 3; // Default
    if (memoryStats.usagePercentage > 70) {
      batchSize = 1; // Reduce batch size if memory is constrained
    } else if (memoryStats.usagePercentage < 30) {
      batchSize = 5; // Increase batch size if plenty of memory
    }
  
    // Process URLs in batches to manage memory
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            const content = await this.fetchAndParse(url, ctx);
            return { url, content };
          } catch (error) {
            // Handle errors for individual URLs
            return { 
              url, 
              content: `Error processing URL: ${(error as Error).message}` 
            };
          }
        })
      );
      
      // Add batch results to the overall results
      for (const { url, content } of batchResults) {
        results[url] = content;
      }
      
      // Force garbage collection if available (Node with --expose-gc flag)
      if (global.gc) {
        global.gc();
      }
      
      // Small delay between batches to allow system to recover
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}

const searcher = new DuckDuckGoSearcher();
const fetcher = new WebContentFetcher();

const createContextAdapter = (): Context => ({
  error: async () => {
    /* no-op */
  },
});

server.registerTool(
  "DuckDuckGoWebSearch",
  {
    description:
      "Initiates a web search query using the DuckDuckGo search engine and returns a well-structured list of findings. Input the keywords, question, or topic you want to search for using DuckDuckGo as your query. Input the maximum number of search entries you'd like to receive using maxResults - defaults to 10 if not provided.",
    inputSchema: {
      query: z
        .string()
        .min(1, "Query is required")
        .describe("Search query string"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe("Maximum number of results to return (default: 10)"),
    },
  },
  async (args) => {
    const context = createContextAdapter();
    const searchResults = await searcher.search(
      args.query,
      context,
      args.maxResults ?? 10,
    );
    const result = searcher.formatResultsForLLM(searchResults);

    return {
      content: [{ type: "text", text: result }],
      isError: false,
    };
  },
);

server.registerTool(
  "UrlContentExtractor",
  {
    description:
      "Fetches and extracts content from a given webpage URL. Input the URL of the webpage you want to extract content from as a string using the url parameter. You can also input an array of URLs to fetch content from multiple pages at once.",
    inputSchema: {
      url: z
        .union([
          z
            .string()
            .url("Must be a valid URL")
            .describe("The webpage URL to fetch content from"),
          z
            .array(z.string().url("Each entry must be a valid URL"))
            .min(1)
            .describe("List of webpage URLs to get content from"),
        ])
        .describe("URL or list of URLs to fetch"),
    },
  },
  async (args) => {
    const context = createContextAdapter();

    if (typeof args.url === "string") {
      const result = await fetcher.fetchAndParse(args.url, context);
      return {
        content: [{ type: "text", text: result }],
        isError: false,
      };
    }

    if (Array.isArray(args.url)) {
      const results = await fetcher.fetchMultipleUrls(args.url, context);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        isError: false,
      };
    }

    throw new McpError(
      ErrorCode.InvalidParams,
      "Invalid URL format. Expected string or array of strings.",
    );
  },
);

return server.server; // Must return the MCP server object
}

const shouldAutostart =
  typeof process !== "undefined" && process.env.WEB_SCOUT_DISABLE_AUTOSTART !== "1";

if (shouldAutostart) {
  const runtimeServer = createServer({ config: {} });
  const transport = new StdioServerTransport();
  runtimeServer.connect(transport).catch(() => {
    process.exit(1);
  });
}
