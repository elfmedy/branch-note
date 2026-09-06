Branch Note 0.1.1 — first public release / 首个公开版本

## Install with BRAT / 通过 BRAT 安装

Add `elfmedy/branch-note` in BRAT, select the latest version, then enable **Branch Note**. Requires Obsidian **1.13.7+**. Disable Folder Notes or other plugins that manage the same folder-home convention before enabling Branch Note.

在 BRAT 中添加 `elfmedy/branch-note`，选择最新版本并启用 **Branch Note**。要求 Obsidian **1.13.7+**。启用前请停用 Folder Notes 等接管同名目录首页的插件。

## Features / 功能

- **New child note / 新建子笔记** in a separate context-menu group. Ordinary notes become parent pages while their content is preserved.
- A matching `Folder/Folder.md` is automatically recognized as the folder's home, even when empty.
- **Start writing / 开始书写** creates an absent home immediately and opens the native Markdown editor.
- Folder and home renaming stay synchronized. **Delete home note / 删除首页** is separate from native deletion; native Delete can still remove whole folders.
- One setting: English or Chinese. Compatible load/unload behavior tested with Quiet Tree 0.2.2.

验证结果：26 项核心测试、21 项 Sandbox 交互测试、9 项 Quiet Tree/生命周期测试通过；TypeScript 与官方 lint 检查通过。Windows 桌面版已验证，手机及 macOS 尚未实机验证。此次仅通过 GitHub/BRAT 发布，不提交 Obsidian 插件市场。

For manual installation, download all three attached files into `.obsidian/plugins/branch-note/`. See the repository README and compatibility notes for details.
