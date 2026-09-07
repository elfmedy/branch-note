/* Authorized Sandbox-only lifecycle test. Only its own temporary order key is added/removed. */
(async () => {
  if (app.vault.getName() !== "Obsidian Sandbox")
    throw new Error("Sandbox only");
  const root = `__branch_note_lifecycle_${Date.now()}`,
    results = [];
  const wait = () => new Promise((r) => setTimeout(r, 160));
  const ok = (v, message) => {
    if (!v) throw new Error(message);
  };
  const test = async (name, fn) => {
    await fn();
    results.push({ name, pass: true });
  };
  const explorer = app.workspace.getLeavesOfType("file-explorer")[0].view;
  const oldLeaf = app.workspace.activeLeaf,
    initialLeaves = new Set();
  app.workspace.iterateAllLeaves((l) => initialLeaves.add(l));
  let qt = app.plugins.plugins["quiet-tree"],
    bn = app.plugins.plugins["branch-note"];
  if (!qt || !bn) throw new Error("Both plugins must be enabled");
  const oldLanguage = bn.language;
  const before = JSON.stringify(qt.store.order);
  await app.vault.createFolder(root);
  const folder = await app.vault.createFolder(`${root}/Page`);
  await app.vault.create(`${folder.path}/Page.md`, "home");
  await app.vault.create(`${folder.path}/A.md`, "A");
  await app.vault.create(`${folder.path}/B.md`, "B");
  const names = () =>
    explorer
      .getSortedFolderItems(folder)
      .map((i) => i.file.name)
      .join(",");
  const loadBranch = async () => {
    await app.plugins.loadPlugin("branch-note");
    bn = app.plugins.plugins["branch-note"];
    await wait();
  };
  try {
    await qt.store.update((order) => {
      order[folder.path] = ["B.md", "A.md", "Page.md"];
      return order;
    });
    qt.refresh();
    await wait();
    await test("Quiet Tree order is retained with home hidden", async () => {
      ok(names() === "B.md,A.md", names());
    });
    await test("Branch Note unload restores home and removes own decorations", async () => {
      await app.plugins.unloadPlugin("branch-note");
      await wait();
      ok(names() === "B.md,A.md,Page.md", names());
      ok(
        !explorer.containerEl.querySelector(".bn-leaf,.bn-current"),
        "Classes leaked",
      );
    });
    await test("Branch Note reload after Quiet Tree preserves order", async () => {
      await loadBranch();
      ok(names() === "B.md,A.md", names());
    });
    await test("Quiet Tree unload leaves Branch Note functional", async () => {
      await app.plugins.unloadPlugin("quiet-tree");
      await wait();
      ok(!names().includes("Page.md"), "Home became visible");
      ok(
        !explorer.containerEl.querySelector(".qt-handle"),
        "Quiet Tree handle leaked",
      );
    });
    await test("Quiet Tree load after Branch Note also preserves order", async () => {
      await app.plugins.loadPlugin("quiet-tree");
      qt = app.plugins.plugins["quiet-tree"];
      await wait();
      ok(names() === "B.md,A.md", names());
      explorer.revealInFolder(folder);
      await wait();
      ok(
        explorer.fileItems[folder.path].selfEl.querySelectorAll(".qt-handle")
          .length === 1,
        "Duplicated/missing handle",
      );
    });
    await test("Branch Note unload beneath another wrapper restores native visibility", async () => {
      await app.plugins.unloadPlugin("branch-note");
      await wait();
      ok(names() === "B.md,A.md,Page.md", names());
    });
    await test("Language survives reload and settings render only one selector", async () => {
      await loadBranch();
      await bn.setLanguage("en");
      await app.plugins.unloadPlugin("branch-note");
      await loadBranch();
      ok(bn.language === "en", "Language lost");
      const tab = app.setting.pluginTabs.find((t) => t.id === "branch-note");
      app.setting.open();
      app.setting.openTabById("branch-note");
      await wait();
      ok(
        tab.containerEl.querySelectorAll('select:not([aria-hidden="true"])')
          .length === 1,
        "Expected one language dropdown",
      );
      ok(
        tab.containerEl.querySelectorAll(".setting-item").length === 1,
        "Unexpected extra settings",
      );
      const dropdown = tab.containerEl.querySelector(
        'select:not([aria-hidden="true"])',
      );
      ok(
        [...dropdown.options].map((o) => o.value).join(",") === "auto,zh,en",
        "Expected Follow Obsidian, Chinese, English",
      );
      dropdown.value = "zh";
      dropdown.dispatchEvent(new Event("change", { bubbles: true }));
      await wait();
      ok(bn.language === "zh", "Dropdown did not switch language");
      ok(
        tab.containerEl.textContent.includes("语言"),
        "Chinese settings not rendered",
      );
      app.setting.close();
    });
    await test("Follow Obsidian persists as auto across reload", async () => {
      await bn.setLanguage("auto");
      const label = bn.t("newChild");
      await app.plugins.unloadPlugin("branch-note");
      await app.plugins.loadPlugin("branch-note");
      bn = app.plugins.plugins["branch-note"];
      ok(bn.language === "auto", "Auto resolved into a fixed saved language");
      ok(bn.t("newChild") === label, "Resolved language changed on reload");
      await wait();
    });
    await test("Drag-suppressed click cannot open a folder page", async () => {
      const leaf = app.workspace.getLeaf("tab");
      await bn.openMarkdown(`${folder.path}/A.md`, leaf);
      const event = new MouseEvent("click", {
        button: 0,
        bubbles: true,
        cancelable: true,
      });
      event.preventDefault();
      explorer.onFileClick(event, explorer.fileItems[folder.path].selfEl);
      await wait();
      ok(
        leaf.view.file?.path === `${folder.path}/A.md`,
        "Suppressed click opened folder",
      );
    });
  } catch (e) {
    results.push({ pass: false, error: String(e), stack: e.stack });
  } finally {
    app.setting.close();
    if (!app.plugins.plugins["quiet-tree"])
      await app.plugins.loadPlugin("quiet-tree");
    if (!app.plugins.plugins["branch-note"])
      await app.plugins.loadPlugin("branch-note");
    qt = app.plugins.plugins["quiet-tree"];
    bn = app.plugins.plugins["branch-note"];
    await bn.setLanguage(oldLanguage);
    await qt.store.update((order) => {
      for (const key of Object.keys(order))
        if (key === root || key.startsWith(root + "/")) delete order[key];
      return order;
    });
    results.push({
      name: "Unrelated Quiet Tree order data preserved",
      pass: JSON.stringify(qt.store.order) === before,
    });
    const extra = [];
    app.workspace.iterateAllLeaves((l) => {
      if (!initialLeaves.has(l)) extra.push(l);
    });
    extra.forEach((l) => l.detach());
    if (oldLeaf) app.workspace.setActiveLeaf(oldLeaf, { focus: false });
    const fixture = app.vault.getAbstractFileByPath(root);
    if (
      fixture &&
      fixture.path === root &&
      root.startsWith("__branch_note_lifecycle_")
    )
      await app.vault.delete(fixture, true);
    qt.refresh();
    bn.refresh();
  }
  return {
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    enabled: [...app.plugins.enabledPlugins],
  };
})();
