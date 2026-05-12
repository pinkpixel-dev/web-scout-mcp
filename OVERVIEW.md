# Web Scout MCP Server - Technical Overview 📡

_Last updated: September 19, 2025_

## 🎯 Project Overview

The Web Scout MCP Server is a robust Model Context Protocol (MCP) server implementation that provides comprehensive web search and content extraction capabilities. Built with TypeScript and Node.js, it enables AI assistants and other MCP clients to seamlessly access real-time information from the web through DuckDuckGo search and intelligent content extraction from web pages.

This server is designed as a production-ready solution for AI systems that need reliable access to current web information while maintaining optimal performance through advanced memory management and rate limiting.

## ✨ Key Features

- **🔍 DuckDuckGo Search**: Privacy-focused web search with intelligent result filtering
- **📄 Web Content Extraction**: Clean text extraction from web pages with HTML parsing
- **🚀 Parallel Processing**: Concurrent extraction from multiple URLs with smart batching
- **💾 Advanced Memory Management**: Sophisticated memory optimization to prevent crashes
- **⏱️ Intelligent Rate Limiting**: Adaptive request throttling to avoid API blocks
- **🛡️ Robust Error Handling**: Comprehensive error management with context logging
- **🐳 Docker Support**: Containerized deployment with multi-stage builds
- **📦 Easy Installation**: Available via npm, Smithery, and Docker

## 🏗️ Architecture

The project follows a modular architecture with clear separation of concerns:

```
📁 web-scout-mcp/
├── 📄 src/index.ts          # Main server implementation (single file architecture)
├── 📦 package.json         # Project configuration and dependencies
├── 🐳 Dockerfile           # Multi-stage Docker build configuration
├── ⚙️ smithery.yaml        # Smithery deployment configuration
├── 📚 README.md            # User documentation
├── 📋 OVERVIEW.md          # Technical documentation (this file)
├── 📝 CHANGELOG.md         # Version history
├── 🤝 CONTRIBUTING.md      # Contribution guidelines
├── 📄 LICENSE              # MIT License
└── 🖼️ assets/logo.png      # Project logo
```

### 🔧 Core Components

1. **MCP Server**: Handles MCP protocol communication using `@modelcontextprotocol/sdk`
2. **DuckDuckGoSearcher**: Implements privacy-focused web search functionality
3. **WebContentFetcher**: Advanced content extraction with memory optimizations
4. **RateLimiter**: Intelligent request throttling system

## 🔬 Technical Implementation Details

### 📡 MCP Server Implementation

The server leverages the `@modelcontextprotocol/sdk` (v1.11.1) and exposes exactly two MCP tools:

- **`DuckDuckGoWebSearch`**: Web search with configurable result limits
- **`UrlContentExtractor`**: Content extraction supporting both single and batch operations

The server uses `StdioServerTransport` for communication, ensuring compatibility with all MCP clients including Claude Desktop, Cursor, and other AI development environments.

```typescript
const server = new Server(
  {
    name: "web-scout",
    version: "1.5.6",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);
```

### 🔍 DuckDuckGoSearcher Class

Implements web search through DuckDuckGo's HTML interface with the following features:

- **Privacy-First**: Uses DuckDuckGo's HTML endpoint (no API keys required)
- **POST Requests**: Reduces rate limiting compared to GET requests
- **Result Filtering**: Automatically filters out advertisements and irrelevant results
- **URL Cleanup**: Handles DuckDuckGo's redirect URLs (`//duckduckgo.com/l/?uddg=`)
- **Structured Results**: Returns formatted results optimized for LLM consumption

**Key Implementation Features:**

- Rate limiting: 30 requests per minute
- Request timeout: 30 seconds
- Comprehensive error handling with context logging
- Results formatted with position, title, URL, and snippet

### 📄 WebContentFetcher Class

**Critical Memory Management Features:**

The WebContentFetcher implements sophisticated memory management to handle large web pages without crashing:

#### 🧠 Memory Optimization Strategy

1. **Size-Based Processing**: Content >5MB automatically uses temporary files
2. **Memory Monitoring**: Real-time system memory usage tracking
3. **Adaptive Processing**: Switches to file-based processing when memory usage >70%
4. **Batch Size Adjustment**: Dynamic concurrent URL processing (1-5 URLs based on memory pressure)
5. **Automatic Cleanup**: Temp file cleanup on process exit and SIGINT
6. **Garbage Collection**: Forces GC when available between batches

#### 🔄 Batch Processing Logic

```typescript
// Memory-aware batch size determination
let batchSize = 3; // Default
if (memoryStats.usagePercentage > 70) {
  batchSize = 1; // Reduce for memory constraints
} else if (memoryStats.usagePercentage < 30) {
  batchSize = 5; // Increase when plenty of memory
}
```

#### 🧹 Content Processing

- **HTML Cleanup**: Removes `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>` elements
- **Text Normalization**: Whitespace normalization and trimming
- **Content Truncation**: 8000 character limit per page with truncation indicator
- **Error Isolation**: Individual URL failures don't affect batch processing

### ⏱️ RateLimiter Class

Implements sliding window rate limiting:

- **Search Operations**: 30 requests per minute
- **Content Fetching**: 20 requests per minute
- **Sliding Window**: Automatically removes expired timestamps
- **Intelligent Waiting**: Calculates optimal wait times
- **Memory Efficient**: Automatic cleanup of old request records

## 🛠️ Development Environment

### 📋 Requirements

- **Node.js**: >=18.0.0
- **TypeScript**: ^5.8.3
- **ES Modules**: Full ES module support
- **Target**: ES2020 with NodeNext module resolution

### 🔗 Dependencies

**Production Dependencies:**

- `@modelcontextprotocol/sdk`: ^1.18.1 (MCP protocol implementation)
- `axios`: ^3.2.6 (HTTP client)
- `cheerio`: ^1.12.2 (HTML parsing)
- `uuid`: ^13.0.0 (Unique ID generation for temp files)
- `async`: ^3.2.6 (Async utilities)
- `zod`: ^3.23.8 (Schema validation)
- `jsdoctypeparser`: ^9.0.0 (Type parsing)

**Development Dependencies:**

- `@types/node`: ^24.5.2
- `typescript`: ^5.9.2

### 🚀 Build Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Start the server (requires build first)
npm start

# Production build (same as build)
npm run production

# Run directly from source during development
npx tsx src/index.ts

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## 📦 Installation Options

### 🌟 Via Smithery (Recommended)

```bash
npx -y @smithery/cli install @pinkpixel-dev/web-scout-mcp --client claude
```

### 🌐 Global Installation

```bash
npm install -g @pinkpixel/web-scout-mcp
web-scout-mcp
```

### 🐳 Docker Usage

```bash
# Build container
docker build -t web-scout-mcp .

# Run container (stdio mode)
docker run -i web-scout-mcp
```

### ⚙️ MCP Client Configuration

Add to your MCP client's configuration:

```json
{
  "mcpServers": {
    "web-scout": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/web-scout-mcp"]
    }
  }
}
```

## 🧰 MCP Tools Specification

### 🔍 DuckDuckGoWebSearch

**Purpose**: Performs privacy-focused web searches using DuckDuckGo

**Input Schema**:

```json
{
  "query": "string (required)",
  "maxResults": "number (optional, default: 10)"
}
```

**Output**: Formatted text with numbered results including titles, URLs, and snippets

**Example Usage**:

```json
{
  "query": "latest developments in AI safety",
  "maxResults": 5
}
```

### 📄 UrlContentExtractor

**Purpose**: Extracts clean, readable content from web pages

**Input Schema**:

```json
{
  "url": "string | string[] (required)"
}
```

**Features**:

- Single URL processing returns plain text
- Multiple URL processing returns JSON object with URL->content mapping
- Automatic content truncation at 8000 characters
- Memory-efficient batch processing

**Example Usage**:

```json
{
  "url": ["https://example.com/article1", "https://example.com/article2"]
}
```

## 🔐 Security & Performance

### 🛡️ Security Features

- No API keys required (uses DuckDuckGo HTML interface)
- Input validation and sanitization
- Rate limiting to prevent abuse
- Error handling that doesn't expose system information
- Temporary file cleanup to prevent information leakage

### ⚡ Performance Optimizations

- Memory-aware processing to prevent crashes
- Intelligent batching based on system resources
- Request pooling and timeout management
- Garbage collection optimization
- Efficient HTML parsing with cheerio

## 🚀 Deployment

### 🌐 Smithery Platform

The server is available on [Smithery](https://smithery.ai/server/@pinkpixel-dev/web-scout-mcp) for easy installation and management.

### 📦 NPM Registry

Published as `@pinkpixel/web-scout-mcp` on npm registry for global installation.

### 🐳 Docker Hub

Docker image available with multi-stage builds for optimized container size.

## 📄 Project Information

- **Version**: 1.5.0
- **License**: MIT
- **Author**: Pink Pixel (admin@pinkpixel.dev)
- **Repository**: https://github.com/pinkpixel-dev/web-scout-mcp
- **Homepage**: https://pinkpixel.dev
- **NPM Package**: @pinkpixel/web-scout-mcp

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## 📋 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and changes.

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://pinkpixel.dev">Pink Pixel</a></sub>
  <br>
  <sub>✨ Dream it, Pixel it ✨</sub>
</p>
