[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/pinkpixel-dev-web-scout-mcp-badge.png)](https://mseep.ai/app/pinkpixel-dev-web-scout-mcp)

<p align="center">
  <img src="assets/logo.png" alt="Web Scout MCP Logo" width="300"/>
</p>

<h1 align="center">Web Scout MCP Server</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/@pinkpixel/web-scout-mcp"><img src="https://img.shields.io/npm/v/@pinkpixel/web-scout-mcp.svg" alt="npm version"></a>
  <a href="https://github.com/pinkpixel-dev/web-scout-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org/en/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js Version"></a>
  <a href="https://smithery.ai/badge/@pinkpixel-dev/web-scout-mcp"><img alt="Smithery Badge" src="https://smithery.ai/badge/@pinkpixel-dev/web-scout-mcp"></a>
  <a href="https://mseep.ai/app/f19a6453-c635-4bc8-b26a-3e9e36428a98"><img src="https://mseep.ai/badge.svg" alt="Verified on MseeP"></a>
</p>

<p align="center">
  An MCP server for web search using DuckDuckGo and Tavily, plus content extraction, with support for multiple URLs and memory optimizations.
</p>

## ✨ Features

- 🔍 **DuckDuckGo Search**: Fast and privacy-focused web search capability (no API key required)
- 🌐 **Tavily Search**: AI-powered web search via the Tavily API (enabled when `TAVILY_API_KEY` is set)
- 📄 **Content Extraction**: Clean, readable text extraction from web pages
- 🚀 **Parallel Processing**: Support for extracting content from multiple URLs simultaneously
- 💾 **Memory Optimization**: Smart memory management to prevent application crashes
- ⏱️ **Rate Limiting**: Intelligent request throttling to avoid API blocks
- 🛡️ **Error Handling**: Robust error handling for reliable operation

## 📦 Installation

### Installing via Smithery

To install Web Scout for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@pinkpixel-dev/web-scout-mcp):

```bash
npx -y @smithery/cli install @pinkpixel-dev/web-scout-mcp --client claude
```

### Global Installation

```bash
npm install -g @pinkpixel/web-scout-mcp
```

### Local Installation

```bash
npm install @pinkpixel/web-scout-mcp
```

## 🚀 Usage

### Command Line

After installing globally, run:

```bash
web-scout-mcp
```

### With MCP Clients

Add this to your MCP client's `config.json` (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "web-scout": {
      "command": "npx",
      "args": [
        "-y",
        "@pinkpixel/web-scout-mcp@latest"
      ]
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TAVILY_API_KEY` | Optional | When set, enables the **TavilyWebSearch** tool. Obtain a key at [https://tavily.com](https://tavily.com). |
| `WEB_SCOUT_DISABLE_AUTOSTART` | Optional | Set to `1` when embedding the package and calling `createServer()` yourself. By default running the published entrypoint (for example `node dist/index.js` or `npx @pinkpixel/web-scout-mcp`) automatically bootstraps the stdio transport. |

To enable Tavily search, add the key to your MCP client configuration:

```json
{
  "mcpServers": {
    "web-scout": {
      "command": "npx",
      "args": [
        "-y",
        "@pinkpixel/web-scout-mcp@latest"
      ],
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  }
}
```

## 🧰 Tools

The server exposes two always-available tools and one optional tool:

### 🔍 DuckDuckGoWebSearch

Initiates a web search query using the DuckDuckGo search engine and returns a well-structured list of findings. No API key required.

**Input:**
- `query` (string): The search query string
- `maxResults` (number, optional): Maximum number of results to return (default: 10, max: 25)

**Example:**
```json
{
  "query": "latest advancements in AI",
  "maxResults": 5
}
```

**Output:**
A formatted list of search results with titles, URLs, and snippets.

### 🌐 TavilyWebSearch *(optional — requires `TAVILY_API_KEY`)*

Initiates a web search query using the Tavily search API and returns a well-structured list of findings. This tool is only registered when a valid `TAVILY_API_KEY` environment variable (or Smithery config value) is provided.

**Input:**
- `query` (string): The search query string
- `maxResults` (number, optional): Maximum number of results to return (default: 10, max: 20)

**Example:**
```json
{
  "query": "latest advancements in AI",
  "maxResults": 5
}
```

**Output:**
A formatted list of search results with titles, URLs, and summaries.

**Enabling Tavily Search:**
Set the `TAVILY_API_KEY` environment variable (see [Environment Variables](#environment-variables)) or provide it via your Smithery config. Obtain a key at [https://tavily.com](https://tavily.com).

### 📄 UrlContentExtractor

Fetches and extracts clean, readable content from web pages by removing unnecessary elements like scripts, styles, and navigation.

**Input:**
- `url`: Either a single URL string or an array of URL strings

**Example (single URL):**
```json
{
  "url": "https://example.com/article"
}
```

**Example (multiple URLs):**
```json
{
  "url": [
    "https://example.com/article1",
    "https://example.com/article2"
  ]
}
```

**Output:**
Extracted text content from the specified URL(s).

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/pinkpixel-dev/web-scout-mcp.git
cd web-scout-mcp

# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## 📚 Documentation

For more detailed information about the project, check out these resources:

- [OVERVIEW.md](OVERVIEW.md) - Technical overview and architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines for contributors
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

## 📋 Requirements

- Node.js >= 18.0.0
- npm or yarn

## 📄 License

This project is licensed under the [Apache 2.0 License](LICENSE).

<p align="center">
  <sub>Made with ❤️ by <a href="https://pinkpixel.dev">Pink Pixel</a></sub>
  <br>
  <sub>✨ Dream it, Pixel it ✨</sub>
</p>
