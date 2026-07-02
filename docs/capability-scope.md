# Capability Scope

本文记录当前 MCP public surface（对外能力面）。如果工具数量、参数、格式 enum 或资源类型发生变化，需要同步更新本文和 MCP contract tests。

## Tool Summary

当前对外暴露 19 个 MCP tools：

| Category  | Tools                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| User      | `yuque_get_user`                                                               |
| Search    | `yuque_search`                                                                 |
| Books     | `yuque_list_books`, `yuque_get_book`, `yuque_create_book`, `yuque_update_book` |
| Docs      | `yuque_list_docs`, `yuque_get_doc`, `yuque_create_doc`, `yuque_update_doc`     |
| TOC       | `yuque_get_toc`, `yuque_update_toc`                                            |
| Notes     | `yuque_list_notes`, `yuque_get_note`, `yuque_create_note`, `yuque_update_note` |
| Resources | `yuque_get_resource`, `yuque_create_resource`, `yuque_update_resource`         |

## User and Search

- `yuque_get_user`: 读取当前 token 对应的认证用户。
- `yuque_search`: 搜索语雀内容，`type` 当前限定为 `doc` 或 `repo`。

## Books

Books 对应语雀知识库：

- `yuque_list_books`: 按用户 login 列出知识库。
- `yuque_get_book`: 按 repo ID 或 namespace 读取知识库。
- `yuque_create_book`: 在指定用户下创建知识库。
- `yuque_update_book`: 更新知识库名称、slug、描述或公开状态。

## Docs

Docs 对应语雀文档：

- `yuque_list_docs`: 列出知识库下的文档。
- `yuque_get_doc`: 读取文档完整内容。
- `yuque_create_doc`: 创建文档，并尝试自动追加到 TOC。
- `yuque_update_doc`: 更新文档元数据或内容。

文档 format（格式）当前限定为：

- `markdown`: 默认路径，读写走 YMD/YFM-compatible API。
- `lake`: 走 legacy document API。
- `html`: 走 legacy document API。

`yuque_get_doc` 还支持 `include_lake`，用于在需要保留 Mermaid source、diagram 等 Lake 内容时返回 raw Lake body。

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

以下能力不属于当前 19 个 MCP tools 的稳定 public surface：

- 文档评论读写。
- 附件上传或文件管理。
- 权限、成员、协作设置管理。
- 文档分段读取或增量 section update。
- 除 board 以外的结构化资源类型。

如果需要加入这些能力，应先定义 MCP tool contract，再补齐 tool implementation、service API wrapper 和 contract tests。
