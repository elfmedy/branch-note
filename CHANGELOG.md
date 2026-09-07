# Changelog

## 0.1.2

- Add Follow Obsidian alongside Chinese and English in the single language setting. Preserve existing explicit language choices.
- Reveal a hidden home as its folder, preventing native auto-reveal from expanding that folder after opening its home. Cover previously rendered homes and deferred reveal when reopening the mobile sidebar.
- Keep native reveal of ordinary child files and explicit arrow expansion intact.

## 0.1.1

- Group plugin commands in a dedicated, separated context-menu section on files and folders.
- Start writing creates an empty home immediately and opens the native Markdown editor.
- Existing homes open directly even when empty; remove the custom writing area.
- Preserve native folder deletion and the Delete key. Offer Delete home note separately only when a home exists.
- Retain recovery access to legacy 0.1.0 drafts.

## 0.1.0

- Direct **New child note / 新建子笔记** action on Markdown notes and folders.
- Promote ordinary notes into same-name directory homes while preserving content.
- Open homes in the native editor; create absent homes on first substantive input.
- Hide homes in the explorer; show arrows only for visible children.
- Synchronize folder/home renames; retain children when deleting a home.
- Guarded file-operation undo and local draft recovery.
- One English/Chinese language setting.
- MIT license, automated release checks and an attested release workflow.
