# Validation — 0.1.1

Date: **2026-09-06**. Obsidian desktop **1.13.7**, installer **1.12.7**, Windows; Quiet Tree **0.2.2**. Node.js **24.19.0**.

## Current checks

- TypeScript strict check and official `eslint-plugin-obsidianmd` recommended rules: passed, zero errors or warnings. Narrow unbound-method exemptions document cooperative wrapper delegation; no Obsidian guideline rules are disabled.
- Core file-operation tests: **26 passed**. Explicit home creation immediately creates an empty file, reuses any existing home without overwriting, serializes repeated clicks, rejects conflicts and protects later edits during undo. Promotion, content preservation, rename, home-only deletion, rollback and concurrency regressions also pass.
- `scripts/sandbox-check.js`: **21 passed** inside the running Obsidian application. Tests cover actual menu grouping and separator DOM, unchanged native menu callbacks, direct Start-to-Markdown navigation, empty promoted/external homes, same-name recognition, folder arrows, rename and link resolution, isolated Delete home note, and legacy draft recovery.
- The native folder Delete menu and Delete key both reach Obsidian's original full-folder deletion prompt. The harness substitutes a cancel response and verifies that the folder, homepage and children remain; it does not alter the user's deletion preference.
- `scripts/sandbox-lifecycle.js`: **9 passed**, covering both Quiet Tree load orders, independent unload/reload, preserved sibling order and drag handles, canceled click suppression, language persistence, and exactly one visible language dropdown. Unrelated Quiet Tree order data compared equal before and after.
- Total: **56 passing core/native tests**.
- Production check: exactly `main.js`, `manifest.json`, `styles.css`, only `obsidian` imported at runtime, no source map or network/HTML-injection APIs. Manifest, package, lockfile and version mapping agree on 0.1.1.
- Dependencies are unchanged from 0.1.0's clean npm install and public-registry audit on this date (zero known vulnerabilities). No new dependency was introduced.

The separate writing area and native deletion overrides from 0.1.0 have been removed. Text editing, saving and input-method handling now belong to Obsidian's native Markdown editor. Existing 0.1.0 recovery drafts remain readable and are not silently discarded.

## Reproduce

With Node.js 24 LTS, run `npm ci` and `npm run check` from this standalone project. Install the three `dist` files in the authorized Sandbox and enable Branch Note and Quiet Tree. Keep Obsidian visible: its renderer suspends animation-frame callbacks while hidden, including Quiet Tree's handle decoration.

In PowerShell, substitute the absolute path to this project:

```powershell
obsidian 'vault=Obsidian Sandbox' eval "code=eval(require('fs').readFileSync('D:/path/to/branch-note/scripts/sandbox-check.js','utf8'))"
obsidian 'vault=Obsidian Sandbox' eval "code=eval(require('fs').readFileSync('D:/path/to/branch-note/scripts/sandbox-lifecycle.js','utf8'))"
```

Returned JSON must have `failed: 0`; the CLI can exit successfully while returning a failed assertion. The development harness uses Node.js, but the shipped plugin does not. For link checks the Sandbox must enable automatic link updates.

Scripts refuse to run outside a vault named Obsidian Sandbox. They create uniquely named fixtures, remove only those fixtures, preserve plugin enablement and restore the language. The lifecycle test briefly reloads both plugins; run only when no draft is actively being edited. Transcripts are saved in ignored `test-results/`, excluded from release archives.

GitHub release CI repeats static checks and core tests before publishing assets and attestations. Native Sandbox tests remain a separate local check. This project is distributed through GitHub/BRAT; no community-directory submission is part of this release. Physical Android/iOS and macOS, mobile IMEs, large synced vaults, arbitrary themes and replacement file trees remain unverified; see `COMPATIBILITY.md`.
