# Core Architecture

`yuque-mcp` 的核心目标是把语雀 API 包装成 MCP tools，让 AI client 可以通过标准 tool call 访问语雀知识库。

## High-level Flow

```text
MCP client
  -> stdio or streamable HTTP transport
  -> MCP server
  -> Zod input schema validation
  -> domain tool handler
  -> YuqueClient
  -> Yuque HTTP API
```

这个 flow（数据流）的关键点是：MCP 边界负责稳定 tool contract（工具契约），`YuqueClient` 负责语雀 API 调用，格式化层负责把返回值整理成 AI-friendly JSON。

## Entry Points

- `src/cli.ts`: npm bin 入口，读取 `YUQUE_PERSONAL_TOKEN` / `--token` 和可选 `YUQUE_BASE_URL` / `--base-url`，默认以 stdio transport 启动 MCP server。直接在终端运行时会打印安装指引，避免用户误以为服务卡住。
- `src/index.ts`: HTTP 入口，读取同一组 token / base URL 配置，使用 `StreamableHTTPServerTransport` 并监听 `PORT`，默认 `3000`。
- `src/cli-install.ts`: CLI 子命令入口，负责 `install` 和 `setup`，把 `yuque-mcp` 写入不同 MCP client 的配置文件。

## MCP Server Layer

`src/server.ts` 是 MCP server 的核心：

- 创建 `Server`，server name 为 `yuque-mcp`。
- 合并 `userTools`、`bookTools`、`docTools`、`tocTools`、`searchTools`、`noteTools`、`resourceTools`。
- 注册 `tools/list` handler，返回每个 tool 的 name、description 和 JSON Schema。
- 注册 `tools/call` handler，先用 Zod schema parse 参数，再调用对应 tool handler。
- 统一把 tool handler 抛出的错误转换成 MCP error result。

## Tool Layer

`src/tools/` 按业务 domain（领域）拆分 tool：

- `user.ts`: 当前认证用户。
- `search.ts`: 搜索。
- `book.ts`: 知识库。
- `doc.ts`: 文档。
- `toc.ts`: 目录。
- `note.ts`: 小记。
- `resource.ts`: 结构化资源，目前只支持 board。

每个 tool 都遵循同一结构：`description`、`inputSchema`、`handler`。这种 shape 让 tool registry 可以统一生成 `tools/list` 返回值，也让 contract tests 更容易覆盖。

## Service Layer

`src/services/yuque-client.ts` 是语雀 API wrapper：

- 使用 `axios` 创建带 `X-Auth-Token` 的 HTTP client。
- 封装用户、搜索、知识库、文档、YMD/YFM 文档、目录、小记和 board resource API。
- 所有 API call 经过统一 error handling，减少 tool handler 对 HTTP 细节的耦合。

`src/services/types.ts` 放语雀 API 返回值和写入参数的 TypeScript 类型。

## Document Content Path

文档内容有两条路径：

- `markdown` 或未显式指定 format 时，读写走 YMD/YFM-compatible API：`/yfm/docs`。
- `lake` / `html` 时，走 legacy document API：`/repos/{repo}/docs/{doc}`。

这个设计把用户常用的 Markdown 体验放在 YMD/YFM flow 上，同时保留 Lake/HTML 的兼容路径。

## Design Boundaries

- MCP public surface 以 Zod schema 为入口，以 JSON Schema 暴露给 client。
- Tool handler 只负责参数到业务动作的 glue code（胶水逻辑），不直接散落 HTTP 请求。
- HTTP API 细节集中在 `YuqueClient`，避免每个 tool 重复拼 URL、处理认证和错误。
- 能力是否对外可用，以 `tests/mcp/tool-registry-contract.test.ts` 中的 contract tests 作为重要校验。
