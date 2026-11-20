# Capability Scope

本文记录当前 MCP public surface（对外能力面）。如果工具数量、参数、格式 enum 或资源类型发生变化，需要同步更新本文和 MCP contract tests。

## Tool Summary

当前对外暴露 21 个 MCP tools：

| Category  | Tools                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| User      | `yuque_get_user`                                                               |
| Search    | `yuque_search`                                                                 |
| Books     | `yuque_list_books`, `yuque_get_book`, `yuque_create_book`, `yuque_update_book` |
| Docs      | `yuque_list_docs`, `yuque_get_doc`, `yuque_create_doc`, `yuque_update_doc`, `yuque_list_doc_versions`, `yuque_get_doc_version` |
| TOC       | `yuque_get_toc`, `yuque_update_toc`                                            |
| Notes     | `yuque_list_notes`, `yuque_get_note`, `yuque_create_note`, `yuque_update_note` |
| Resources | `yuque_get_resource`, `yuque_create_resource`, `yuque_update_resource`         |

## User and Search

- `yuque_get_user`: 读取当前 token 对应的认证用户。
- `yuque_search`: 搜索语雀内容，`type` 当前限定为 `doc` 或 `repo`，支持可选 `page` 分页。返回值为精简结构（`total` + `items`），并会剥离语雀搜索结果中的 `<em>` 高亮标签。

## Books

Books 对应语雀知识库：

- `yuque_list_books`: 列出知识库。`login` 可选，省略时自动取当前认证用户；支持可选 `offset` / `limit` 分页。
- `yuque_get_book`: 按 repo ID 或 namespace 读取知识库。
- `yuque_create_book`: 在指定用户下创建知识库。
- `yuque_update_book`: 更新知识库名称、slug、描述或公开状态。

## Docs

Docs 对应语雀文档：

- `yuque_list_docs`: 列出知识库下的文档，支持可选 `offset` / `limit` 分页（API 单页上限 100）。
- `yuque_get_doc`: 读取文档完整内容。
- `yuque_create_doc`: 创建文档；TOC 追加行为由当前工具 contract 控制，需要稳定目录位置时可用 TOC tools 读取或调整。
- `yuque_update_doc`: 更新文档元数据或内容。

文档 format（格式）当前限定为 `markdown` / `lake` / `html`，并按 format 路由，写入单次调用只走一条语雀 API 链路：

- `yuque_get_doc`: format 省略或 `markdown` 时先走 YMD markdown API，返回 YMD 视图（`id`、`title`、`url`、`format`、`body`、`updated_at`）；YMD 报错或返回空 body 时回退一次 legacy document API，用于识别非普通文档（见下）。format 为 `lake` / `html` 或 `include_lake: true` 时只走 legacy document API，返回完整文档字段。
- `yuque_update_doc`: markdown body 只走 YMD markdown API，且不能与 `title` / `slug` / `public` 混在同一次调用（会显式报错，提示分两次调用）；纯元数据更新或 `lake` / `html` body 只走 legacy document API。
- YMD API 只接受数字 doc ID；传 slug 时会先做一次 ID 解析调用，传数字 ID 可省掉这次调用。

`yuque_get_doc` 还支持 `include_lake`，用于在需要保留 Mermaid source、diagram 等 Lake 内容时返回 raw Lake body（强制走 legacy 路径）。

非普通文档（`type` 为 `Sheet` / `Table` / `Board` / `Thread`，或 `format` 为 `lakesheet` / `laketable`）正文不在 markdown body 里，单独处理：

- 表格（Sheet）的 `body_sheet` 转成 Markdown 表格返回，每个 tab 一节、重名 tab 自动加序号；转换失败时原样返回 `body_sheet` 并附 `format_note`。
- 数据表（Table）的 `body_table` 原样返回，与 `body`（schema）并列，普通文档不出现该字段。
- 回退只对非普通文档生效：普通文档 YMD 为空时仍返回 YMD 视图，YMD 报错且回退文档也是普通文档时抛出原始 YMD 错误。
- `yuque_create_doc` 不接受 `lakesheet` / `laketable`，会显式报错，不支持通过 API 创建表格/数据表。
- `yuque_update_doc` 对这类文档只支持元数据更新；slug 解析路径能拿到文档类型时会显式拒绝 body 写入，数字 ID 路径由语雀 API 拒绝。
- `type` 字段在文档摘要与详情中出现（语雀 API 返回时）。

## Doc Versions

文档版本（历史发布版本）只读查询，对应 `/api/v2/doc_versions`：

- `yuque_list_doc_versions`: 按 `doc_id` 列出已发布版本，最多 100 条、按时间倒序，返回 version id、doc_id、title、slug、created_at 和发版人。
- `yuque_get_doc_version`: 按 `version_id` 读取单个版本，返回 markdown 正文（优先 `body_md`，缺失时回退 `body`）和 `diff`。

- `doc_id` / `version_id` 都是数字；传 slug 时要先用 `yuque_get_doc` 解析出数字 doc ID。
- 版本只读：没有创建、回滚或删除版本的 tool。

## TOC

TOC 对应知识库目录：

- `yuque_get_toc`: 读取知识库目录。
- `yuque_update_toc`: 写入目录操作数据。

## Notes

Notes 对应语雀小记：

- `yuque_list_notes`: 分页列出当前用户小记，可按 status 过滤。
- `yuque_get_note`: 按 note ID 读取小记。
- `yuque_create_note`: 创建小记。
- `yuque_update_note`: 更新小记内容。

## Resources

Resources 当前只支持 `board`：

- `yuque_get_resource`: 从文档中读取 board resource。
- `yuque_create_resource`: 在文档中创建 board resource。
- `yuque_update_resource`: 更新文档中的 board resource。

Board type 当前限定为：

- `mindmap`
- `flowchart`
- `architecturediagram`

Resource locator（资源定位）要求：

- `doc_id` 和 `url` 必须二选一。
- `resource_id` 必须传 raw board resource id，不传 `board://<resource_id>` 完整 locator。
- 更新时 `text` 和 `dsl` 必须二选一。

## Out of Scope for Current Tool Surface

以下能力不属于当前 21 个 MCP tools 的稳定 public surface：

- 文档评论读写。
- 附件上传或文件管理。
- 权限、成员、协作设置管理。
- 文档分段读取或增量 section update。
- 除 board 以外的结构化资源类型。
- 版本回滚 / 版本删除（只支持只读查询版本列表和详情）。

如果需要加入这些能力，应先定义 MCP tool contract，再补齐 tool implementation、service API wrapper 和 contract tests。
