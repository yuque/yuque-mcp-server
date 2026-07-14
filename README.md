# Yuque MCP Server

[![CI](https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/yuque-mcp)](https://www.npmjs.com/package/yuque-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for [Yuque (语雀)](https://www.yuque.com/) — expose your knowledge base to AI assistants through the [Model Context Protocol](https://modelcontextprotocol.io/).

🌐 **[Website](https://yuque.github.io/yuque-ecosystem/)** · 📖 [API Docs](https://www.yuque.com/yuque/developer/api) · [中文文档](./README.zh-CN.md)

---

## Quick Start

### 1. Get Your Yuque API Token

Visit [Yuque Developer Settings](https://www.yuque.com/settings/tokens) to create a personal access token.
If you use a team token from a Yuque space, also prepare that space host, for example `https://your-space.yuque.com`.

### 2. Quick Install (Recommended)

Use the built-in CLI to auto-configure your MCP client in one command:

```bash
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor
```

Supported clients: `claude-desktop`, `vscode`, `cursor`, `windsurf`, `cline`, `trae`, `qoder`, `opencode`

Or use the interactive setup wizard:

```bash
npx yuque-mcp setup
```

The CLI will automatically find the correct config file for your OS, merge with any existing configuration (without overwriting other servers), and print a success message.

### 3. Manual Configuration

<details>
<summary>Prefer to configure manually? Click to expand all client configs.</summary>

Choose your preferred client below:

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add yuque-mcp -- npx -y yuque-mcp --token=YOUR_TOKEN
```

Or using environment variables:

```bash
export YUQUE_TOKEN=YOUR_TOKEN
claude mcp add yuque-mcp -- npx -y yuque-mcp
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to your `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": {
        "YUQUE_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code (GitHub Copilot)</b></summary>

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": {
        "YUQUE_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

Then enable Agent mode in GitHub Copilot Chat.

</details>

<details>
<summary><b>Cursor</b></summary>

Add to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": {
        "YUQUE_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to your Windsurf MCP configuration (`~/.windsurf/mcp.json`):

```json
{
  "mcpServers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": {
        "YUQUE_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Cline (VS Code)</b></summary>

Add to your Cline MCP settings (`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": {
        "YUQUE_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Trae</b></summary>

In Trae, open **Settings** and navigate to the **MCP** section, then add a new stdio-type MCP Server with the following configuration:

- **Command:** `npx`
- **Args:** `-y yuque-mcp`
- **Env:** `YUQUE_TOKEN=YOUR_TOKEN`

See [Trae MCP documentation](https://docs.trae.ai/ide/model-context-protocol) for detailed instructions.

</details>

> **More clients:** Any MCP-compatible client that supports stdio transport can use yuque-mcp. The general pattern is: command = `npx`, args = `["-y", "yuque-mcp"]`, env = `YUQUE_TOKEN`.

</details>

### 4. Done!

Ask your AI assistant to search your Yuque docs, create documents, or manage books.

---

## Authentication

The server supports multiple ways to provide your Yuque API token:

| Method | Environment Variable / Flag | Description |
|--------|---------------------------|-------------|
| **Token** | `YUQUE_TOKEN` | Personal or team Yuque API token |
| **Host** | `YUQUE_HOST` / `--host=https://your-space.yuque.com` | Yuque site or space host; required for team tokens tied to a specific space |
| **CLI Argument** | `--token=YOUR_TOKEN` | Pass directly as a command-line argument |

**Token priority order:** `YUQUE_TOKEN` > `YUQUE_PERSONAL_TOKEN` > `--token`

**Host priority order:** `YUQUE_HOST` > `--host` > `YUQUE_BASE_URL` > `--base-url`

`YUQUE_PERSONAL_TOKEN`, `YUQUE_BASE_URL`, and `--base-url` are kept as legacy fallbacks for existing configs. New configs should use `YUQUE_TOKEN` and `YUQUE_HOST`.

### Team Tokens and Private Deployment

For team tokens, privately deployed Yuque instances, or custom Yuque spaces, set `YUQUE_HOST` or pass `--host`:

```bash
# Environment variable
export YUQUE_TOKEN=YOUR_TOKEN
export YUQUE_HOST=https://your-space.yuque.com

# CLI argument
npx yuque-mcp --token=YOUR_TOKEN --host=https://your-space.yuque.com

# Install with custom host
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor --host=https://your-space.yuque.com
```

The host may be a Yuque site root such as `https://www.yuque.com` or a full API base URL such as `https://www.yuque.com/api/v2`. Host roots are normalized to `/api/v2` at runtime. When not set, the default API base URL is `https://www.yuque.com/api/v2`.

---

## Available Tools (19)

| Category | Tools |
|----------|-------|
| **User** | `yuque_get_user` |
| **Search** | `yuque_search` |
| **Books** | `yuque_list_books`, `yuque_get_book`, `yuque_create_book`, `yuque_update_book` |
| **Docs** | `yuque_list_docs`, `yuque_get_doc`, `yuque_create_doc`, `yuque_update_doc` |
| **Resources** | `yuque_get_resource`, `yuque_create_resource`, `yuque_update_resource` |
| **TOC** | `yuque_get_toc`, `yuque_update_toc` |
| **Notes** | `yuque_list_notes`, `yuque_get_note`, `yuque_create_note`, `yuque_update_note` |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `YUQUE_TOKEN ... is required` | Set `YUQUE_TOKEN=YOUR_TOKEN` or pass `--token=YOUR_TOKEN` |
| `401 Unauthorized` | Token is invalid or expired — regenerate at [Yuque Settings](https://www.yuque.com/settings/tokens) |
| `429 Rate Limited` | Too many requests — wait a moment and retry |
| `410 Gone` | The resource has been permanently deleted or the API endpoint is deprecated — verify the target document/repo still exists |
| Tool not found | Update to the latest version: `npx -y yuque-mcp@latest` |
| `npx` command not found | Install [Node.js](https://nodejs.org/) (v18 or later) |

---

## Development

```bash
git clone https://github.com/yuque/yuque-mcp-server.git
cd yuque-mcp-server
npm install
npm test              # run tests
npm run build         # compile TypeScript
npm run dev           # dev mode with hot reload
```

---

## Links

- [Website](https://yuque.github.io/yuque-ecosystem/)
- [Yuque API Docs](https://www.yuque.com/yuque/developer/api)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [MCP Registry](https://github.com/modelcontextprotocol/servers)
- [Contributing](./CONTRIBUTING.md)

## License

[MIT](./LICENSE)
