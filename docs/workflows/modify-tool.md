# Workflow: 修改现有 MCP tool 的参数或行为

修改 public surface 是破坏性最高的变更类型，contract tests 会拦截意外破坏。按顺序执行：

1. 定位 tool 定义：`src/tools/` 按 domain 分文件，参数契约是 tool 的 `inputSchema`（zod schema）。
2. 修改实现：参数变化同步改 `src/services/yuque-client.ts` 和 `src/services/types.ts`；行为变化确认 `src/utils/format.ts` 的输出仍然正确。
3. 更新测试，红了按报错里的提示走：
   - `tests/tools/<domain>.test.ts` 的行为断言。
   - `tests/mcp/tool-registry-contract.test.ts`：required 字段、enum、default 有变化就更新对应表。
   - `tests/mcp/tool-call-contract.test.ts` 的调用样例。
4. 更新 [capability-scope.md](../capability-scope.md) 对应条目（`tests/mcp/capability-scope-docs.test.ts` 会校验 tool 清单，参数说明需人工核对）。
5. 判断是否 breaking change：
   - 不算：新增可选参数、放宽校验、扩展返回字段。
   - 算：改名、删参数、可选参数必填化、删改 enum 值、收窄返回内容。
   - Breaking change 必须在 PR 描述中显式声明，并等维护者确认后再合并。
6. `npm run check` 全绿后按 conventional commit（`feat:` 或 `fix:`）发 PR。
