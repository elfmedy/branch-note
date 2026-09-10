# Branch Note usage guide

[Back to overview](../README.md) · [简体中文](guide.zh-CN.md)

## Files and folders

A folder's home is an ordinary Markdown file with the same name: `Project/Project.md`. Files created outside Obsidian are recognized too; an empty home still opens in the native editor. Only a missing home shows **Start writing**. That button creates an empty home and opens it immediately.

**New child note** on `Project.md` first moves the original to `Project/Project.md`, then creates `Project/Untitled.md` (or `未命名.md` in Chinese). Original content is preserved. The child stays an ordinary file until you give it children. On an existing folder, the command creates only a child; it does not create the folder's home.

The home is hidden as a separate file-explorer entry. Clicking the folder name opens it without changing the folder's fold. Arrows expand or collapse visible children. Native reveal of a hidden home targets its folder; ordinary child-file reveal still expands the necessary ancestors.

## Rename and delete

- Renaming a folder or renaming its home through the editor title synchronizes both names. Links follow Obsidian's automatic-link-update preference and resolution rules.
- Moving the home to another folder keeps native file-move behavior. Conflicting destinations are preserved, and the operation stops with a notice.
- A raw folder rename while the plugin is active attempts to synchronize the old home. Changes made while the plugin is disabled cannot be reconstructed automatically.
- **Delete home note** appears only when a home exists. It removes that file and retains the folder and children, using your configured trash preference.
- Native **Delete**, keyboard deletion and bulk deletion retain their normal behavior, including deleting entire folders.

## Undo and recovery

The command palette provides **Undo last page action** for the last 20 file-operation actions in the current plugin session. Promotion and child creation form one action. Undo refuses to discard later edits, new children or occupied paths. Native editor undo remains separate.

Legacy unsaved drafts from 0.1.0 remain in the plugin's local `data.json`. Use **Recover unsaved page** to copy them, even if their original folder has moved or been deleted. Current versions write through Obsidian's native editor.

## Language and compatibility

The single language setting offers **Follow Obsidian**, **中文** and **English**. Following Obsidian is the default; upgrades preserve explicit choices.

Branch Note makes no network requests, adds no note metadata and uses no external account. Avoid running another plugin that manages the same folder-home convention. See [compatibility](../COMPATIBILITY.md) and [validation](../VALIDATION.md) for actual test coverage, including the limits of mobile emulation.

## Development

Use Node.js 24 LTS. Run `npm ci` and `npm run check` from the repository root. The checks cover TypeScript, Obsidian lint, file-operation and language tests, metadata and production assets. `npm run dev` watches TypeScript; restart after changing the manifest or CSS.

The release bundle contains only `main.js`, `manifest.json` and `styles.css` in `dist/`. Documentation assets belong to the repository, not the runtime plugin. See [publishing](../PUBLISHING.md) for release and marketplace steps.
