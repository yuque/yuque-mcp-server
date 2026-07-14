# Workflow: 新增一个 MCP tool

按顺序执行，不要跳步。全部完成后 `npm run check` 必须全绿。

## 0. 前置确认

- 明确 tool 名称、参数和返回值。命名遵循 `yuque_<动词>_<资源>`，参考 [capability-scope.md](../capability-scope.md) 中现有 tool 的命名。需求来自 issue 时，优先使用 Tool Request 模板里的结构化字段（tool 名、API endpoint、参数表、验收标准）作为规格。
- 确认该能力不在 capability-scope.md 的 "Out of Scope" 清单里；如果在，先和维护者确认是否调整边界，不要直接实现。
- 可用脚手架生成骨架并打印剩余步骤清单：`npm run new:tool -- <domain> <yuque_tool_name>`。新 domain 会生成 tool 文件和占位测试；已有 domain 会打印待粘贴的代码片段，不改动现有文件。

## 1. Service 层：封装语雀 API

- 在 `src/services/types.ts` 添加 API 返回值和写入参数的 TypeScript 类型。
- 在 `src/services/yuque-client.ts` 添加 API 方法。参照已有方法：统一走 axios instance 和错误处理，tool 层不允许直接发 HTTP 请求。
- 在 `tests/services/yuque-client.test.ts` 为新方法添加测试：mock axios，断言请求路径、HTTP method 和参数。

## 2. Tool 层：定义 MCP tool

- 在 `src/tools/` 对应 domain 文件里添加 tool 定义；新 domain 则新建文件并导出 `<domain>Tools` 对象。结构固定为：

  ```ts
  yuque_verb_resource: {
    description: '...', // 英文，说明用途和关键参数
    inputSchema: z.object({ ... }), // zod schema，即 MCP 参数契约
    handler: async (client: YuqueClient, args) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(formatXxx(result), null, 2) }],
    }),
  }
  ```

- 返回值必须经 `src/utils/format.ts` 的 formatter 精简（AI-friendly、最小 token），需要时新增 formatter 并在 `tests/utils/format.test.ts` 补测试。
- 如果新建了 domain 文件，在 `src/server.ts` 的 `allTools` 合并处加入 `...<domain>Tools`。

## 3. 测试：单测 + contract

- 在 `tests/tools/<domain>.test.ts` 添加 handler 测试，mock `YuqueClient`，参考 `tests/tools/user.test.ts` 的写法。
- 更新 `tests/mcp/tool-registry-contract.test.ts`：`expectedToolNames` 加入新 tool 名，`requiredFieldsByTool` 加入必填参数；参数含 enum 或 default 的，在 enum/default 测试里补断言。
- 更新 `tests/mcp/tool-call-contract.test.ts`，覆盖新 tool 的调用路径。

## 4. 文档同步

- 更新 [capability-scope.md](../capability-scope.md)：Tool Summary 表格、对应章节的说明、所有 "N 个 MCP tools" 的数量声明。`tests/mcp/capability-scope-docs.test.ts` 会机器校验清单和数量，漏更新会红。
- 涉及架构或配置变化时，按 [AGENTS.md](../../AGENTS.md) 的维护要求同步其它文档。

## 5. 验证与交付

- `npm run check` 全绿。
- 可选但推荐：在 `tests/real-api/smoke.test.ts` 为读路径补一条真实 API 用例，开启方式见 [technical-stack.md](../technical-stack.md)。
- 从 main 拉 `feat/*` 分支，conventional commit（`feat: add yuque_xxx tool`），按模板发 PR，CI 绿后才算交付完成。
