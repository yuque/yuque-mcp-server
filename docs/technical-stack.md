# Technical Stack

本文描述 `yuque-mcp` 当前使用的技术栈和工程工具链。项目本质是一个 Node.js CLI package，同时也是一个 MCP server。

## Runtime and Language

- Runtime: Node.js `>=18.0.0`。
- Language: TypeScript，`strict` 模式，编译目标为 `ES2022`。
- Module system: ESM（`package.json` 中 `type: "module"`）。
- Package entry: `dist/cli.js`，命令名为 `yuque-mcp`。

## Core Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK，用来创建 server、注册 `tools/list` 和 `tools/call` handler，并提供 stdio / streamable HTTP transport（传输层）。
- `axios`: 语雀 HTTP API client。
- `zod`: tool 入参 validation（参数校验）。
- `zod-to-json-schema`: 将 Zod schema 转成 MCP client 可理解的 JSON Schema。

## Configuration and Authentication

当前运行时配置在 CLI / HTTP 入口解析，然后传给 server 和 `YuqueClient`：

- Token 读取优先级：`YUQUE_PERSONAL_TOKEN` -> `--token`。
- Base URL 读取优先级：`YUQUE_BASE_URL` -> `--base-url`。
- `--base-url` 需要传完整 API base URL，例如 `https://yuque.example.com/api/v2`。
- 默认语雀 API base URL 由 `YuqueClient` 提供：`https://www.yuque.com/api/v2`。
- 请求认证 header 为 `X-Auth-Token`。

## Development Tooling

- `tsx`: 本地开发运行 TypeScript 入口，`npm run dev` 会 watch `src/cli.ts`。
- `typescript`: `npm run build` 负责编译到 `dist/`，并给 `dist/cli.js` 加执行权限。
- `vitest`: 单元测试、contract tests 和 real API smoke tests。
- `@vitest/coverage-v8`: 测试覆盖率。
- `eslint`: TypeScript lint。
- `prettier`: 代码格式化。
- `conventional-changelog-cli`: 生成 changelog。

## Test Layers

- Tool tests: 覆盖各 domain tool handler 的行为。
- Service tests: 覆盖 `YuqueClient` API wrapper。
- MCP contract tests: 固定 MCP tool surface、JSON Schema 和 OpenAPI 映射。
- Real API smoke tests: 通过环境变量显式开启，用真实语雀 API 验证读路径和可选写回读回路径。

## Release Shape

项目通过 npm package 发布，`package.json` 的 `files` 只包含 `dist`、README、LICENSE 和 CHANGELOG。`prepublishOnly` 会先执行 `npm run build`。
