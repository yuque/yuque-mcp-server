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
- HTTP 入口（`src/index.ts`）监听 `PORT`，默认 `3000`。
- 所有环境变量直接从进程环境读取，项目不加载 `.env` 文件。

## Development Tooling

- `tsx`: 本地开发运行 TypeScript 入口，`npm run dev` 会 watch `src/cli.ts`。
- `typescript`: `npm run build` 负责编译到 `dist/`，并给 `dist/cli.js` 加执行权限。
- `vitest`: 单元测试、contract tests 和 real API smoke tests。`npm test` 单次运行全量测试，`npm run test:watch` 进入 watch 模式。
- `@vitest/coverage-v8`: 测试覆盖率。
- `eslint`: TypeScript lint。
- `prettier`: 代码格式化。
- `conventional-changelog-cli`: 生成 changelog。

## Test Layers

- Tool tests: 覆盖各 domain tool handler 的行为。
- Service tests: 覆盖 `YuqueClient` API wrapper。
- MCP contract tests: 固定 MCP tool surface、JSON Schema 和 OpenAPI 映射。
- Real API smoke tests: 通过环境变量显式开启（见下节），用真实语雀 API 验证读路径和可选写回读回路径。

## Test Environment Variables

Real API smoke tests（`tests/real-api/smoke.test.ts`）默认跳过，通过以下环境变量显式开启：

- `YUQUE_REAL_API=1`: 开启 real API smoke tests，未设置时整个 describe 跳过。
- `YUQUE_PERSONAL_TOKEN` 或 `YUQUE_MCP_TEST_TOKEN`: 真实 API 认证 token，必须提供其一（前者优先）。
- `YUQUE_BASE_URL`: 可选，指向私有部署实例的完整 API base URL。
- `YUQUE_REAL_REPO_ID`: 可选，指定被测知识库；未设置时自动发现当前用户的第一个知识库。
- `YUQUE_REAL_WRITE=1` 且 `YUQUE_REAL_WRITE_NOTE_ID=<note id>`: 可选，开启写路径测试；会更新指定小记并在测试结束时恢复原内容，请使用专门的 scratch 小记。

示例：

```bash
YUQUE_REAL_API=1 YUQUE_PERSONAL_TOKEN=<token> npx vitest run tests/real-api/smoke.test.ts
```

另外，packed install smoke（`npm run smoke:pack-install`）可用 `YUQUE_MCP_SMOKE_NPM_CACHE` 覆盖 npm cache 路径，CI workflow 已设置该变量。

## Continuous Integration

CI（`.github/workflows/ci.yml`）在 Node.js 18/20/22/24 矩阵上运行 `npm run lint`、`npm run format:check`、`npm run typecheck`、`npm test`、`npm run build` 和两个 dist smoke tests，另有独立 job 收集测试覆盖率。

## Release Shape

项目通过 npm package 发布，`package.json` 的 `files` 只包含 `dist`、README、LICENSE 和 CHANGELOG。`prepublishOnly` 会先执行 `npm run build`。
