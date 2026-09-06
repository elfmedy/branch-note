import {
  Plugin,
  PluginSettingTab,
  Notice,
  TFile,
  TFolder,
  getLanguage,
  type App,
  type Command,
  type Menu,
  type TAbstractFile,
  type WorkspaceLeaf,
  type SettingDefinitionItem,
} from "obsidian";
import {
  BranchError,
  BranchService,
  homeOf,
  pageFolder,
  visibleChildren,
  basename,
  parentPath,
  join,
  stem,
} from "./core";
import {
  ObsidianFiles,
  filterHomes,
  isExplorer,
  type Explorer,
  type ExplorerItem,
} from "./native";
import { HOME_VIEW, HomeView, type Draft } from "./home-view";
import { RecoveryModal } from "./recovery";
import { languageFrom, text, type Language, type TextKey } from "./i18n";

export default class BranchNotePlugin extends Plugin {
  language: Language = "en";
  drafts: Record<string, Draft> = Object.create(null) as Record<string, Draft>;
  files!: ObsidianFiles;
  service!: BranchService;
  private alive = false;
  private views = new Map<Explorer, () => void>();
  private itemClicks = new Map<
    ExplorerItem,
    { view: Explorer; dispose: () => void }
  >();
  private dataQueue: Promise<void> = Promise.resolve();
  private ownMoves = new Set<string>();
  private commandLabels: { command: Command; key: TextKey }[] = [];
  t = (key: TextKey): string => text(this.language, key);
  async onload(): Promise<void> {
    const saved: unknown = await this.loadData();
    const data =
      saved && typeof saved === "object"
        ? (saved as Record<string, unknown>)
        : {};
    this.language = languageFrom(data.language, getLanguage());
    if (data.drafts && typeof data.drafts === "object") {
      for (const value of Object.values(data.drafts)) {
        const draft = value as Partial<Draft> | null;
        if (
          draft &&
          typeof draft.folder === "string" &&
          typeof draft.content === "string" &&
          draft.before &&
          typeof draft.before.content === "string" &&
          (draft.before.path === undefined ||
            typeof draft.before.path === "string")
        )
          this.drafts[draft.folder] = {
            folder: draft.folder,
            content: draft.content,
            before: draft.before,
          };
      }
    }
    this.alive = true;
    const manager = this.app.fileManager;
    // Preserve method identity for cooperative wrapping; invoked with its original receiver below.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Wrapper delegates with the original receiver and restores the exact method.
    const previous = manager.renameFile;
    const hadOwn = Object.hasOwn(manager, "renameFile");
    this.files = new ObsidianFiles(this.app, async (file, to) => {
      const key = `${file.path}\n${to}`;
      this.ownMoves.add(key);
      try {
        await manager.renameFile(file, to);
      } finally {
        this.ownMoves.delete(key);
      }
    });
    this.service = new BranchService(this.files);
    const rename = async (file: TAbstractFile, to: string): Promise<void> => {
      if (!this.alive || this.ownMoves.has(`${file.path}\n${to}`))
        return previous.call(manager, file, to);
      if (file instanceof TFolder)
        return this.service.renameFolder(file.path, to);
      const folder = pageFolder(this.files, file.path);
      if (folder && parentPath(to) === folder && /\.md$/i.test(to)) {
        return this.service.renameFolder(
          folder,
          join(parentPath(folder), stem(basename(to))),
        );
      }
      return previous.call(manager, file, to);
    };
    manager.renameFile = rename;
    this.register(() => {
      this.alive = false;
      if (manager.renameFile === rename) {
        if (hadOwn) manager.renameFile = previous;
        else delete (manager as Partial<typeof manager>).renameFile;
      }
      for (const dispose of this.views.values()) dispose();
      this.views.clear();
    });
    this.registerView(HOME_VIEW, (leaf) => new HomeView(leaf, this));
    this.addSettingTab(new BranchSettings(this.app, this));
    const add = (id: string, key: TextKey, callback: () => void) => {
      const command = this.addCommand({ id, name: this.t(key), callback });
      this.commandLabels.push({ command, key });
    };
    add("new-child", "newChild", () => {
      const path = this.activePath();
      if (path) void this.create(path).catch((e) => this.report(e));
    });
    add("undo-page-action", "undo", () => {
      void this.service
        .undo()
        .then(() => {
          this.refresh();
          new Notice(this.t("undone"));
        })
        .catch((e) => this.report(e));
    });
    add("delete-home", "deleteHome", () => {
      const path = this.activePath();
      const folder = path && pageFolder(this.files, path);
      if (folder) void this.deleteHome(folder).catch((e) => this.report(e));
    });
    add("recover-page", "recover", () => {
      if (Object.keys(this.drafts).length) new RecoveryModal(this).open();
      else new Notice(this.t("chooseRecovery"));
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => this.menu(menu, file)),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.syncViews()),
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.decorate()),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.decorate()),
    );
    this.registerEvent(this.app.vault.on("create", () => this.refresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.refresh()));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.refresh();
        if (
          file instanceof TFolder &&
          !this.ownMoves.has(`${oldPath}\n${file.path}`)
        )
          void this.service
            .followExternalRename(oldPath, file.path)
            .then(() => this.refresh())
            .catch((e) => this.report(e));
      }),
    );
    this.app.workspace.onLayoutReady(() => {
      if (this.alive) this.syncViews();
    });
  }
  private activePath(): string | undefined {
    const home = this.app.workspace.getActiveViewOfType(HomeView);
    return home?.folder?.path ?? this.app.workspace.getActiveFile()?.path;
  }
  async create(path: string): Promise<void> {
    const result = await this.service.createChild(path, this.t("untitled"));
    this.refresh();
    for (const view of this.views.keys())
      await view.fileItems[result.folder]?.setCollapsed?.(false);
    await this.openMarkdown(result.child);
    new Notice(this.t("created"));
  }
  async openMarkdown(path: string, leaf?: WorkspaceLeaf): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new BranchError("missing", path);
    await (leaf ?? this.app.workspace.getLeaf(false)).openFile(file, {
      active: true,
    });
    this.decorate();
  }
  async openFolder(path: string, newTab = false): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!(folder instanceof TFolder) || folder.isRoot()) return;
    const home = homeOf(this.files, path),
      leaf = this.app.workspace.getLeaf(newTab ? "tab" : false);
    if (home) await this.openMarkdown(home.path, leaf);
    else
      await leaf.setViewState({
        type: HOME_VIEW,
        state: { folder: path },
        active: true,
      });
    this.decorate();
  }
  async deleteHome(path: string): Promise<void> {
    const home = homeOf(this.files, path);
    const leaf = this.app.workspace.getLeaf(false);
    const previous = leaf.getViewState();
    const showingHome =
      previous.type === "markdown" &&
      home &&
      previous.state?.file === home.path;
    // Detach the active Markdown view before deleting its file, so native auto-close
    // cannot race with opening the folder's placeholder in the same tab.
    if (showingHome)
      await leaf.setViewState({
        type: HOME_VIEW,
        state: { folder: path },
        active: true,
      });
    try {
      await this.service.deleteHome(path);
    } catch (error) {
      if (showingHome && homeOf(this.files, path))
        await leaf.setViewState(previous);
      throw error;
    }
    this.refresh();
    await this.openFolder(path);
    new Notice(this.t("deleted"));
  }
  private menu(menu: Menu, file: TAbstractFile): void {
    if (
      !(file instanceof TFolder) &&
      !(file instanceof TFile && file.extension.toLowerCase() === "md")
    )
      return;
    menu.addItem((item) =>
      item
        .setSection("branch-note")
        .setTitle(this.t("newChild"))
        .setIcon("plus")
        .onClick(() => {
          void this.create(file.path).catch((e) => this.report(e));
        }),
    );
    const folder = pageFolder(this.files, file.path);
    if (folder && homeOf(this.files, folder)) {
      menu.addItem((item) =>
        item
          .setSection("branch-note")
          .setTitle(this.t("deleteHome"))
          .setIcon("trash-2")
          .onClick(() => {
            void this.deleteHome(folder).catch((e) => this.report(e));
          }),
      );
    }
  }
  private syncViews(): void {
    if (!this.alive) return;
    const current = new Set<Explorer>();
    for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
      if (!isExplorer(leaf.view)) continue;
      const view = leaf.view;
      current.add(view);
      if (this.views.has(view)) continue;
      const restore = filterHomes(view, this.files);
      let active = true,
        frame = 0;
      const observer = new MutationObserver(() => {
        if (!frame)
          frame = view.containerEl.win.requestAnimationFrame(() => {
            frame = 0;
            if (active) this.decorateView(view);
          });
      });
      observer.observe(view.containerEl, { childList: true, subtree: true });
      this.views.set(view, () => {
        active = false;
        observer.disconnect();
        view.containerEl.win.cancelAnimationFrame(frame);
        restore();
        for (const [item, hook] of this.itemClicks)
          if (hook.view === view) {
            hook.dispose();
            this.itemClicks.delete(item);
          }
        view.containerEl
          .querySelectorAll(".bn-leaf,.bn-current")
          .forEach((el) => el.removeClass("bn-leaf", "bn-current"));
      });
    }
    for (const [view, dispose] of this.views)
      if (!current.has(view)) {
        dispose();
        this.views.delete(view);
      }
    this.decorate();
  }
  refresh(): void {
    if (!this.alive) return;
    for (const view of this.views.keys()) view.requestSort();
    this.decorate();
  }
  private decorate(): void {
    for (const view of this.views.keys()) this.decorateView(view);
  }
  private decorateView(view: Explorer): void {
    const path = this.activePath(),
      activeFolder = path ? pageFolder(this.files, path) : undefined;
    const live = new Set(Object.values(view.fileItems));
    for (const [item, hook] of this.itemClicks)
      if (hook.view === view && !live.has(item)) {
        hook.dispose();
        this.itemClicks.delete(item);
      }
    for (const item of Object.values(view.fileItems)) {
      const folder = item.file instanceof TFolder;
      if (
        folder &&
        !this.itemClicks.has(item) &&
        typeof item.onSelfClick === "function"
      ) {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- Preserve identity, delegate with the item receiver, and restore on unload.
        const previous = item.onSelfClick,
          own = Object.hasOwn(item, "onSelfClick");
        let active = true;
        const click = (event: MouseEvent): void => {
          const target = event.target as HTMLElement | null;
          if (
            active &&
            !event.defaultPrevented &&
            (event.button === undefined || event.button === 0) &&
            !event.shiftKey &&
            view.fileBeingRenamed !== item.file &&
            !target?.closest(
              '.qt-handle,input,textarea,[contenteditable="true"]',
            ) &&
            (!target?.closest(".collapse-icon") ||
              item.selfEl.hasClass("bn-leaf"))
          ) {
            event.preventDefault();
            void this.openFolder(
              item.file.path,
              event.ctrlKey || event.metaKey,
            ).catch((e) => this.report(e));
            return;
          }
          previous.call(item, event);
        };
        item.onSelfClick = click;
        this.itemClicks.set(item, {
          view,
          dispose: () => {
            active = false;
            if (item.onSelfClick === click) {
              if (own) item.onSelfClick = previous;
              else delete item.onSelfClick;
            }
          },
        });
      }
      item.selfEl.toggleClass(
        "bn-leaf",
        folder && !visibleChildren(this.files, item.file.path).length,
      );
      item.selfEl.toggleClass(
        "bn-current",
        folder && item.file.path === activeFolder,
      );
    }
  }
  async setLanguage(language: Language): Promise<void> {
    this.language = language;
    await this.saveSettings();
    for (const { command, key } of this.commandLabels)
      command.name = `${this.manifest.name}: ${this.t(key)}`;
    for (const leaf of this.app.workspace.getLeavesOfType(HOME_VIEW))
      if (leaf.view instanceof HomeView) leaf.view.updateLanguage();
  }
  private saveSettings(): Promise<void> {
    this.dataQueue = this.dataQueue
      .catch(() => undefined)
      .then(() =>
        this.saveData({ language: this.language, drafts: this.drafts }),
      );
    return this.dataQueue;
  }
  async retainDraft(draft: Draft): Promise<void> {
    this.drafts[draft.folder] = draft;
    await this.saveSettings();
    new Notice(this.t("unsaved"));
  }
  async clearDraft(folder: string): Promise<void> {
    if (this.drafts[folder]) {
      delete this.drafts[folder];
      await this.saveSettings();
    }
  }
  report(error: unknown): void {
    new Notice(
      `${this.t(error instanceof BranchError ? error.code : "failure")}\n${error instanceof BranchError ? error.detail : String(error)}`,
      8000,
    );
  }
}
class BranchSettings extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: BranchNotePlugin,
  ) {
    super(app, plugin);
  }
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: this.plugin.t("language"),
        desc: this.plugin.t("languageDescription"),
        render: (setting) => {
          setting.addDropdown((dropdown) =>
            dropdown
              .addOption("zh", "中文")
              .addOption("en", "English")
              .setValue(this.plugin.language)
              .onChange(async (value) => {
                await this.plugin.setLanguage(value === "zh" ? "zh" : "en");
                this.update();
              }),
          );
        },
      },
    ];
  }
}
