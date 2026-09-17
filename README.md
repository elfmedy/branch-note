<p align="center">
  <img src="docs/assets/branch-note.svg" width="64" height="64" alt="Branch Note">
</p>
<h1 align="center">Branch Note</h1>
<p align="center"><strong>Give any note room to grow.</strong></p>
<p align="center">Turn notes into parent pages, with child notes in ordinary folders.</p>
<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a><br>
  <a href="#get-started">Get started</a> · <a href="#features">Features</a> · <a href="#install">Install</a> · <a href="https://github.com/elfmedy/branch-note/issues">Feedback</a>
</p>

## Get started

Start with a note called **Trip plan**. When you want a separate packing list, right-click it, choose **New child note**, and name the new note **Packing list**.

Your file explorer now looks like this:

```text
Trip plan
└─ Packing list
```

Click **Trip plan** to read and edit your original note. Click its arrow to show or hide **Packing list**. The original text stays in the parent; the child is a separate note. Give that child its own children whenever you need another level.

Already have a folder? Use the same menu to add a child. Click the folder to open its home, or choose **Start writing** if it does not have one yet.

## Features

- **Let any note grow.** Choose **New child note** to turn a note into a parent page. Its original text stays with it.
- **Give folders a home.** A matching Markdown file becomes the folder's home automatically. If it is missing, **Start writing** creates it in the native editor.
- **Keep the tree simple.** The home is shown as its folder, without a duplicate file entry. Only folders with other children need an expand arrow.
- **Write where you already write.** Use Obsidian's normal Markdown editor, links and themes. Settings contain just one language selector.
- **Keep ordinary files.** Notes remain Markdown files in folders. Folder and home renames stay together; no special note format or association data is needed.

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
