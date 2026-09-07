/* Run in Obsidian Sandbox, in desktop or dev:mobile mode.
 * Synthetic touch-origin clicks validate DOM routing, not a physical device.
 * Creates and removes only a unique fixture; restores leaves and plugin state. */
(async () => {
  if (app.vault.getName() !== "Obsidian Sandbox")
    throw new Error("Sandbox only");
  let bn = app.plugins.plugins["branch-note"];
  if (!bn) throw new Error("Enable Branch Note first");
  const explorerLeaf = app.workspace.getLeavesOfType("file-explorer")[0];
  await app.workspace.revealLeaf(explorerLeaf);
  const explorer = explorerLeaf.view;
  const root = `__branch_note_interaction_${Date.now()}`;
  const oldLeaf = app.workspace.activeLeaf;
  const initialLeaves = new Set();
  app.workspace.iterateAllLeaves((l) => initialLeaves.add(l));
  const leaf = app.workspace.getLeaf("tab");
  const results = [];
  const oldAutoReveal = explorer.autoRevealFile;
  // Mobile drawer open/close animations must finish before the next activation.
  const wait = () => new Promise((r) => setTimeout(r, 500));
  const ok = (value, message) => {
    if (!value) throw new Error(message);
  };
  const test = async (name, fn) => {
    await fn();
    results.push({ name, pass: true });
  };
  const click = (target, touch = true) =>
    target.dispatchEvent(
      touch
        ? new PointerEvent("click", {
            pointerType: "touch",
            button: 0,
            bubbles: true,
            cancelable: true,
          })
        : new MouseEvent("click", {
            button: 0,
            bubbles: true,
            cancelable: true,
          }),
    );
  await app.vault.createFolder(root);
  try {
    for (const [name, home, children] of [
      ["Empty", null, false],
      ["ChildrenOnly", null, true],
      ["EmptyHome", "", true],
      ["WrittenHome", "# Existing content", true],
    ]) {
      const folder = `${root}/${name}`;
      await app.vault.createFolder(folder);
      if (home !== null) await app.vault.create(`${folder}/${name}.md`, home);
      if (children) await app.vault.create(`${folder}/Child.md`, "");
      await wait();
      await app.workspace.revealLeaf(explorerLeaf);
      explorer.revealInFolder(app.vault.getAbstractFileByPath(folder));
      await wait();
      const item = explorer.fileItems[folder];
      await test(`Touch-origin name click: ${name}`, async () => {
        app.workspace.setActiveLeaf(leaf);
        await wait();
        await app.workspace.revealLeaf(explorerLeaf);
        explorer.revealInFolder(item.file);
        await wait();
        await item.setCollapsed(true);
        click(item.selfEl.querySelector(".nav-folder-title-content"));
        await wait();
        ok(item.collapsed, "Name tap expanded the folder");
        if (home === null) {
          ok(leaf.view.getViewType() === "branch-note-home", "Missing prompt");
          ok(
            !app.vault.getAbstractFileByPath(`${folder}/${name}.md`),
            "Unexpected home creation",
          );
        } else {
          ok(
            leaf.view.file?.path === `${folder}/${name}.md`,
            "Home did not open natively",
          );
          ok(
            (await app.vault.read(leaf.view.file)) === home,
            "Home content changed",
          );
        }
      });
      if (children)
        await test(`Touch-origin arrow click: ${name}`, async () => {
          await app.workspace.revealLeaf(explorerLeaf);
          explorer.revealInFolder(item.file);
          await wait();
          click(item.selfEl.querySelector(".collapse-icon svg"));
          await wait();
          ok(!item.collapsed, "Arrow tap did not expand");
          click(item.selfEl.querySelector(".collapse-icon"));
          await wait();
          ok(item.collapsed, "Arrow tap did not collapse");
        });
    }
    const folder = `${root}/WrittenHome`;
    const item = explorer.fileItems[folder];
    const title = item.selfEl.querySelector(".nav-folder-title-content");
    await test("Canceled drag click leaves the active file unchanged", async () => {
      await bn.openMarkdown(`${folder}/Child.md`, leaf);
      const cancel = (e) => e.preventDefault();
      explorer.containerEl.addEventListener("click", cancel, true);
      try {
        click(title);
      } finally {
        explorer.containerEl.removeEventListener("click", cancel, true);
      }
      await wait();
      ok(
        leaf.view.file?.path === `${folder}/Child.md`,
        "Canceled drag opened home",
      );
    });
    await test("Rename input and context menu retain their event routes", async () => {
      let inputClicks = 0,
        contexts = 0;
      const input = item.selfEl.createEl("input");
      input.addEventListener("click", () => inputClicks++);
      const context = () => contexts++;
      title.addEventListener("contextmenu", context);
      try {
        click(input);
        // Stop before the explorer menu to avoid opening a modal during QA.
        const stop = (e) => e.stopPropagation();
        title.addEventListener("contextmenu", stop);
        try {
          title.dispatchEvent(
            new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
          );
        } finally {
          title.removeEventListener("contextmenu", stop);
        }
        ok(inputClicks === 1 && contexts === 1, "Native event route blocked");
      } finally {
        input.remove();
        title.removeEventListener("contextmenu", context);
      }
    });
    await test("Unload restores native clicks; reload restores page activation", async () => {
      await app.plugins.unloadPlugin("branch-note");
      await item.setCollapsed(true);
      click(title, false);
      await wait();
      ok(!item.collapsed, "Page handler remained after unload");
      await app.plugins.loadPlugin("branch-note");
      bn = app.plugins.plugins["branch-note"];
      await wait();
      await item.setCollapsed(true);
      click(title, false);
      await wait();
      ok(item.collapsed, "Reload did not restore activation");
    });

    await test("Auto-reveal of a previously rendered home preserves its folder fold", async () => {
      await app.plugins.unloadPlugin("branch-note");
      const path = root + "/Preloaded";
      await app.vault.createFolder(path);
      const home = await app.vault.create(path + "/Preloaded.md", "");
      await app.vault.create(path + "/Child.md", "");
      await app.workspace.revealLeaf(explorerLeaf);
      await wait();
      ok(
        !!explorer.fileItems[home.path].parent,
        "Fixture must have a native parent before hiding",
      );
      await app.plugins.loadPlugin("branch-note");
      bn = app.plugins.plugins["branch-note"];
      await wait();
      explorer.setAutoReveal(true);
      await bn.openMarkdown(path + "/Child.md", leaf);
      const parent = explorer.fileItems[path];
      await wait();
      await app.workspace.revealLeaf(explorerLeaf);
      explorer.revealInFolder(parent.file);
      await wait();
      await parent.setCollapsed(true);
      click(parent.selfEl.querySelector(".nav-folder-title-content"));
      await wait();
      ok(leaf.view.file === home, "Name tap did not open the home");
      ok(parent.collapsed, "Auto-reveal expanded the home folder");
      await explorer.fileItems[root].setCollapsed(true);
      explorer.revealActiveFile();
      await app.workspace.revealLeaf(explorerLeaf);
      await wait();
      ok(
        !explorer.fileItems[root].collapsed,
        "Auto-reveal should still reveal ancestors",
      );
      ok(
        explorer.activeDom.file === home,
        "Native active item was not restored",
      );
    });
    await test("Explicit reveal selects the folder for a hidden home", async () => {
      const path = root + "/Preloaded";
      const home = app.vault.getAbstractFileByPath(path + "/Preloaded.md");
      await explorer.fileItems[path].setCollapsed(true);
      explorer.revealInFolder(home);
      await wait();
      ok(
        explorer.fileItems[path].collapsed,
        "Explicit home reveal expanded children",
      );
      ok(
        explorer.tree.focusedItem === explorer.fileItems[path],
        "Hidden home selected instead of its folder",
      );
    });
    await test("Deferred auto-reveal after showing the explorer preserves the home fold", async () => {
      const path = root + "/Preloaded";
      const display = explorer.containerEl.style.display;
      try {
        explorer.containerEl.hide();
        await bn.openMarkdown(path + "/Child.md", leaf);
        await explorer.fileItems[path].setCollapsed(true);
        await bn.openFolder(path);
        await wait();
      } finally {
        explorer.containerEl.style.display = display;
      }
      await app.workspace.revealLeaf(explorerLeaf);
      await wait();
      ok(
        explorer.fileItems[path].collapsed,
        "Deferred home reveal expanded folder",
      );
    });
    await test("Ordinary child reveal still expands its parent", async () => {
      const path = root + "/Preloaded";
      await explorer.fileItems[path].setCollapsed(true);
      await bn.openMarkdown(path + "/Child.md", leaf);
      await wait();
      await app.workspace.revealLeaf(explorerLeaf);
      await wait();
      ok(
        !explorer.fileItems[path].collapsed,
        "Ordinary child auto-reveal was blocked",
      );
    });
    await test("Unload restores both native reveal methods", async () => {
      await app.plugins.unloadPlugin("branch-note");
      ok(
        explorer.revealActiveFile ===
          Object.getPrototypeOf(explorer).revealActiveFile,
        "Auto-reveal wrapper remained",
      );
      ok(
        explorer.revealInFolder ===
          Object.getPrototypeOf(explorer).revealInFolder,
        "Explicit reveal wrapper remained",
      );
      await app.plugins.loadPlugin("branch-note");
      bn = app.plugins.plugins["branch-note"];
    });
  } catch (e) {
    results.push({ pass: false, error: String(e), stack: e.stack });
  } finally {
    explorer.setAutoReveal(oldAutoReveal);
    if (!app.plugins.plugins["branch-note"])
      await app.plugins.loadPlugin("branch-note");
    const extras = [];
    app.workspace.iterateAllLeaves((l) => {
      if (!initialLeaves.has(l)) extras.push(l);
    });
    extras.forEach((l) => l.detach());
    if (oldLeaf) app.workspace.setActiveLeaf(oldLeaf, { focus: false });
    const fixture = app.vault.getAbstractFileByPath(root);
    if (fixture?.path === root && root.startsWith("__branch_note_interaction_"))
      await app.vault.delete(fixture, true);
  }
  return {
    mode: document.body.classList.contains("is-mobile")
      ? "mobile-emulation"
      : "desktop",
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
  };
})();
