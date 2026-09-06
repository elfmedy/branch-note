export type Node = { path: string; name: string; kind: "file" | "folder" };
export interface FilePort {
  get(path: string): Node | undefined;
  children(path: string): Node[];
  read(path: string): Promise<string>;
  create(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  trash(path: string): Promise<void>;
  removeEmpty(path: string): Promise<void>;
}
export type Failure =
  | "conflict"
  | "missing"
  | "unsupported"
  | "invalidName"
  | "changed"
  | "partial";
export class BranchError extends Error {
  constructor(
    public code: Failure,
    public detail = "",
  ) {
    super(`${code}: ${detail}`);
  }
}
export const join = (parent: string, name: string): string =>
  parent && parent !== "/" ? `${parent}/${name}` : name;
export const basename = (path: string): string => path.split("/").at(-1) ?? "";
export const parentPath = (path: string): string =>
  path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
export const stem = (name: string): string => name.replace(/\.md$/i, "");
export const equalName = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();
export function validName(name: string): boolean {
  return (
    !!name.trim() &&
    name === name.trim() &&
    !/[\\/:*?"<>|]/.test(name) &&
    !name.split("").some((c) => c.charCodeAt(0) < 32) &&
    !/[. ]$/.test(name) &&
    name !== "." &&
    name !== ".." &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  );
}
export function homeOf(fs: FilePort, folder: string): Node | undefined {
  if (!folder || folder === "/" || fs.get(folder)?.kind !== "folder") return;
  return fs
    .children(folder)
    .find(
      (n) => n.kind === "file" && equalName(n.name, `${basename(folder)}.md`),
    );
}
export function pageFolder(fs: FilePort, path: string): string | undefined {
  if (fs.get(path)?.kind === "folder") return path;
  const parent = parentPath(path);
  return homeOf(fs, parent)?.path === path ? parent : undefined;
}
export function visibleChildren(fs: FilePort, folder: string): Node[] {
  const home = homeOf(fs, folder);
  return fs.children(folder).filter((n) => n.path !== home?.path);
}
function available(fs: FilePort, path: string, except?: string): void {
  if (
    fs
      .children(parentPath(path))
      .some((n) => n.path !== except && equalName(n.name, basename(path)))
  )
    throw new BranchError("conflict", path);
}
export class BranchService {
  private tail: Promise<unknown> = Promise.resolve();
  private history: (() => Promise<void>)[] = [];
  constructor(public fs: FilePort) {}
  get canUndo(): boolean {
    return this.history.length > 0;
  }
  drain(): Promise<unknown> {
    return this.tail;
  }
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const work = this.tail.then(fn);
    this.tail = work.catch(() => undefined);
    return work;
  }
  private remember(undo: () => Promise<void>): void {
    this.history = [...this.history.slice(-19), undo];
  }
  private async rollback(
    actions: (() => Promise<void>)[],
    error: unknown,
  ): Promise<never> {
    const failures: string[] = [];
    for (const action of actions.reverse()) {
      try {
        await action();
      } catch (e) {
        failures.push(String(e));
      }
    }
    if (failures.length)
      throw new BranchError(
        "partial",
        `${String(error)}; ${failures.join("; ")}`,
      );
    throw error;
  }
  createChild(
    path: string,
    untitled: string,
  ): Promise<{ child: string; folder: string }> {
    return this.serial(async () => {
      const node = this.fs.get(path);
      if (!node) throw new BranchError("missing", path);
      const owner = pageFolder(this.fs, path);
      const promote = node.kind === "file" && !owner;
      if (promote && !/\.md$/i.test(node.name))
        throw new BranchError("unsupported", path);
      const folder = owner ?? join(parentPath(path), stem(node.name));
      if (promote) {
        if (!validName(stem(node.name)))
          throw new BranchError("invalidName", node.name);
        available(this.fs, folder);
      }
      let child = join(folder, `${untitled}.md`),
        index = 1;
      while (
        equalName(basename(child), `${basename(folder)}.md`) ||
        this.fs.children(folder).some((n) => equalName(n.name, basename(child)))
      )
        child = join(folder, `${untitled} ${index++}.md`);
      const original = promote ? await this.fs.read(path) : "";
      const home = join(folder, node.name);
      const undo: (() => Promise<void>)[] = [];
      try {
        if (promote) {
          await this.fs.mkdir(folder);
          undo.push(() => this.fs.removeEmpty(folder));
          await this.fs.rename(path, home);
          undo.push(async () => {
            available(this.fs, path);
            await this.fs.rename(home, path);
          });
        }
        await this.fs.create(child, "");
      } catch (e) {
        return this.rollback(undo, e);
      }
      this.remember(async () => {
        if (
          this.fs.get(child)?.kind !== "file" ||
          (await this.fs.read(child)) !== ""
        )
          throw new BranchError("changed", child);
        if (promote) {
          if (
            this.fs
              .children(folder)
              .some((n) => n.path !== child && n.path !== home) ||
            this.fs.get(home)?.kind !== "file" ||
            (await this.fs.read(home)) !== original
          )
            throw new BranchError("changed", folder);
          available(this.fs, path);
        }
        await this.fs.trash(child);
        if (promote) {
          try {
            await this.fs.rename(home, path);
            await this.fs.removeEmpty(folder);
          } catch (e) {
            // Recover only into empty paths; never replace external changes.
            const restore: (() => Promise<void>)[] = [];
            if (this.fs.get(path) && !this.fs.get(home))
              restore.push(() => this.fs.rename(path, home));
            restore.unshift(() => this.fs.create(child, ""));
            return this.rollback(restore, e);
          }
        }
      });
      return { child, folder };
    });
  }
  createHome(folder: string): Promise<string> {
    return this.serial(async () => {
      if (!folder || folder === "/" || this.fs.get(folder)?.kind !== "folder")
        throw new BranchError("missing", folder);
      const home = homeOf(this.fs, folder);
      if (home) return home.path;
      const path = join(folder, `${basename(folder)}.md`);
      available(this.fs, path);
      await this.fs.create(path, "");
      this.remember(async () => {
        if (
          this.fs.get(path)?.kind !== "file" ||
          (await this.fs.read(path)) !== ""
        )
          throw new BranchError("changed", path);
        await this.fs.trash(path);
      });
      return path;
    });
  }
  renameFolder(from: string, to: string, remember = true): Promise<void> {
    return this.serial(() => this.moveFolder(from, to, remember));
  }
  private async moveFolder(
    from: string,
    to: string,
    remember: boolean,
  ): Promise<void> {
    if (from === to) return;
    if (!from || from === "/" || this.fs.get(from)?.kind !== "folder")
      throw new BranchError("missing", from);
    if (!validName(basename(to)) || to.startsWith(`${from}/`))
      throw new BranchError("invalidName", to);
    available(this.fs, to, from);
    const home = homeOf(this.fs, from),
      nextHome = join(from, `${basename(to)}.md`);
    // Reserve the new home even if one does not yet exist, to avoid swallowing an unrelated child.
    available(this.fs, nextHome, home?.path);
    const undo: (() => Promise<void>)[] = [];
    try {
      if (home && home.path !== nextHome) {
        await this.fs.rename(home.path, nextHome);
        undo.push(() => this.fs.rename(nextHome, home.path));
      }
      await this.fs.rename(from, to);
    } catch (e) {
      return this.rollback(undo, e);
    }
    if (remember) this.remember(() => this.moveFolder(to, from, false));
  }
  followExternalRename(from: string, to: string): Promise<void> {
    return this.serial(async () => {
      if (basename(from) === basename(to) || this.fs.get(to)?.kind !== "folder")
        return;
      const oldHome = this.fs
        .children(to)
        .find(
          (n) => n.kind === "file" && equalName(n.name, `${basename(from)}.md`),
        );
      if (!oldHome) return;
      const destination = join(to, `${basename(to)}.md`);
      available(this.fs, destination, oldHome.path);
      if (oldHome.path !== destination)
        await this.fs.rename(oldHome.path, destination);
    });
  }
  deleteHome(folder: string): Promise<void> {
    return this.serial(async () => {
      const home = homeOf(this.fs, folder);
      if (!home) throw new BranchError("missing", folder);
      const content = await this.fs.read(home.path);
      await this.fs.trash(home.path);
      this.remember(async () => {
        if (this.fs.get(folder)?.kind !== "folder")
          throw new BranchError("missing", folder);
        available(this.fs, home.path);
        await this.fs.create(home.path, content);
      });
    });
  }
  undo(): Promise<void> {
    return this.serial(async () => {
      const undo = this.history.at(-1);
      if (!undo) return;
      await undo();
      this.history.pop();
    });
  }
}
