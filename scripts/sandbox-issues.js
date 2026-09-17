/* Issue-derived regressions. Run only in the disposable Obsidian Sandbox. */
(async () => {
  if (app.vault.getName() !== "Obsidian Sandbox") throw new Error("Sandbox only");
  const bn = app.plugins.plugins["branch-note"];
  if (!bn) throw new Error("Enable Branch Note first");
  const root = `__branch_note_issues_${Date.now()}`;
  const oldLeaf = app.workspace.activeLeaf;
  const leaf = app.workspace.getLeaf("tab");
  const explorer = app.workspace.getLeavesOfType("file-explorer")[0].view;
  const results = [];
  const wait = () => new Promise((resolve) => setTimeout(resolve, 200));
  const ok = (value, message) => { if (!value) throw new Error(message); };
  const test = async (name, run) => {
    try { await run(); results.push({ name, pass: true }); }
    catch (e) { results.push({ name, pass: false, error: String(e) }); }
  };
  await app.vault.createFolder(root);
  try {
    const folder = await app.vault.createFolder(`${root}/Hawai’i 中文`);
    const home = await app.vault.create(`${folder.path}/${folder.name}.md`, "preserve home");
    const base = await app.vault.create(`${folder.path}/${folder.name}.base`, "views: []");
    const canvas = await app.vault.create(`${folder.path}/${folder.name}.canvas`, '{"nodes":[],"edges":[]}');
    await wait();
    await test("Same-name base and canvas rename without changing folder or home", async () => {
      const before = folder.path;
      await app.fileManager.renameFile(base, `${folder.path}/Other.base`);
      await app.fileManager.renameFile(canvas, `${folder.path}/Other.canvas`);
      ok(folder.path === before && home.path === `${before}/${folder.name}.md`, "Unrelated rename changed home");
      ok(await app.vault.read(home) === "preserve home", "Home content changed");
    });
    await test("Unicode and apostrophe folder opens its native Markdown home", async () => {
      app.workspace.setActiveLeaf(leaf);
      await bn.openFolder(folder.path);
      ok(leaf.view.file === home, "Wrong home");
    });
    await test("External folder rename synchronizes home", async () => {
      await app.vault.rename(folder, `${root}/Renamed`);
      await bn.service.drain();
      ok(home.path === `${root}/Renamed/Renamed.md`, "Home did not follow external rename");
    });
    await test("Hidden home explicit reveal focuses folder in both fold states", async () => {
      await wait();
      const item = explorer.fileItems[folder.path];
      for (const collapsed of [true, false]) {
        await item.setCollapsed(collapsed);
        explorer.revealInFolder(home);
        ok(explorer.tree.focusedItem === item, "Wrong reveal target");
        ok(item.collapsed === collapsed, "Reveal changed folder fold");
      }
    });
    await test("Missing native click method leaves home accessible in explorer", async () => {
      const item = explorer.fileItems[folder.path];
      const click = item.onSelfClick;
      try {
        item.onSelfClick = undefined;
        bn.refresh();
        ok(explorer.getSortedFolderItems(folder).some((entry) => entry.file === home), "Home hidden despite unsupported folder click");
        ok(!item.selfEl.hasClass("bn-leaf"), "Native arrow was hidden");
      } finally { item.onSelfClick = click; bn.refresh(); }
    });
    for (const method of ["revealActiveFile", "revealInFolder"]) {
      await test(`Missing ${method} preserves native rows and folder clicks`, async () => {
        const previous = explorer[method];
        try {
          explorer[method] = undefined;
          bn.refresh();
          ok(explorer.getSortedFolderItems(folder).some((entry) => entry.file === home), "Home inaccessible");
          const item = explorer.fileItems[folder.path];
          await item.setCollapsed(true);
          item.onSelfClick(new MouseEvent("click", { button: 0, cancelable: true }));
          await wait();
          ok(!item.collapsed, "Folder click did not fall back to native expansion");
        } finally { explorer[method] = previous; bn.refresh(); }
      });
    }
    await test("Home-only folder keeps native arrow when click hook is unavailable", async () => {
      const only = await app.vault.createFolder(`${root}/Only`);
      const onlyHome = await app.vault.create(`${only.path}/Only.md`, "");
      await wait();
      const item = explorer.fileItems[only.path];
      ok(item.selfEl.hasClass("bn-leaf"), "Fixture must initially hide arrow");
      const click = item.onSelfClick;
      try {
        item.onSelfClick = undefined;
        bn.refresh();
        ok(!item.selfEl.hasClass("bn-leaf"), "Native arrow remained hidden");
        ok(explorer.getSortedFolderItems(only).some((entry) => entry.file === onlyHome), "Only home inaccessible");
      } finally { item.onSelfClick = click; bn.refresh(); }
    });
    await test("New child selects its inline title like native new-note creation", async () => {
      if (!app.vault.getConfig("showInlineTitle")) throw new Error("Enable inline titles for this test");
      app.workspace.setActiveLeaf(leaf);
      await bn.create(folder.path);
      await wait();
      const title = leaf.view.inlineTitleEl;
      const selection = title?.ownerDocument.getSelection();
      ok(title && title.ownerDocument.activeElement === title, "New child title not focused");
      ok(selection?.toString() === leaf.view.file.basename, "New child title not selected");
    });
  } finally {
    leaf.detach();
    if (oldLeaf) app.workspace.setActiveLeaf(oldLeaf, { focus: false });
    const fixture = app.vault.getAbstractFileByPath(root);
    if (fixture?.path === root && root.startsWith("__branch_note_issues_")) await app.vault.delete(fixture, true);
  }
  return { results, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass).length };
})();
