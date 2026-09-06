import { Modal } from "obsidian";
import type BranchNotePlugin from "./main";

/** Recovery never depends on the original folder still existing. */
export class RecoveryModal extends Modal {
  constructor(private plugin: BranchNotePlugin) {
    super(plugin.app);
  }
  onOpen(): void {
    this.setTitle(this.plugin.t("recover"));
    this.contentEl.addClass("bn-recovery");
    this.contentEl.createEl("p", { text: this.plugin.t("recoveryHelp") });
    for (const draft of Object.values(this.plugin.drafts)) {
      this.contentEl.createEl("h3", { text: draft.folder });
      const field = this.contentEl.createEl("textarea", {
        attr: { "aria-label": draft.folder, readonly: "" },
      });
      field.value = draft.content;
      this.contentEl
        .createEl("button", { text: this.plugin.t("selectText") })
        .addEventListener("click", () => {
          field.focus();
          field.select();
        });
    }
  }
  onClose(): void {
    this.contentEl.empty();
  }
}
