# Yuque MCP Server

[![CI](https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/yuque-mcp)](https://www.npmjs.com/package/yuque-mcp)
[![npm downloads](https://img.shields.io/npm/dm/yuque-mcp)](https://www.npmjs.com/package/yuque-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Let AI assistants read and write your [Yuque (语雀)](https://www.yuque.com/) knowledge base through the [Model Context Protocol](https://modelcontextprotocol.io/).

[中文文档](./README.zh-CN.md)

Once connected, ask your assistant things like:

> "Search my Yuque for everything about canary releases and give me a one-page summary."
>
> "Turn today's meeting notes into a doc in my _Tech Research_ book."
>
> "Add a flowchart of this deployment pipeline to the design doc."

## Quick Start

**1. Get a token.** Create one at [Yuque Developer Settings](https://www.yuque.com/settings/tokens). If you use a team token bound to a Yuque space, also note the space host (for example `https://your-space.yuque.com`) — you will pass it as `--host`.

**2. Install.** One command configures your client:

```bash
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor
```

Supported clients: `claude-desktop`, `vscode`, `cursor`, `windsurf`, `cline`, `trae`, `qoder`, `opencode`. The installer locates the right config file for your OS and merges a `yuque` entry into it without touching other servers. Prefer an interactive flow? Run `npx yuque-mcp setup`.

Using Claude Code? Register the server directly:

```bash
claude mcp add yuque -- npx -y yuque-mcp --token=YOUR_TOKEN
```

Any other MCP client that supports stdio transport works too — see [docs/clients.md](./docs/clients.md) for per-client config paths, or use the generic entry:

```json
{
  "mcpServers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": { "YUQUE_TOKEN": "YOUR_TOKEN" }
    }
  }
}
```

**3. Restart your client** and start asking.

## Configuration

| Setting          | Env var / CLI flag        | Description                                                                                                                                                                                                                              |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token (required) | `YUQUE_TOKEN` / `--token` | Personal or team Yuque API token.                                                                                                                                                                                                        |
| Host (optional)  | `YUQUE_HOST` / `--host`   | Yuque site or space host, e.g. `https://your-space.yuque.com`. Required for team tokens bound to a space and for private deployments. Site roots are normalized to `/api/v2`; defaults to `https://www.yuque.com/api/v2` when not set. |

```bash
# Team token / private deployment
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor --host=https://your-space.yuque.com
```

<details>
<summary>Migrating from an older config?</summary>

`YUQUE_PERSONAL_TOKEN`, `YUQUE_BASE_URL`, and `--base-url` still work as legacy fallbacks. Precedence: `YUQUE_TOKEN` > `YUQUE_PERSONAL_TOKEN` > `--token`, and `YUQUE_HOST` > `--host` > `YUQUE_BASE_URL` > `--base-url`. New configs should use `YUQUE_TOKEN` and `YUQUE_HOST`.

</details>

## Tools (19)

| Category  | Tool                    | What it does                                                                 |
| --------- | ----------------------- | ---------------------------------------------------------------------------- |
| User      | `yuque_get_user`        | Get the authenticated user for the current token.                            |
| Search    | `yuque_search`          | Search docs or repos (`type`: `doc` / `repo`), with optional paging.         |
| Books     | `yuque_list_books`      | List books (知识库) of a user; defaults to the current user.                 |
|           | `yuque_get_book`        | Get a book by ID or namespace.                                               |
|           | `yuque_create_book`     | Create a book.                                                               |
|           | `yuque_update_book`     | Update a book's name, slug, description, or visibility.                      |
| Docs      | `yuque_list_docs`       | List docs in a book, with paging (max 100 per page).                         |
|           | `yuque_get_doc`         | Get a doc with full content — markdown by default, `lake` / `html` on request. |
|           | `yuque_create_doc`      | Create a doc in a book.                                                      |
|           | `yuque_update_doc`      | Update a doc's body or metadata.                                             |
| TOC       | `yuque_get_toc`         | Get a book's table of contents.                                              |
|           | `yuque_update_toc`      | Apply a single TOC operation (append or move a node).                        |
| Notes     | `yuque_list_notes`      | List your notes (小记), with paging and status filter.                       |
|           | `yuque_get_note`        | Get a note with full content.                                                |
|           | `yuque_create_note`     | Create a note.                                                               |
|           | `yuque_update_note`     | Update a note.                                                               |
| Resources | `yuque_get_resource`    | Read a board (mindmap / flowchart / architecture diagram) from a doc.        |
|           | `yuque_create_resource` | Create a board in a doc.                                                     |
|           | `yuque_update_resource` | Update a board in a doc.                                                     |

Each call uses exactly one Yuque API route. In particular, `yuque_update_doc` cannot combine a markdown body with `title` / `slug` / `public` changes in a single call — update metadata separately. The full contract, including format routing between the YMD markdown API and the legacy document API, is documented in [docs/capability-scope.md](./docs/capability-scope.md).

**Not covered (yet):** comments, attachment upload and file management, permission and member management, section-level doc edits, and structured resources other than boards.

## Write access

The create/update tools modify real content in your knowledge base, and the server can do whatever your token can do. Keep the token secret, and prefer a space-scoped team token (with `YUQUE_HOST`) when you only work within one space. To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## Troubleshooting

| Error                         | Solution                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `YUQUE_TOKEN ... is required` | Set `YUQUE_TOKEN=YOUR_TOKEN` or pass `--token=YOUR_TOKEN`.                                                            |
| `401 Unauthorized`            | Token is invalid or expired — regenerate at [Yuque Settings](https://www.yuque.com/settings/tokens).                  |
| `429 Rate Limited`            | Too many requests — wait a moment and retry.                                                                          |
| `410 Gone`                    | The resource has been permanently deleted or the API endpoint is deprecated — verify the target doc/book still exists. |
| Tool not found                | Update to the latest version: `npx -y yuque-mcp@latest`.                                                              |
| `npx` command not found       | Install [Node.js](https://nodejs.org/) (v18 or later).                                                                |

## Development

```bash
git clone https://github.com/yuque/yuque-mcp-server.git
cd yuque-mcp-server
npm install
npm test              # run tests
npm run build         # compile TypeScript
npm run dev           # dev mode with hot reload
```

Architecture, tech stack, and the full tool contract live in [docs/](./docs/README.md). Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Links

- [Yuque API docs](https://www.yuque.com/yuque/developer/api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Yuque AI Ecosystem](https://yuque.github.io/yuque-ecosystem/) — skills and plugins built on top of this server

## License

[MIT](./LICENSE)
