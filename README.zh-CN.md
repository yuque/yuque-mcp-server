# Yuque MCP Server

[![CI](https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/yuque/yuque-mcp-server/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/yuque-mcp)](https://www.npmjs.com/package/yuque-mcp)
[![npm downloads](https://img.shields.io/npm/dm/yuque-mcp)](https://www.npmjs.com/package/yuque-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

让 Claude、Cursor 等 AI 助手通过 [Model Context Protocol](https://modelcontextprotocol.io/) 直接读写你的[语雀](https://www.yuque.com/)知识库。

[English](./README.md)

接入之后，你可以直接对 AI 助手说：

> 「搜一下我语雀里所有关于灰度发布的文档，给我一页总结」
>
> 「把今天的会议记录整理成文档，存到『技术调研』知识库」
>
> 「给这篇设计文档加一张部署流程图」

## 快速开始

**第一步：获取 Token。**前往[语雀开发者设置](https://www.yuque.com/settings/tokens)创建个人访问令牌。如果使用绑定空间的团队 Token，记下空间地址（例如 `https://your-space.yuque.com`），稍后作为 `--host` 传入。

**第二步：一键安装。**一条命令完成客户端配置：

```bash
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor
```

支持的客户端：`claude-desktop`、`vscode`、`cursor`、`windsurf`、`cline`、`trae`、`qoder`、`opencode`。安装器会自动定位当前操作系统下的配置文件，把 `yuque` 条目合并进去，不影响已有的其他 server。想要问答式引导？运行 `npx yuque-mcp setup`。

Claude Code 用户直接注册：

```bash
claude mcp add yuque -- npx -y yuque-mcp --token=YOUR_TOKEN
```

其他支持 stdio 传输的 MCP 客户端也都可以接入——各客户端的配置文件路径见 [docs/clients.md](./docs/clients.md)，通用配置如下：

```json
{
  "mcpServers": {
    "yuque": {
      "command": "npx",
      "args": ["-y", "yuque-mcp"],
      "env": { "YUQUE_TOKEN": "YOUR_TOKEN" }
    }
  }
}
```

**第三步：重启客户端**，开始使用。

## 配置

| 配置项        | 环境变量 / CLI 参数       | 说明                                                                                                                                                                                       |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Token（必填） | `YUQUE_TOKEN` / `--token` | 个人或团队语雀 API Token。                                                                                                                                                                 |
| Host（可选）  | `YUQUE_HOST` / `--host`   | 语雀站点或空间地址，例如 `https://your-space.yuque.com`。绑定空间的团队 Token 和私有化部署必须设置。站点根地址会自动规范化为 `/api/v2`，不设置时默认 `https://www.yuque.com/api/v2`。 |

```bash
# 团队 Token / 私有化部署
npx yuque-mcp install --token=YOUR_TOKEN --client=cursor --host=https://your-space.yuque.com
```

<details>
<summary>从旧配置迁移？</summary>

`YUQUE_PERSONAL_TOKEN`、`YUQUE_BASE_URL` 和 `--base-url` 仍作为兼容 fallback 生效。优先级：`YUQUE_TOKEN` > `YUQUE_PERSONAL_TOKEN` > `--token`；`YUQUE_HOST` > `--host` > `YUQUE_BASE_URL` > `--base-url`。新配置请使用 `YUQUE_TOKEN` 和 `YUQUE_HOST`。

</details>

## 工具列表（19 个）

| 分类   | 工具                    | 说明                                                            |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| 用户   | `yuque_get_user`        | 获取当前 Token 对应的认证用户。                                 |
| 搜索   | `yuque_search`          | 搜索文档或知识库（`type`：`doc` / `repo`），支持分页。          |
| 知识库 | `yuque_list_books`      | 列出用户的知识库，默认当前用户。                                |
|        | `yuque_get_book`        | 按 ID 或 namespace 获取知识库。                                 |
|        | `yuque_create_book`     | 创建知识库。                                                    |
|        | `yuque_update_book`     | 更新知识库的名称、slug、描述或公开状态。                        |
| 文档   | `yuque_list_docs`       | 列出知识库下的文档，支持分页（单页上限 100）。                  |
|        | `yuque_get_doc`         | 读取文档完整内容——默认 markdown，也可读取 `lake` / `html`。     |
|        | `yuque_create_doc`      | 在知识库中创建文档。                                            |
|        | `yuque_update_doc`      | 更新文档正文或元数据。                                          |
| 目录   | `yuque_get_toc`         | 读取知识库目录。                                                |
|        | `yuque_update_toc`      | 执行单个目录操作（追加或移动节点）。                            |
| 小记   | `yuque_list_notes`      | 分页列出当前用户的小记，可按状态过滤。                          |
|        | `yuque_get_note`        | 读取小记完整内容。                                              |
|        | `yuque_create_note`     | 创建小记。                                                      |
|        | `yuque_update_note`     | 更新小记。                                                      |
| 画板   | `yuque_get_resource`    | 从文档中读取画板（思维导图 / 流程图 / 架构图）。                |
|        | `yuque_create_resource` | 在文档中创建画板。                                              |
|        | `yuque_update_resource` | 更新文档中的画板。                                              |

每次调用只走一条语雀 API 链路。特别地，`yuque_update_doc` 不能在同一次调用里同时更新 markdown 正文和 `title` / `slug` / `public` 元数据，需要分两次调用。完整契约（包括 YMD markdown API 与 legacy document API 的路由规则）见 [docs/capability-scope.md](./docs/capability-scope.md)。

**当前不支持：**评论读写、附件上传与文件管理、权限与成员管理、文档分段编辑，以及画板之外的结构化资源类型。

## 写操作提示

create / update 类工具会真实修改你知识库里的内容，server 的权限边界就是 Token 的权限边界。请妥善保管 Token；如果只操作某一个空间，建议使用绑定该空间的团队 Token（配合 `YUQUE_HOST`）。发现安全问题请查看 [SECURITY.md](./SECURITY.md)。

## 常见问题

| 错误                          | 解决方案                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `YUQUE_TOKEN ... is required` | 设置 `YUQUE_TOKEN=YOUR_TOKEN` 或传入 `--token=YOUR_TOKEN`。                          |
| `401 Unauthorized`            | Token 无效或已过期——到[语雀设置](https://www.yuque.com/settings/tokens)重新生成。    |
| `429 Rate Limited`            | 请求过于频繁，稍等后重试。                                                           |
| `410 Gone`                    | 资源已被永久删除或 API 端点已废弃——确认目标文档 / 知识库仍然存在。                   |
| 找不到工具                    | 更新到最新版本：`npx -y yuque-mcp@latest`。                                          |
| 找不到 `npx` 命令             | 安装 [Node.js](https://nodejs.org/)（v18 或更高版本）。                              |

## 开发

```bash
git clone https://github.com/yuque/yuque-mcp-server.git
cd yuque-mcp-server
npm install
npm test              # 运行测试
npm run build         # 编译 TypeScript
npm run dev           # 开发模式（热重载）
```

架构、技术栈和完整工具契约见 [docs/](./docs/README.md)。欢迎贡献——见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 链接

- [语雀 API 文档](https://www.yuque.com/yuque/developer/api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Yuque AI Ecosystem](https://yuque.github.io/yuque-ecosystem/)——基于本 server 构建的 Skills 与 Plugin

## 许可证

[MIT](./LICENSE)
