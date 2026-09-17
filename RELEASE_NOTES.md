Branch Note 0.1.4

## 中文

- 修复新建子笔记后默认标题未选中的问题，现在可以直接输入名称，与 Obsidian 原生新建行为一致。
- 当 Obsidian 内部目录点击或定位接口不可用时，保留首页文件条目和原生展开操作，避免首页被隐藏后无法访问。

本次为修复更新，没有新增功能或设置。30 项单元测试、55 项桌面 Sandbox 检查及 15 项移动端模拟交互检查通过。移动端模拟不代表 iOS/Android 真机验证。

在 **设置 → 第三方插件 → 检查更新** 中更新。要求 Obsidian **1.13.7+**。

[中文介绍](https://github.com/elfmedy/branch-note/blob/0.1.4/README.zh-CN.md) · [验证记录](https://github.com/elfmedy/branch-note/blob/0.1.4/VALIDATION.md)

## English

- Select the default title after creating a child note, matching Obsidian's native new-note behavior so you can name it immediately.
- Keep the home note visible and native folder expansion accessible when internal folder-click or reveal hooks are unavailable.

This is a bug-fix release with no new features or settings. Validation passed: 30 unit tests, 55 desktop Sandbox checks and 15 mobile-emulation interaction checks. Mobile emulation does not certify physical iOS/Android devices.

Update through **Settings → Community plugins → Check for updates**. Requires **Obsidian 1.13.7+**.

[Overview](https://github.com/elfmedy/branch-note/blob/0.1.4/README.md) · [Validation](https://github.com/elfmedy/branch-note/blob/0.1.4/VALIDATION.md)

BRAT users can update `elfmedy/branch-note`. For manual installation, download `main.js`, `manifest.json` and `styles.css` into `.obsidian/plugins/branch-note/`.
