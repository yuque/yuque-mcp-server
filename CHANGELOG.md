## [0.1.13](https://github.com/yuque/yuque-mcp-server/compare/v0.1.12...v0.1.13) (2026-04-03)


### Bug Fixes

* support Node.js v24 by fixing package.json import ([#52](https://github.com/yuque/yuque-mcp-server/issues/52)) ([#53](https://github.com/yuque/yuque-mcp-server/issues/53)) ([900e2ce](https://github.com/yuque/yuque-mcp-server/commit/900e2ce5733155d1a81dafb2ff24bd2ab62f50dc))
## [0.1.12](https://github.com/yuque/yuque-mcp-server/compare/v0.1.11...v0.1.12) (2026-03-30)


### Bug Fixes

* sync MCP server metadata version with package version ([#51](https://github.com/yuque/yuque-mcp-server/issues/51)) ([244409c](https://github.com/yuque/yuque-mcp-server/commit/244409c179222d30fc03ed1ebe7d19e0c74a6c82))
## [0.1.11](https://github.com/yuque/yuque-mcp-server/compare/v0.1.10...v0.1.11) (2026-03-30)


### Bug Fixes

* return note id and slug from yuque_create_note response ([#48](https://github.com/yuque/yuque-mcp-server/issues/48)) ([#49](https://github.com/yuque/yuque-mcp-server/issues/49)) ([94b5ca1](https://github.com/yuque/yuque-mcp-server/commit/94b5ca194db3a50acbf0b7c2efb5790d60e4fe02))
* unify book identifier parameter from id_or_namespace to repo_id ([#47](https://github.com/yuque/yuque-mcp-server/issues/47)) ([#50](https://github.com/yuque/yuque-mcp-server/issues/50)) ([b6bd2a5](https://github.com/yuque/yuque-mcp-server/commit/b6bd2a5168f4c373ecfb50d6663e65fe4c3a1128))
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🐞 Bug Fixes

- Fix Node.js v24 compatibility by replacing ESM JSON import with createRequire (#52) (#52)

## [0.1.10] - 2026-03-30

### ✨ Features

- Add `include_lake` option to `yuque_get_doc` for Mermaid source code preservation (#45)

## [0.1.9] - 2026-03-18

### 🐞 Bug Fixes

- Make search type parameter required with enum validation (#43)

## [0.1.8] - 2026-03-18

### ✨ Features

- Add yuque notes (小记) support (#22)

### 🐞 Bug Fixes

- Restore auto-append to TOC with graceful error handling (#31)
- Improve TOC error message to suggest manual web UI operation (#33)
- Add 30s request timeout to prevent hanging on slow API responses (#35)
- Add null safety to search results and improve error handling (#36)

### 🔨 Refactors

- Remove dangerous delete operations and improve notes support (#34)
- Slim to 16 personal-only tools and rename repo to book (#41)

### 📝 Documentation

- Update README with latest tools, remove legacy token, add 410 error (#37)
- Sync Chinese README and remove yuque_restore_note tool (#38)

### 🏡 Chore

- Add issue/PR templates and changelog setup (#42)

## [0.1.7] - 2026-03-04

### ✨ Features

- Add qoder and opencode client support for install command (#24)

## [0.1.6] - 2026-03-03

### ✨ Features

- Auto-append doc to TOC on create and improve TOC tool descriptions (#23)

## [0.1.5] - 2026-02-27

### ✨ Features

- Add install and setup CLI commands for quick MCP client configuration (#16)

### 🐞 Bug Fixes

- Show helpful guide when run directly in terminal (#17)

### 📝 Documentation

- Rewrite README with multi-client installation guides (#15)

## [0.1.4] - 2026-02-27

### ✨ Features

- Support YUQUE_PERSONAL_TOKEN as primary env var (#13)
- Add server.json and mcpName for MCP Registry (#14)

### 🐞 Bug Fixes

- Shorten server.json description to fit 100-char limit

### 🏡 Chore

- Update org links from chen201724 to yuque (#10)

## [0.1.3] - 2026-02-25

### 🐞 Bug Fixes

- Remove unused variable in repo test (#9)

### 🔨 Refactors

- Code polish and quality improvements (#8)

## [0.1.2] - 2026-02-17

### 📝 Documentation

- Simplify MCP setup by keeping Claude Code example only
- Add ecosystem website link to README

## [0.1.1] - 2026-02-15

### 🐞 Bug Fixes

- Convert Zod schemas to JSON Schema for MCP compatibility (#5)

### 📝 Documentation

- Streamline README with verified-only setup paths (#6)

## [0.1.0] - 2026-02-15

### ✨ Features

- Initial release of Yuque MCP Server
- 25 tools covering Yuque API (user, repo, doc, toc, search, group, stats, version)
- Stdio transport for local MCP clients (Claude Desktop, Cursor, Claude Code)
- TypeScript implementation with strict mode
- Zod-based parameter validation for all tools
- AI-optimized response formatting (minimal token usage)
- Authentication via `YUQUE_TOKEN` environment variable or `--token` CLI argument
- Comprehensive test suite with vitest
- ESLint + Prettier code quality tooling
- CI pipeline (Node 18/20/22)
- Docker support

### 🐞 Bug Fixes

- Pre-release polish — fix placeholders, entry point, README (#2)
- Test config and CI pipeline fixes (#1)

### 📝 Documentation

- Add Docker support and improve CONTRIBUTING guide

[0.1.10]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/yuque/yuque-mcp-server/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yuque/yuque-mcp-server/releases/tag/v0.1.0
