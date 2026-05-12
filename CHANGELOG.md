# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **TavilyWebSearch** tool: AI-powered web search via the Tavily API, registered conditionally when a valid `TAVILY_API_KEY` environment variable or Smithery config value is present.
- Documentation updated in `README.md` and `OVERVIEW.md` to describe all three tools, how to enable Tavily via `TAVILY_API_KEY`, and updated MCP client configuration examples.

## [1.5.5] - 2025-09-19

### Added
- Automatic stdio boot when the package entrypoint is executed directly, with an opt-out via `WEB_SCOUT_DISABLE_AUTOSTART` for embedded runtimes.

### Changed
- Registered DuckDuckGo search and URL extraction tools using the MCP helper APIs and Zod schemas so Smithery and other clients can index them reliably.
- Standardised tool context handling and dependency alignment by updating the project to use `zod@^3.23.8`, matching the MCP SDK expectations.

### Fixed
- Eliminated all stdout/stderr logging to keep the protocol stream silent across clients.
- Ensured local and client-spawned executions establish the MCP handshake consistently.

## [1.5.2] - 2025-09-14

### Security
- Fixed critical vulnerability in form-data dependency (CVE-2023-40582)
- Fixed high severity DoS vulnerability in axios dependency (CVE-2023-45857)
- Upgraded axios to v1.12.2 which maintains Linux compatibility while fixing security issues
- Upgraded form-data to v4.0.4+ 

### Changed
- Dependencies updated to secure versions via npm audit fix

## [1.5.1] - 2025-09-14

### Fixed
- Fixed Linux compatibility issue with Warp terminal by downgrading axios from v1.9.0 to v1.7.7
- Resolved "File is not defined" error when running on Linux systems with recent Warp updates
- Server now starts successfully on both Windows and Linux environments

### Changed
- Downgraded axios dependency to avoid undici Web API compatibility issues

## [1.5.0] - 2025-05-10

### Added
- Initial release of the Web Scout MCP Server
- DuckDuckGo search functionality
- Web content extraction with memory optimizations
- Support for extracting content from multiple URLs in parallel
- Rate limiting to prevent API blocks
- Memory management to prevent application crashes
- Error handling and context logging
