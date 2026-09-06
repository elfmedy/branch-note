import {
  ItemView,
  TFolder,
  type WorkspaceLeaf,
  type ViewStateResult,
} from "obsidian";
import type BranchNotePlugin from "./main";
export const HOME_VIEW = "branch-note-home";

// Keep 0.1.0 recovery data readable; writing now happens entirely in the native editor.
export interface Draft {
  folder: string;
  content: string;
  before: { path?: string; content: string };
}

export class HomeView extends ItemView {
  navigation = true;
  folder?: TFolder;
  private busy = false;
  constructor(
    leaf: WorkspaceLeaf,
    private plugin: BranchNotePlugin,
  ) {
    super(leaf);
  }
  getViewType(): string {
    return HOME_VIEW;
  }
  getDisplayText(): string {
    return this.folder?.name ?? "Branch Note";
  }
  getIcon(): string {
    return "file-text";
  }
  getState(): Record<string, unknown> {
    return { folder: this.folder?.path };
  }
  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const path = (state as { folder?: unknown })?.folder;
    const folder =
      typeof path === "string"
        ? this.app.vault.getAbstractFileByPath(path)
        : null;
    this.folder = folder instanceof TFolder ? folder : undefined;
    this.render();
    await super.setState(state, result);
  }
  render(): void {
    this.contentEl.empty();
    this.contentEl.addClass("bn-home");
    if (!this.folder) return;
    const body = this.contentEl.createDiv({ cls: "bn-home-body" });
    body.createEl("h1", { text: this.folder.name });
    body.createEl("p", {
      text: this.plugin.t("emptyDescription"),
      cls: "bn-home-description",
    });
    const start = body.createEl("button", {
      text: this.plugin.t("start"),
      cls: "mod-cta bn-start",
    });
    start.disabled = this.busy;
    start.addEventListener("click", () => {
      if (this.busy || !this.folder) return;
      this.busy = true;
      start.disabled = true;
      const folder = this.folder;
      void this.plugin.service
        .createHome(folder.path)
        .then(async (path) => {
          this.plugin.refresh();
          // Do not replace another page the user navigated to while the file was created.
          if (this.leaf.view === this && this.folder === folder)
            await this.plugin.openMarkdown(path, this.leaf);
        })
        .catch((error) => this.plugin.report(error))
        .finally(() => {
          this.busy = false;
          start.disabled = false;
        });
    });
  }
  updateLanguage(): void {
    this.contentEl
      .querySelector(".bn-home-description")
      ?.setText(this.plugin.t("emptyDescription"));
    this.contentEl.querySelector(".bn-start")?.setText(this.plugin.t("start"));
  }
}
