# Workflow: 修复 bug

1. 先写复现测试：在对应测试文件（`tests/tools/`、`tests/services/`、`tests/utils/` 或 `tests/mcp/`）添加一个此刻会失败的用例，失败信息要能证明 bug 存在。没有复现测试的修复不接受。
2. 定位修复层级：
   - HTTP 请求 / API 路径问题 → `src/services/yuque-client.ts`
   - 参数 schema / tool 行为问题 → `src/tools/`
   - 输出格式问题 → `src/utils/format.ts`
   - 错误处理问题 → `src/utils/error.ts`
3. 最小修复：只改与 bug 直接相关的代码，不顺手重构、不顺手改格式。
4. 确认复现测试转绿，然后 `npm run check` 全绿。
5. 如果 bug 影响 public surface 的行为或文档描述，同步更新 [capability-scope.md](../capability-scope.md)。
6. Conventional commit（`fix: ...`），PR 描述关联 issue（`fixes #N`）。
