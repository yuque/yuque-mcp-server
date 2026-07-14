# Client Configuration

Manual MCP configuration for every supported client. In most cases you do not need this page — the installer writes these files for you:

```bash
npx yuque-mcp install --token=YOUR_TOKEN --client=<client>
```

Every stdio MCP client uses the same server entry; only the config file location and top-level key differ:

```json
{
  "command": "npx",
  "args": ["-y", "yuque-mcp"],
  "env": { "YUQUE_TOKEN": "YOUR_TOKEN" }
}
```

For team tokens or private deployments, add `"YUQUE_HOST": "https://your-space.yuque.com"` to `env`.

## Claude Code

```bash
claude mcp add yuque -- npx -y yuque-mcp --token=YOUR_TOKEN
```

Or with environment variables:

```bash
export YUQUE_TOKEN=YOUR_TOKEN
claude mcp add yuque -- npx -y yuque-mcp
```

## Claude Desktop

Config file (`mcpServers` key):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

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

## VS Code (GitHub Copilot)

`.vscode/mcp.json` in your workspace — note the top-level key is `servers`, not `mcpServers`:

```json
{
  "servers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": { "YUQUE_TOKEN": "YOUR_TOKEN" }
    }
  }
}
```

Then enable Agent mode in GitHub Copilot Chat.

## Cursor

`~/.cursor/mcp.json` (`mcpServers` key), same entry as Claude Desktop.

## Windsurf

`~/.windsurf/mcp.json` (`mcpServers` key), same entry as Claude Desktop.

## Cline (VS Code extension)

Config file (`mcpServers` key), same entry as Claude Desktop:

- macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## Trae

In Trae, open **Settings → MCP** and add a stdio server with command `npx`, args `-y yuque-mcp`, env `YUQUE_TOKEN=YOUR_TOKEN`. See the [Trae MCP documentation](https://docs.trae.ai/ide/model-context-protocol) for details.

The installer writes to (`mcpServers` key):

- macOS: `~/Library/Application Support/Trae/User/globalStorage/trae-ai.trae-core/settings/cline_mcp_settings.json`
- Windows: `%APPDATA%\Trae\User\globalStorage\trae-ai.trae-core\settings\cline_mcp_settings.json`
- Linux: `~/.config/Trae/User/globalStorage/trae-ai.trae-core/settings/cline_mcp_settings.json`

## Qoder

`~/.qoder/mcp.json` (`mcpServers` key), same entry as Claude Desktop.

## OpenCode

`opencode.json` in your project root — OpenCode uses its own schema:

```json
{
  "mcp": {
    "yuque": {
      "type": "local",
      "command": ["npx", "-y", "yuque-mcp"],
      "environment": { "YUQUE_TOKEN": "YOUR_TOKEN" },
      "enabled": true
    }
  }
}
```

## Other clients

Any MCP client that supports stdio transport works: command `npx`, args `["-y", "yuque-mcp"]`, env `YUQUE_TOKEN` (plus `YUQUE_HOST` if needed).
