# Compatibility

## Verified

Obsidian desktop **1.13.7** (installer 1.12.7), Windows; Quiet Tree **0.2.2** in the authorized Sandbox. Both load orders, individual unload/reload, hidden home visibility, saved sibling order, drag handle retention and suppression of canceled clicks were tested. Native Markdown editing and incoming wiki-link resolution were checked with automatic link updates enabled. All writing uses the native Markdown editor; no custom input area is installed.

## API boundary

The production bundle imports only `obsidian`. No Node.js, Electron, network requests, `innerHTML` or remote assets. `Vault` and `FileManager` manage files and honor the user's trash preference, including temporary empty directories during rollback. Explicit home creation reuses an existing same-name file without overwriting it.

There is no public file-explorer API for this interaction. Guarded adapters use internal `getSortedFolderItems` and item `onSelfClick` to filter homes and handle folder clicks. Menu commands use public `MenuItem.setSection` with the `branch-note` section. No native deletion method or menu item is replaced. Wrappers retain receivers, delegate to existing providers and restore only methods they still own. Disabled wrappers safely delegate when another plugin wraps later. Owned classes, observers and frame callbacks are removed on unload.

Folder renaming and same-directory home-file title renaming wrap `FileManager.renameFile`, tracking their own operations to avoid recursion. Renaming a home through the native editor synchronizes the parent directory; moving the home out to another directory retains native move behavior. Raw folder rename events follow external changes while the plugin is active. The minimum version is deliberately the tested 1.13.7; future versions still need verification.

## Limits

- No physical Android/iOS or macOS tests. `isDesktopOnly: false` means no desktop-only runtime imports, not a device certification. Touch and platform keyboard behavior need validation before advertising mobile support.
- No broad guarantee for icon, replacement tree, sync or other folder-home plugins. No row icons or trailing buttons are added. Do not enable another same-name folder-home plugin simultaneously.
- Native deletion (including single folders, keyboard Delete and bulk deletion), root-vault operations and attachments remain native. Only the explicit Branch Note Delete home note command deletes the matching Markdown while retaining children.
- External rename conflicts preserve existing files and report the conflict. Renames made while disabled cannot be reconstructed because no association metadata is stored.
- Link rewriting follows Obsidian's preference and resolution rules. Branch Note does not rewrite arbitrary text itself.
- Legacy 0.1.0 recovery drafts may contain note text and are retained only in plugin `data.json`. They remain copyable even if the original folder is gone. Archives exclude all saved data.
- File-operation undo covers the current session's last 20 actions, refusing to discard new edits or overwrite occupied paths. Native editor undo is separate.
