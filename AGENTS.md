# AGENTS.md

本文件提供当前仓库的协作约定。更通用的个人偏好仍遵循上层或全局 `AGENTS.md`。

## 项目定位

这是 `yuque-mcp`，一个把语雀 API 暴露为 MCP tools 的 Node.js / TypeScript 项目。MCP client 通过 `tools/list` 发现能力，通过 `tools/call` 调用语雀相关操作。

## 项目文档入口

维护或理解项目边界时，优先阅读 `docs/` 下的文档：

- [docs/README.md](./docs/README.md): 文档索引和维护约定。
- [docs/technical-stack.md](./docs/technical-stack.md): 技术栈、配置、测试和发布链路。
- [docs/core-architecture.md](./docs/core-architecture.md): 入口、分层、数据流和核心设计边界。
- [docs/capability-scope.md](./docs/capability-scope.md): 当前 MCP public surface 和能力范围。

## 维护要求

- 改 MCP tool surface 时，同步更新 `docs/capability-scope.md` 和 `tests/mcp/tool-registry-contract.test.ts`。
- 改 CLI、transport、认证、host/base URL 解析或发布配置时，同步更新 `docs/technical-stack.md`。
- 改 server 分层、tool 注册、service API wrapper 或文档读写路径时，同步更新 `docs/core-architecture.md`。
- 当前代码和 contract tests 是 authoritative source（权威来源）；文档要跟随真实实现更新。

## 常用命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
