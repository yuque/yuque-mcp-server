# CLAUDE.md

This file provides guidance for Claude Code when working with this repository.

## Project Overview

This is the Yuque MCP Server - an MCP (Model Context Protocol) server that exposes the Yuque API as MCP tools. It aims to be the official-quality MCP server for Yuque (语雀), following Ant Design open-source standards.

## Architecture

Reference: Notion MCP Server (https://github.com/makenotion/notion-mcp-server)

```
src/
├── index.ts              — Main entry (HTTP server, streamable-http transport)
├── cli.ts                — CLI entry (stdio transport)
├── server.ts             — MCP Server core (tool registration)
├── tools/                — Tool implementations (by domain)
│   ├── user.ts           — User tools (get_user)
│   ├── book.ts           — Book/知识库 tools (list, get, create, update)
│   ├── doc.ts            — Document tools (list, get, create, update)
│   ├── toc.ts            — TOC tools (get, update)
│   ├── search.ts         — Search tool
│   └── note.ts           — Note/小记 tools (list, get, create, update)
├── services/
│   ├── yuque-client.ts   — Yuque API HTTP client (axios)
│   └── types.ts          — TypeScript type definitions for Yuque API
└── utils/
    ├── format.ts         — AI-friendly data formatting
    └── error.ts          — Error handling utilities
scripts/
├── yuque-openapi.json    — Yuque OpenAPI 3.1 Spec (reference)
└── start-server.ts       — Dev server entry
tests/
├── tools/                — Tool tests
├── services/             — Service tests
└── __fixtures__/         — Test fixtures
```

## Yuque API

- Base URL: https://www.yuque.com/api/v2
- Auth: X-Auth-Token header
- OpenAPI Spec: https://app.swaggerhub.com/apiproxy/registry/Jeff-Tian/yuque-open_api/2.0.1
- Test token env var: YUQUE_API_KEY

## Tools (16 total)

### User
1. yuque_get_user — GET /api/v2/user

### Search
2. yuque_search — GET /api/v2/search

### Books (知识库)
3. yuque_list_books — GET /api/v2/users/{login}/repos
4. yuque_get_book — GET /api/v2/repos/{id} or /api/v2/repos/{namespace}
5. yuque_create_book — POST /api/v2/users/{login}/repos
6. yuque_update_book — PUT /api/v2/repos/{id}

### Docs
7. yuque_list_docs — GET /api/v2/repos/{id}/docs
8. yuque_get_doc — GET /api/v2/repos/{id}/docs/{doc_id}
9. yuque_create_doc — POST /api/v2/repos/{id}/docs
10. yuque_update_doc — PUT /api/v2/repos/{id}/docs/{doc_id}

### TOC
11. yuque_get_toc — GET /api/v2/repos/{id}/toc
12. yuque_update_toc — PUT /api/v2/repos/{id}/toc

### Notes (小记)
13. yuque_list_notes — GET /api/v2/notes
14. yuque_get_note — GET /api/v2/notes/{id}
15. yuque_create_note — POST /api/v2/notes
16. yuque_update_note — PUT /api/v2/notes/{id}

## Tech Stack
- TypeScript (strict mode)
- @modelcontextprotocol/sdk (official MCP SDK)
- zod (parameter validation)
- axios (HTTP client)
- vitest (testing)
- ESLint + Prettier (code quality)

## Key Design Decisions
- Support both stdio and streamable-http transports
- Auth via YUQUE_PERSONAL_TOKEN env var or --token CLI arg
- AI-friendly response formatting (trim unnecessary fields, reduce token usage)
- Support both book ID and namespace (user_login/book_slug) for all book/doc operations
- Chinese + English README
- Follow Ant Design open-source standards (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, Issue/PR templates, CI/CD)

## Common Commands
```bash
npm run build      # TypeScript compilation + CLI bundling
npm test           # Run vitest tests
npm run dev        # Start dev server with hot reload
npm run lint       # ESLint check
npm run format     # Prettier format
```
