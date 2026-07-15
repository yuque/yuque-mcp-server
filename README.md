<div align="center">

<a href="https://www.yuque.com/"><img src="https://avatars.githubusercontent.com/u/34602419?s=200&v=4" width="96" alt="Yuque logo"></a>

<h1>Yuque MCP Server</h1>

Let AI assistants read and write your [Yuque (语雀)](https://www.yuque.com/) knowledge base<br>through the [Model Context Protocol](https://modelcontextprotocol.io/).

[![CI][ci-image]][ci-url] [![npm version][npm-image]][npm-url] [![npm downloads][download-image]][download-url] [![License][license-image]][license-url]

[Quick Start](#quick-start) · [Tools](#tools-19) · [Troubleshooting](#troubleshooting) · [Docs](./docs/README.md) · [中文文档](./README.zh-CN.md)

</div>

Once connected, ask your assistant things like:

> "Search my Yuque for everything about canary releases and give me a one-page summary."
>
> "Turn today's meeting notes into a doc in my _Tech Research_ book."
>
> "Add a flowchart of this deployment pipeline to the design doc."

## Quick Start

**1. Get a token** — create one at [Yuque Developer Settings](https://www.yuque.com/settings/tokens). If you use a team token bound to a Yuque space, also note the space host (e.g. `https://your-space.yuque.com`) — you will pass it as `--host`.

**2. Install** — one command locates the right config file for your OS and merges a `yuque` entry into it, without touching other servers:

```bash
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor
```

Supported clients: `claude-desktop` · `vscode` · `cursor` · `windsurf` · `cline` · `trae` · `qoder` · `opencode`. Prefer an interactive flow? Run `npx yuque-mcp setup`.

<details>
<summary><b>Claude Code</b></summary>

Register the server directly:

```bash
claude mcp add yuque -- npx -y yuque-mcp --token=YOUR_TOKEN
```

</details>

<details>
<summary><b>Other MCP clients (generic config)</b></summary>

Any client that supports stdio transport works — see [docs/clients.md](./docs/clients.md) for per-client config paths.

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

</details>

**3. Restart your client** and start asking.

## Configuration

| Setting              | Env var / CLI flag        | Description                                                                                                     |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Token **(required)** | `YUQUE_TOKEN` / `--token` | Personal or team Yuque API token                                                                                |
| Host (optional)      | `YUQUE_HOST` / `--host`   | Site or space host, e.g. `https://your-space.yuque.com` — required for space-bound team tokens and private deployments |

Site roots are normalized to `/api/v2`; when unset, the host defaults to `https://www.yuque.com/api/v2`.

```bash
# Team token / private deployment
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor --host=https://your-space.yuque.com
```

<details>
<summary>Migrating from an older config?</summary>

`YUQUE_PERSONAL_TOKEN`, `YUQUE_BASE_URL`, and `--base-url` still work as legacy fallbacks. Precedence: `YUQUE_TOKEN` > `YUQUE_PERSONAL_TOKEN` > `--token`, and `YUQUE_HOST` > `--host` > `YUQUE_BASE_URL` > `--base-url`. New configs should use `YUQUE_TOKEN` and `YUQUE_HOST`.

</details>

## Tools (19)

Each tool maps to exactly one Yuque API route.

| Category    | Tool                    | Description                                              |
| ----------- | ----------------------- | -------------------------------------------------------- |
| **User**    | `yuque_get_user`        | Get the authenticated user for the current token         |
| **Search**  | `yuque_search`          | Search docs or repos, with paging                        |
| **Books**   | `yuque_list_books`      | List books (知识库) of a user                            |
|             | `yuque_get_book`        | Get a book by ID or namespace                            |
|             | `yuque_create_book`     | Create a book                                            |
|             | `yuque_update_book`     | Update name, slug, description, or visibility            |
| **Docs**    | `yuque_list_docs`       | List docs in a book, with paging                         |
|             | `yuque_get_doc`         | Get full content — markdown, `lake`, or `html`           |
|             | `yuque_create_doc`      | Create a doc in a book                                   |
|             | `yuque_update_doc`      | Update a doc's body or metadata                          |
| **TOC**     | `yuque_get_toc`         | Get a book's table of contents                           |
|             | `yuque_update_toc`      | Append or move a single TOC node                         |
| **Notes**   | `yuque_list_notes`      | List notes (小记), with paging and status filter         |
|             | `yuque_get_note`        | Get a note with full content                             |
|             | `yuque_create_note`     | Create a note                                            |
|             | `yuque_update_note`     | Update a note                                            |
| **Boards**  | `yuque_get_resource`    | Read a board (mindmap / flowchart / diagram) from a doc  |
|             | `yuque_create_resource` | Create a board in a doc                                  |
|             | `yuque_update_resource` | Update a board in a doc                                  |

In particular, `yuque_update_doc` cannot combine a markdown body with `title` / `slug` / `public` changes in a single call — update metadata separately. The full contract, including format routing between the YMD markdown API and the legacy document API, is documented in [docs/capability-scope.md](./docs/capability-scope.md).

**Not covered (yet):** comments, attachment upload and file management, permission and member management, section-level doc edits, and structured resources other than boards.

## Write access

The create/update tools modify real content in your knowledge base, and the server can do whatever your token can do. Keep the token secret, and prefer a space-scoped team token (with `YUQUE_HOST`) when you only work within one space. To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## Troubleshooting

| Error                         | Solution                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `YUQUE_TOKEN ... is required` | Set `YUQUE_TOKEN=YOUR_TOKEN` or pass `--token=YOUR_TOKEN`                     |
| `401 Unauthorized`            | Token invalid or expired — [regenerate it](https://www.yuque.com/settings/tokens) |
| `429 Rate Limited`            | Too many requests — wait a moment and retry                                   |
| `410 Gone`                    | Target permanently deleted or endpoint deprecated — check the doc/book exists |
| Tool not found                | Update to the latest version: `npx -y yuque-mcp@latest`                       |
| `npx` command not found       | Install [Node.js](https://nodejs.org/) v18 or later                           |

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

[ci-image]: https://img.shields.io/github/actions/workflow/status/yuque/yuque-mcp-server/ci.yml?style=flat-square&label=CI
[ci-url]: https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml
[npm-image]: https://img.shields.io/npm/v/yuque-mcp?style=flat-square
[npm-url]: https://www.npmjs.com/package/yuque-mcp
[download-image]: https://img.shields.io/npm/dm/yuque-mcp?style=flat-square
[download-url]: https://www.npmjs.com/package/yuque-mcp
[license-image]: https://img.shields.io/github/license/yuque/yuque-mcp-server?style=flat-square
[license-url]: ./LICENSE
