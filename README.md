# Branch Note

Turn any Markdown note into a parent page, with its children kept in an ordinary folder. Keep the same simple writing flow as your notes grow.

## 中文

Branch Note 让普通笔记自然长出子笔记，使用标准 Markdown 文件和目录，无须额外的关联数据。

- **新建子笔记**：文件列表右键的一级菜单，在独立分隔区中显示。在目录中创建一篇普通笔记；在普通 Markdown 笔记上使用，会先将 `A.md` 变为 `A/A.md`，保留原文，再创建 `A/未命名.md`。
- **目录首页**：目录内与目录同名的 Markdown 自动成为首页。点击目录名称打开首页；仅不存在时显示“开始书写”。点击按钮即创建同名空文件并打开原生 Markdown 编辑器；已存在的空文件也直接打开。
- **简洁文件树**：首页文件隐藏在目录条目中；存在其他子条目才显示展开箭头。不添加条目图标或右侧菜单按钮。
- **重命名**：通过 Obsidian 重命名目录或在编辑器标题处重命名首页时，同步修改目录及首页名称，使用文件管理接口更新链接；遇到路径冲突停止操作。
- **删除首页**：首页存在时，插件分隔区中提供此独立命令，仅删除首页并保留目录及子条目。原生“删除”和 Delete 键保持默认行为，可删除整个目录。文件使用 Obsidian 配置的回收站。
- **撤销上次页面操作**：命令面板支持撤销最近的新建、目录重命名和删除首页。新建子笔记及父级转换是一个动作；子笔记已经书写或结构发生变化时会停止撤销，保留新内容。撤销历史限本次插件运行的最近 20 次。
- **语言**：设置中只有“语言”一项，可选跟随 Obsidian、中文、English。默认持续跟随 Obsidian；升级保留原先明确选择的语言。

### 安装

要求 Obsidian **1.13.7 或更新版本**。

**Obsidian 社区目录**：[Branch Note](https://community.obsidian.md/plugins/branch-note)。已通过市场自动审核并发布，可在“设置 → 第三方插件 → 浏览”中搜索 **Branch Note** 安装；应用内目录同步可能晚于网页条目。

**通过 BRAT 安装**：在 BRAT 设置中添加仓库 `elfmedy/branch-note`（或粘贴 `https://github.com/elfmedy/branch-note`），选择最新版本并安装，再启用 **Branch Note**。BRAT 可管理后续更新。

也可以从 [GitHub Releases](https://github.com/elfmedy/branch-note/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`，放进库的 `.obsidian/plugins/branch-note/` 后启用。

### 行为边界

插件遵循 `目录/目录.md` 的命名约定；外部创建的同名文件同样被识别。原生删除、批量删除、附件与普通文件操作保留 Obsidian 行为。删除目录无需禁用插件。

系统文件管理器在插件运行时重命名目录，会尝试同步旧首页；冲突时保留两个文件并提示。插件关闭期间的目录改名无法追溯关联，需要自行同步首页名。

书写完全使用原生 Markdown 编辑器。若 0.1.0 版本遗留了本地草稿，仍可通过“恢复未保存的页面”复制恢复；升级不会清空旧草稿。插件不联网、不发送笔记、不添加 Markdown 元数据。

请勿同时启用其他接管同名目录首页的插件。已在 Windows Sandbox 与 Quiet Tree 联合验证；其他图标、排序插件和移动设备需按 [兼容性说明](COMPATIBILITY.md) 验证。

## English

Use **New child note** in its own separated group in the file explorer context menu. On a folder, it creates an ordinary empty Markdown child. On `A.md`, it first moves the original into `A/A.md`, preserving its content, then creates `A/Untitled.md`. The child stays an ordinary file until you give it children.

A folder's matching Markdown file is its home, including files created outside Obsidian. Clicking a folder opens its home, including an empty Markdown file. **Start writing** appears only when no matching file exists. Clicking that button creates the empty home immediately and opens the native Markdown editor. Merely opening a folder or adding a child does not create its home.

The home is hidden in the explorer. Only folders with other children have an expand arrow. Branch Note adds no row icons or trailing buttons. Folder renaming synchronizes an existing home and uses Obsidian's file manager for link updates. Path conflicts stop the operation without replacing files.

**Delete home note** appears in the plugin group only when a home exists. It preserves the directory and children, honoring your trash preference. Native **Delete**, the Delete key and bulk deletion retain Obsidian behavior and can delete entire folders.

The command palette provides **Undo last page action** for up to 20 creation, folder rename and home deletion actions in the current session. Promotion plus child creation is one action. Undo refuses to discard edited children or overwrite occupied paths. Markdown text editing retains native editor undo.

Settings contain one **Language** selector: Follow Obsidian, 中文, or English. Following Obsidian is the default; existing explicit choices survive upgrades. There is no network access, analytics or note metadata. Writing and saving now use the native Markdown editor. Legacy recovery drafts from version 0.1.0 remain in local plugin `data.json`; use **Recover unsaved page** to copy them.

Requires Obsidian **1.13.7+**. Published in the [Obsidian community directory](https://community.obsidian.md/plugins/branch-note) after passing automated review. Search for **Branch Note** in Settings → Community plugins → Browse to install it; the in-app directory may update after the website. In BRAT settings, add `elfmedy/branch-note` (or `https://github.com/elfmedy/branch-note`), select the latest version, install and enable Branch Note. BRAT can manage future updates. Alternatively, download the three files from [GitHub Releases](https://github.com/elfmedy/branch-note/releases/latest) into `.obsidian/plugins/branch-note/`. Do not enable another same-name folder-home plugin alongside it. See [compatibility](COMPATIBILITY.md) and [validation](VALIDATION.md) for actual test coverage and limitations.

## Development

This directory is the standalone plugin project. Use Node.js 24 LTS:

```sh
npm ci
npm run check
```

The production bundle is in `dist/`. `npm run dev` watches TypeScript; rerun it after changing CSS or the manifest. No prototype, vault content, saved settings or dependencies belong in a release. See [PUBLISHING.md](PUBLISHING.md).

MIT License.
