<p align="center">
  <img src="docs/assets/branch-note.svg" width="64" height="64" alt="Branch Note">
</p>
<h1 align="center">Branch Note</h1>
<p align="center"><strong>Give any note room to grow.</strong></p>
<p align="center">Turn notes into parent pages, with child notes in ordinary folders.</p>
<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a><br>
  <a href="#features">Features</a> · <a href="#get-started">Get started</a> · <a href="#install">Install</a> · <a href="https://github.com/elfmedy/branch-note/issues">Feedback</a>
</p>

![Open a folder's home note while keeping its child notes together in Obsidian's native file explorer.](docs/assets/home-preview.png)

*Click the folder name to open its home. Use the arrow to explore its children.*

## Features

- **Let any note grow.** Choose **New child note** to turn a note into a parent page. Its original text stays with it.
- **Give folders a home.** A matching Markdown file becomes the folder's home automatically. If it is missing, **Start writing** creates it in the native editor.
- **Keep the tree simple.** The home is shown as its folder, without a duplicate file entry. Only folders with other children need an expand arrow.
- **Write where you already write.** Use Obsidian's normal Markdown editor, links and themes. Settings contain just one language selector.
- **Keep ordinary files.** Notes remain Markdown files in folders. Folder and home renames stay together; no special note format or association data is needed.

## Get started

1. Right-click a Markdown note and choose **New child note**.
2. Write in the new child. Your original note becomes the parent's home.
3. Click the parent name to return to its home, or its arrow to browse the children.

Already have a folder? Add a child from the same menu, or click the folder and choose **Start writing** to create its home.

## Install

Open **Settings → Community plugins → Browse** in Obsidian, search for **Branch Note**, then install and enable it. Use **Check for updates** for future releases.

[Open the community listing](https://community.obsidian.md/plugins/branch-note) · Requires **Obsidian 1.13.7+**

<details>
<summary>BRAT and manual installation</summary>

- **BRAT:** add `elfmedy/branch-note`.
- **Manual:** download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/elfmedy/branch-note/releases/latest) into `.obsidian/plugins/branch-note/`, then enable it.

</details>

Use **Delete home note** to remove only the home; native **Delete** can remove the whole folder. Disable other folder-home plugins before enabling Branch Note.

For file layout, renaming, undo and recovery, see the [usage guide](docs/guide.md). See [compatibility](COMPATIBILITY.md) for tested platforms and plugin interactions.

---

[Report an issue](https://github.com/elfmedy/branch-note/issues) · [Release notes](https://github.com/elfmedy/branch-note/releases) · [Development](docs/guide.md#development) · [MIT license](LICENSE)
