import { TFile, TFolder, type App, type TAbstractFile } from "obsidian";
import { BranchError, homeOf, type FilePort, type Node } from "./core";

export class ObsidianFiles implements FilePort {
  constructor(
    private app: App,
    private move: (file: TAbstractFile, to: string) => Promise<void>,
  ) {}
  get(path: string): Node | undefined {
    const file = this.app.vault.getAbstractFileByPath(path || "/");
    return file
      ? {
          path: file.path,
          name: file.name,
          kind: file instanceof TFolder ? "folder" : "file",
        }
      : undefined;
  }
  children(path: string): Node[] {
    const folder = this.app.vault.getAbstractFileByPath(path || "/");
    return folder instanceof TFolder
      ? folder.children.map((file) => ({
          path: file.path,
          name: file.name,
          kind: file instanceof TFolder ? "folder" : "file",
        }))
      : [];
  }
  private file(path: string): TFile {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new BranchError("missing", path);
    return file;
  }
  read(path: string): Promise<string> {
    return this.app.vault.read(this.file(path));
  }
  async create(path: string, content: string): Promise<void> {
    await this.app.vault.create(path, content);
  }
  async mkdir(path: string): Promise<void> {
    await this.app.vault.createFolder(path);
  }
  async rename(from: string, to: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(from);
    if (!file) throw new BranchError("missing", from);
    await this.move(file, to);
  }
  async trash(path: string): Promise<void> {
    await this.app.fileManager.trashFile(this.file(path));
  }
  async removeEmpty(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!(folder instanceof TFolder) || folder.children.length)
      throw new BranchError("changed", path);
    await this.app.fileManager.trashFile(folder);
  }
}
export interface ExplorerItem {
  file: TAbstractFile;
  selfEl: HTMLElement;
  collapsed?: boolean;
  setCollapsed?(value: boolean): Promise<void>;
  onSelfClick?(event: MouseEvent): void;
}
export interface Explorer {
  containerEl: HTMLElement;
  fileItems: Record<string, ExplorerItem>;
  getSortedFolderItems(folder: TFolder): ExplorerItem[];
  requestSort(): void;
  fileBeingRenamed?: TAbstractFile | null;
}
export function isExplorer(value: unknown): value is Explorer {
  const view = value as Partial<Explorer> | null;
  return (
    !!view?.containerEl &&
    !!view.fileItems &&
    typeof view.getSortedFolderItems === "function" &&
    typeof view.requestSort === "function"
  );
}
export function filterHomes(view: Explorer, fs: FilePort): () => void {
  // Keep the exact wrapper identity for cleanup; delegate with the original receiver.
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Call with the original receiver and retain method identity for cleanup.
  const previous = view.getSortedFolderItems,
    own = Object.hasOwn(view, "getSortedFolderItems");
  let active = true;
  function filtered(this: Explorer, folder: TFolder): ExplorerItem[] {
    const items = previous.call(this, folder);
    if (!active) return items;
    const home = homeOf(fs, folder.path);
    return home ? items.filter((item) => item.file.path !== home.path) : items;
  }
  view.getSortedFolderItems = filtered;
  view.requestSort();
  return () => {
    active = false;
    if (view.getSortedFolderItems === filtered) {
      if (own) view.getSortedFolderItems = previous;
      else delete (view as Partial<Explorer>).getSortedFolderItems;
    }
    view.requestSort();
  };
}
