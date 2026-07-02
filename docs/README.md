# Project Documentation

这个目录放项目级维护文档，重点描述当前代码的真实边界，而不是安装说明。安装和用户接入请优先看根目录 `README.md` / `README.zh-CN.md`。

## 阅读顺序

1. [Technical Stack](./technical-stack.md) - 项目使用的 runtime、依赖、测试和发布工具链。
2. [Core Architecture](./core-architecture.md) - MCP server 的入口、分层和核心数据流。
3. [Capability Scope](./capability-scope.md) - 当前对外暴露的 MCP tools 和能力边界。

## 维护约定

- 改动 runtime、认证、host/base URL、CLI 入口或发布链路时，同步更新 [Technical Stack](./technical-stack.md)。
- 改动入口、transport（传输层）、tool 注册、client 封装或数据流时，同步更新 [Core Architecture](./core-architecture.md)。
- 新增、删除或修改 MCP tool、参数 schema、格式 enum 或资源类型时，同步更新 [Capability Scope](./capability-scope.md)，并确认 `tests/mcp/tool-registry-contract.test.ts` 覆盖对应 contract（契约）。
