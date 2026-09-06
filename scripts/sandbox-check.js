/* Run only in the explicitly authorized Obsidian Sandbox via Obsidian's developer CLI.
 * This script creates and permanently removes only its own uniquely named fixture.
 * Test results are returned to the caller; no existing notes or settings are changed. */
(async () => {
  if (app.vault.getName() !== "Obsidian Sandbox")
    throw new Error("Sandbox only");
  const plugin = app.plugins.plugins["branch-note"];
  if (!plugin) throw new Error("Enable Branch Note first");
  const root = `__branch_note_qa_${Date.now()}`;
  const results = [];
  const originalLeaf = app.workspace.activeLeaf;
  const originalLeaves = new Set();
  app.workspace.iterateAllLeaves((l) => originalLeaves.add(l));
  const originalLanguage = plugin.language;
  let leaf = app.workspace.getLeaf("tab");
  app.workspace.setActiveLeaf(leaf, { focus: true });
  const wait = () => new Promise((r) => setTimeout(r, 160));
  const ok = (value, message) => {
    if (!value) throw new Error(message);
  };
  const test = async (name, fn) => {
    await fn();
    results.push({ name, pass: true });
  };
  const file = (path) => app.vault.getAbstractFileByPath(`${root}/${path}`);
  const mkdir = (path) => app.vault.createFolder(`${root}/${path}`);
  const create = (path, text = "") => app.vault.create(`${root}/${path}`, text);
  const read = (path) => app.vault.read(file(path));
  const explorer = app.workspace.getLeavesOfType("file-explorer")[0].view;
  let capturedMenu;
  let nativeItems;
  const capture = (folder) => {
    const trigger = app.workspace.trigger;
    app.workspace.trigger = function (...args) {
      if (args[0] === "file-menu")
        nativeItems = args[1].items
          .filter((i) => i.titleEl)
          .map((i) => ({
            item: i,
            title: i.titleEl.textContent,
            callback: i.callback,
          }));
      const r = trigger.apply(this, args);
      if (args[0] === "file-menu") capturedMenu = args[1];
      return r;
    };
    try {
      explorer.onFileContextMenu(
        new MouseEvent("contextmenu", { clientX: 150, clientY: 200 }),
        folder,
      );
    } finally {
      app.workspace.trigger = trigger;
    }
    const menu = capturedMenu;
    menu?.hide();
    return menu;
  };
  await app.vault.createFolder(root);
  try {
    await test("Empty folder: no home on open; no visible expand arrow", async () => {
      await mkdir("Empty");
      await plugin.openFolder(`${root}/Empty`);
      await wait();
      ok(
        leaf.view.getViewType() === "branch-note-home",
        "Missing placeholder view",
      );
      ok(!file("Empty/Empty.md"), "Opening created a file");
      explorer.revealInFolder(file("Empty"));
      await wait();
      const row = explorer.fileItems[`${root}/Empty`].selfEl;
      ok(row.classList.contains("bn-leaf"), "Leaf class missing");
      const arrow = row.querySelector(".collapse-icon");
      ok(
        !arrow || getComputedStyle(arrow).visibility === "hidden",
        "Arrow visible",
      );
      ok(
        !!row.querySelector(".qt-handle"),
        "Quiet Tree handle missing: " + row.outerHTML,
      );
      ok(!row.querySelector(".bn-menu,.bn-icon"), "Unexpected decoration");
    });
    await test("Folder click opens page without toggling expansion", async () => {
      await create("Empty/Child.md");
      await wait();
      const item = explorer.fileItems[`${root}/Empty`];
      await item.setCollapsed(true);
      await plugin.openMarkdown(`${root}/Empty/Child.md`, leaf);
      item.selfEl.querySelector(".nav-folder-title-content").dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      await wait();
      ok(
        leaf.view.getViewType() === "branch-note-home",
        "Actual folder click did not open page",
      );
      ok(item.collapsed, "Name click toggled folder");
    });
    await test("Arrow still expands children", async () => {
      const item = explorer.fileItems[`${root}/Empty`];
      item.selfEl.querySelector(".collapse-icon").dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      await wait();
      ok(!item.collapsed, "Arrow failed to expand");
    });
    await test("Start writing creates an empty file and immediately opens the native editor", async () => {
      await plugin.openFolder(root + "/Empty");
      const view = leaf.view;
      ok(
        !view.contentEl.querySelector("textarea"),
        "Custom editor still exists",
      );
      view.contentEl.querySelector(".bn-start").click();
      await plugin.service.drain();
      await wait();
      ok(
        leaf.view.getViewType() === "markdown" &&
          leaf.view.file?.path === root + "/Empty/Empty.md",
        "Start did not open native Markdown",
      );
      ok(
        (await read("Empty/Empty.md")) === "",
        "Start did not create an empty file",
      );
      await plugin.openFolder(root + "/Empty");
      ok(
        leaf.view.getViewType() === "markdown",
        "Empty home showed prompt again",
      );
    });
    await test("Same-name home is hidden; siblings and Quiet Tree order remain", async () => {
      const sorted = explorer.getSortedFolderItems(file("Empty"));
      ok(!sorted.some((x) => x.file.name === "Empty.md"), "Home not hidden");
      ok(
        sorted.some((x) => x.file.name === "Child.md"),
        "Child hidden",
      );
      ok(app.plugins.plugins["quiet-tree"], "Quiet Tree disabled");
    });
    await test("Plugin commands occupy one separate menu group and preserve native items", async () => {
      const menu = capture(file("Empty"));
      ok(menu, "Menu not captured");
      const items = menu.items.filter((i) => i.titleEl);
      const newItems = items.filter(
        (i) => i.titleEl.textContent === plugin.t("newChild"),
      );
      ok(newItems.length === 1, "Child command duplicated/missing");
      ok(!newItems[0].submenu, "Child command nested");
      const danger = items.filter(
        (i) =>
          i.section === "danger" && i.iconEl?.querySelector(".lucide-trash-2"),
      );
      ok(danger.length === 1, "Delete duplicated/missing");
      ok(
        danger[0].titleEl.textContent !== plugin.t("deleteHome"),
        "Native Delete was replaced",
      );
      ok(newItems[0].section === "branch-note", "Missing own section");
      const homeItem = items.find(
        (i) => i.titleEl.textContent === plugin.t("deleteHome"),
      );
      ok(
        homeItem?.section === "branch-note",
        "Home deletion is outside plugin group",
      );
      for (const original of nativeItems)
        ok(
          original.item.callback === original.callback &&
            original.item.titleEl.textContent === original.title,
          "Native menu was modified",
        );
      const group = menu.items.filter((i) => i.section === "branch-note");
      ok(
        (
          group[0].dom.closest(".menu-group") ?? group[0].dom
        ).previousElementSibling?.classList.contains("menu-separator"),
        "No leading menu separator",
      );
      ok(
        !(group.at(-1).dom.closest(".menu-group") ?? group.at(-1).dom)
          .nextElementSibling ||
          (
            group.at(-1).dom.closest(".menu-group") ?? group.at(-1).dom
          ).nextElementSibling.classList.contains("menu-separator"),
        "No trailing menu boundary",
      );
      newItems[0].callback();
      await plugin.service.drain();
      await wait();
      ok(
        file(`Empty/${plugin.t("untitled")}.md`),
        "Menu command did not create child",
      );
    });
    await test("Nonempty ordinary note promotes with content and one-step undo", async () => {
      const text = "---\ntag: 测试\n---\n# Original\n[[Elsewhere]]";
      await create("Original.md", text);
      await plugin.create(`${root}/Original.md`);
      ok(
        (await read("Original/Original.md")) === text,
        "Original content changed",
      );
      ok(file(`Original/${plugin.t("untitled")}.md`), "Missing child");
      await plugin.service.undo();
      ok((await read("Original.md")) === text, "Undo failed");
      ok(!file("Original"), "Promotion folder left over");
    });
    await test("Empty source promotes into empty home opened directly in native editor", async () => {
      await create("Blank.md");
      await plugin.create(`${root}/Blank.md`);
      await plugin.openFolder(`${root}/Blank`);
      ok(
        leaf.view.getViewType() === "markdown",
        "Empty promoted page incorrectly showed prompt",
      );
      ok((await read("Blank/Blank.md")) === "", "Empty original changed");
    });
    await test("Pre-existing matching file automatically opens in native editor", async () => {
      await mkdir("External");
      await create("External/External.md", "Made outside Branch Note");
      await plugin.openFolder(`${root}/External`);
      ok(
        leaf.view.file?.path === `${root}/External/External.md`,
        "External matching note not recognized",
      );
    });
    await test("Native FileManager rename synchronizes home and preserves child", async () => {
      await create("External/Keep.md", "keep");
      await app.fileManager.renameFile(file("External"), `${root}/Renamed`);
      ok(
        (await read("Renamed/Renamed.md")) === "Made outside Branch Note",
        "Home not renamed",
      );
      ok((await read("Renamed/Keep.md")) === "keep", "Child changed");
    });
    await test("Rename collision is rejected before changing paths", async () => {
      await create("Renamed/Conflict.md", "do not overwrite");
      let rejected = false;
      try {
        await app.fileManager.renameFile(file("Renamed"), `${root}/Conflict`);
      } catch (e) {
        rejected = e.code === "conflict";
      }
      ok(rejected, "Conflict not rejected");
      ok(
        file("Renamed/Renamed.md") && !file("Conflict"),
        "Partial rename on conflict",
      );
      ok(
        (await read("Renamed/Conflict.md")) === "do not overwrite",
        "Conflict file changed",
      );
    });
    await test("Raw vault rename is followed for external changes", async () => {
      await app.vault.rename(file("Renamed"), `${root}/Moved`);
      await plugin.service.drain();
      ok(file("Moved/Moved.md"), "External rename not followed");
    });
    await test("Delete-home menu retains descendants and opens empty page; undo restores", async () => {
      const menu = capture(file("Moved"));
      menu.items
        .find((i) => i.titleEl?.textContent === plugin.t("deleteHome"))
        .callback();
      await plugin.service.drain();
      await wait();
      ok(file("Moved") && !file("Moved/Moved.md"), "Home deletion failed");
      ok(file("Moved/Keep.md"), "Child deleted");
      leaf = app.workspace.activeLeaf;
      ok(
        leaf.view.getViewType() === "branch-note-home",
        "Delete did not open placeholder",
      );
      await plugin.service.undo();
      ok(
        (await read("Moved/Moved.md")) === "Made outside Branch Note",
        "Deleted content not recovered",
      );
    });
    await test("Child creation on folder without home leaves home absent", async () => {
      await mkdir("NoHome");
      await plugin.create(`${root}/NoHome`);
      ok(!file("NoHome/NoHome.md"), "Child creation also created homepage");
    });
    await test("Native Delete menu and keyboard still request deletion of the whole folder", async () => {
      explorer.revealInFolder(file("Moved"));
      await wait();
      const tree = explorer.tree;
      const selection = [...tree.selectedDoms],
        originalPrompt = app.fileManager.promptForDeletion;
      const requested = [];
      app.fileManager.promptForDeletion = async (f) => {
        ok(f.path === root + "/Moved", "Unexpected deletion target");
        requested.push(f.path);
        return false;
      };
      try {
        const menu = capture(file("Moved"));
        const native = menu.items.find(
          (i) =>
            i.section === "danger" &&
            i.iconEl?.querySelector(".lucide-trash-2"),
        );
        await native.callback();
        await wait();
        tree.selectedDoms.clear();
        tree.selectedDoms.add(explorer.fileItems[root + "/Moved"]);
        const event = new KeyboardEvent("keydown", {
          key: "Delete",
          cancelable: true,
        });
        Object.defineProperty(event, "targetNode", {
          value: explorer.containerEl,
        });
        tree.scope.keys
          .find((k) => k.key === "Delete" && k.modifiers === "")
          .func(event);
        await wait();
        ok(requested.length === 2, "Native deletion prompt was bypassed");
        ok(
          file("Moved/Moved.md") && file("Moved/Keep.md"),
          "Cancel deleted content",
        );
      } finally {
        app.fileManager.promptForDeletion = originalPrompt;
        tree.selectedDoms.clear();
        for (const item of selection)
          if (!item.file.path.startsWith(root)) tree.selectedDoms.add(item);
      }
    });
    await test("Plain files and folders without a home expose only the separated child command", async () => {
      for (const item of [file("NoHome"), file("Original.md")]) {
        const menu = capture(item);
        const group = menu.items.filter((i) => i.section === "branch-note");
        ok(
          group.length === 1 &&
            group[0].titleEl.textContent === plugin.t("newChild"),
          "Unexpected plugin command",
        );
        ok(
          (
            group[0].dom.closest(".menu-group") ?? group[0].dom
          ).previousElementSibling?.classList.contains("menu-separator"),
          "Group not separated",
        );
      }
      const menu = capture(file("Blank"));
      ok(
        menu.items.some(
          (i) =>
            i.section === "branch-note" &&
            i.titleEl?.textContent === plugin.t("deleteHome"),
        ),
        "Empty home cannot be deleted",
      );
    });
    await test("Settings contain exactly one bilingual language selector", async () => {
      const tab = app.setting.pluginTabs.find((t) => t.id === "branch-note");
      ok(tab.getSettingDefinitions().length === 1, "Extra settings");
      await plugin.setLanguage("en");
      ok(tab.getSettingDefinitions()[0].name === "Language", "English missing");
      ok(
        capture(file("Empty")).items.some(
          (i) => i.titleEl?.textContent === "New child note",
        ),
        "English menu missing",
      );
      await plugin.setLanguage("zh");
      ok(tab.getSettingDefinitions()[0].name === "语言", "Chinese missing");
      ok(
        capture(file("Empty")).items.some(
          (i) => i.titleEl?.textContent === "新建子笔记",
        ),
        "Chinese menu missing",
      );
    });
    await test("Link targets continue to resolve after promotion and folder rename", async () => {
      ok(
        app.vault.getConfig("alwaysUpdateLinks") === true,
        "Requires automatic link updates in Sandbox",
      );
      await create("LinkTarget.md", "target");
      await create("Ref.md", `[[${root}/LinkTarget]]`);
      await wait();
      await plugin.create(`${root}/LinkTarget.md`);
      await wait();
      const promoted = await read("Ref.md");
      const target = promoted.match(/\[\[([^\]|]+)/)?.[1];
      ok(
        app.metadataCache.getFirstLinkpathDest(target, `${root}/Ref.md`)
          ?.path === `${root}/LinkTarget/LinkTarget.md`,
        "Promotion broke incoming link",
      );
      await app.fileManager.renameFile(
        file("LinkTarget"),
        `${root}/LinkRenamed`,
      );
      await wait();
      const renamed = (await read("Ref.md")).match(/\[\[([^\]|]+)/)?.[1];
      ok(
        app.metadataCache.getFirstLinkpathDest(renamed, `${root}/Ref.md`)
          ?.path === `${root}/LinkRenamed/LinkRenamed.md`,
        "Rename broke incoming link",
      );
    });
    await test("Native home-file rename also renames its containing folder", async () => {
      await app.fileManager.renameFile(
        file("LinkRenamed/LinkRenamed.md"),
        `${root}/LinkRenamed/TitleRenamed.md`,
      );
      await wait();
      ok(
        file("TitleRenamed/TitleRenamed.md") && !file("LinkRenamed"),
        "Editor rename did not synchronize folder",
      );
      ok(
        (await read("TitleRenamed/TitleRenamed.md")) === "target",
        "Editor rename changed content",
      );
      const target = (await read("Ref.md")).match(/\[\[([^\]|]+)/)?.[1];
      ok(
        app.metadataCache.getFirstLinkpathDest(target, `${root}/Ref.md`)
          ?.path === `${root}/TitleRenamed/TitleRenamed.md`,
        "Editor rename broke incoming link",
      );
    });
    await test("An externally created empty home opens directly; a stale Start button never overwrites content", async () => {
      await mkdir("Draft");
      await plugin.openFolder(root + "/Draft");
      const start = leaf.view.contentEl.querySelector(".bn-start");
      await create("Draft/Draft.md", "external wins");
      start.click();
      await plugin.service.drain();
      await wait();
      ok(
        leaf.view.getViewType() === "markdown" &&
          (await read("Draft/Draft.md")) === "external wins",
        "Stale button overwrote content",
      );
      await mkdir("ExternalEmpty");
      await create("ExternalEmpty/ExternalEmpty.md", "");
      await plugin.openFolder(root + "/ExternalEmpty");
      ok(
        leaf.view.getViewType() === "markdown",
        "External empty home showed prompt",
      );
    });
    await test("Recovery command exposes drafts even when the original folder is gone", async () => {
      const path = `${root}/Removed`;
      await plugin.retainDraft({
        folder: path,
        content: "orphaned thought",
        before: { content: "" },
      });
      app.commands.executeCommandById("branch-note:recover-page");
      await wait();
      const content = document.querySelector(".bn-recovery");
      try {
        ok(
          content?.querySelector("textarea")?.value === "orphaned thought",
          "Orphan draft inaccessible",
        );
        content.querySelector("button").click();
        const field = content.querySelector("textarea");
        ok(
          field.selectionEnd - field.selectionStart === field.value.length,
          "Cannot select draft for copying",
        );
      } finally {
        content
          ?.closest(".modal")
          ?.querySelector(".modal-close-button")
          ?.click();
        await plugin.clearDraft(path);
      }
    });
  } catch (error) {
    results.push({ pass: false, error: String(error), stack: error.stack });
  } finally {
    await plugin.service.drain();
    await plugin.setLanguage(originalLanguage);
    const extra = [];
    app.workspace.iterateAllLeaves((l) => {
      if (!originalLeaves.has(l)) extra.push(l);
    });
    for (const added of extra) added.detach();
    if (originalLeaf)
      app.workspace.setActiveLeaf(originalLeaf, { focus: false });
    const fixture = app.vault.getAbstractFileByPath(root);
    if (
      fixture &&
      fixture.path === root &&
      root.startsWith("__branch_note_qa_")
    )
      await app.vault.delete(fixture, true);
    plugin.refresh();
  }
  return {
    appVersion: app.getVersion?.(),
    enabled: [...app.plugins.enabledPlugins],
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
  };
})();
