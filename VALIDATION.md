# Validation

## 0.1.3 — presentation and documentation

Date: **2026-09-10**. Node.js **24.19.0**.

- TypeScript, Obsidian ESLint, all **30 tests**, release metadata, production build and bundle checks passed.
- Verified **31** local documentation links, anchors and assets across both overview pages and both guides.
- Captured and visually checked the overview screenshot in Obsidian Sandbox 1.13.7 using an isolated demonstration folder. Removed the fixture and restored the language, explorer and window state afterward.
- Production `main.js` and `styles.css` are byte-for-byte identical to the published 0.1.2 assets. The manifest version is 0.1.3; runtime behavior and settings are unchanged.
- The source archive includes both overview pages, both guides and their image assets. The install archive still contains exactly the three plugin assets.
- Native interaction coverage below is the previous 0.1.2 validation, not a new iOS-device test for this documentation release.

## 0.1.2 — interaction and language

Date: **2026-09-07**. Obsidian **1.13.7**, installer **1.12.7**, Windows; Quiet Tree **0.2.2**. Node.js **24.19.0**.

## Checks

- TypeScript strict check and official Obsidian ESLint rules: passed, no warnings.
- File-operation tests: **26 passed**; language tests: **4 passed**. The auto setting resolves the current host language each time; missing settings default to auto and existing explicit choices survive upgrade.
- `scripts/sandbox-check.js`: **21 passed**. Native Markdown writing, empty homes, creation, deletion, undo, menu grouping, link updates, rename and recovery regressions.
- `scripts/sandbox-lifecycle.js`: **10 passed**. Quiet Tree load orders and cleanup, preserved order and handles, canceled clicks, exactly one language selector with auto/zh/en, and language persistence across reload.
- `scripts/sandbox-interaction.js`: **15 passed in desktop mode and 15 passed in Obsidian mobile emulation**. Synthetic touch-origin name/arrow clicks cover no home, empty home, written home and visible children. Reveal checks cover previously rendered homes, ancestor expansion, explicit reveal, deferred reveal after reopening the sidebar, ordinary children and unload restoration.
- Production check: only `obsidian` imported at runtime; exactly three assets; no network, Node/Electron or HTML injection in the bundle. Manifest, package, lockfile and version mapping agree on 0.1.2. Dependencies are unchanged.

## Cause and scope

The native explorer retains a parent pointer for home items rendered before Branch Note hides them. With auto-reveal enabled, opening that home walks the stale parent chain and expands its folder. The issue was reproduced with a home rendered while Branch Note was unloaded, then hidden after reloading. Newly created, never-rendered home items alone did not reproduce it.

The fix maps hidden homes to their folder during native reveal, preserving the folder's collapsed state while revealing ancestors. It restores the active native item even if reveal throws. Existing name-click handling is unchanged. The reporter uses iPhone, Obsidian 1.13.7 (365); physical device confirmation remains pending. Desktop mobile emulation is not iOS WebKit testing.

## Reproduce

Run `npm ci` and `npm run check` with Node.js 24. Install the three `dist` files in the authorized Sandbox. Keep Obsidian visible so renderer animation frames run. Invoke each harness through the developer CLI, substituting the local checkout path:

```powershell
obsidian 'vault=Obsidian Sandbox' eval "code=eval(require('fs').readFileSync('D:/path/to/branch-note/scripts/sandbox-check.js','utf8'))"
obsidian 'vault=Obsidian Sandbox' eval "code=eval(require('fs').readFileSync('D:/path/to/branch-note/scripts/sandbox-lifecycle.js','utf8'))"
obsidian 'vault=Obsidian Sandbox' eval "code=eval(require('fs').readFileSync('D:/path/to/branch-note/scripts/sandbox-interaction.js','utf8'))"
obsidian 'vault=Obsidian Sandbox' dev:mobile on
# Run sandbox-interaction.js again after the app reloads.
obsidian 'vault=Obsidian Sandbox' dev:mobile off
```

Read the returned JSON: CLI exit code alone does not establish passing tests. The interaction harness waits for mobile drawer animations before subsequent activation. Each harness refuses other vault names and removes only its uniquely named fixture; language and auto-reveal settings are restored. Lifecycle tests reload plugins and should run only outside active editing. Test scripts use developer-only Node access; the production plugin does not.

GitHub CI repeats static/build/unit checks and publishes the three assets with attestations. See `COMPATIBILITY.md` for platform and API limits.

## Obsidian community directory

On **2026-09-07**, version **0.1.2** (commit `a9d7d10e53e6d1f738fc740ff4a20a6d71401d46`) was submitted and published through the community account portal. The review reached **Completed**, with no displayed errors or warnings. Release attestations, network behavior and dependency checks passed; the directory reproduced the release `main.js` byte-for-byte. Categories: Folders (primary), Files. This changes distribution status, not the tested production bundle. The initial GitHub release notes describe the earlier BRAT-only launch.

[Public listing](https://community.obsidian.md/plugins/branch-note) · [Review details](https://community.obsidian.md/account/plugins/branch-note)
