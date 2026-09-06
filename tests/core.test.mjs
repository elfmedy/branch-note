import test from "node:test";
import assert from "node:assert/strict";
import {
  BranchError,
  BranchService,
  homeOf,
  visibleChildren,
  validName,
} from "../.test-build/core.mjs";

// A strict, case-insensitive file system, including fault injection at mutation boundaries.
class MemoryFiles {
  nodes = new Map([["", { path: "", name: "", kind: "folder" }]]);
  failures = [];
  get(path) {
    return this.nodes.get(path);
  }
  children(path) {
    return [...this.nodes.values()].filter(
      (n) =>
        n.path &&
        n.path.slice(0, Math.max(0, n.path.lastIndexOf("/"))) === path,
    );
  }
  snapshot() {
    return JSON.stringify(
      [...this.nodes].sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  fail(op, path) {
    this.failures.push({ op, path });
  }
  check(op, path) {
    const i = this.failures.findIndex((f) => f.op === op && f.path === path);
    if (i >= 0) {
      this.failures.splice(i, 1);
      throw new Error(`Injected ${op}: ${path}`);
    }
  }
  vacant(path) {
    assert.ok(
      ![...this.nodes.keys()].some(
        (p) => p.toLowerCase() === path.toLowerCase(),
      ),
      `Occupied: ${path}`,
    );
    assert.equal(
      this.get(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "")
        ?.kind,
      "folder",
    );
  }
  async read(path) {
    assert.equal(this.get(path)?.kind, "file");
    return this.get(path).content;
  }
  async create(path, content) {
    this.check("create", path);
    this.vacant(path);
    this.nodes.set(path, {
      path,
      name: path.split("/").at(-1),
      kind: "file",
      content,
    });
  }
  async mkdir(path) {
    this.check("mkdir", path);
    this.vacant(path);
    this.nodes.set(path, {
      path,
      name: path.split("/").at(-1),
      kind: "folder",
    });
  }
  async rename(from, to) {
    this.check("rename", to);
    assert.ok(this.get(from));
    if (from.toLowerCase() !== to.toLowerCase()) this.vacant(to);
    const entries = [...this.nodes.values()].filter(
      (n) => n.path === from || n.path.startsWith(from + "/"),
    );
    for (const n of entries) this.nodes.delete(n.path);
    for (const n of entries) {
      const path = to + n.path.slice(from.length);
      this.nodes.set(path, { ...n, path, name: path.split("/").at(-1) });
    }
  }
  async trash(path) {
    this.check("trash", path);
    assert.equal(this.get(path)?.kind, "file");
    this.nodes.delete(path);
  }
  async removeEmpty(path) {
    this.check("removeEmpty", path);
    assert.equal(this.get(path)?.kind, "folder");
    assert.equal(this.children(path).length, 0);
    this.nodes.delete(path);
  }
}
const setup = () => {
  const fs = new MemoryFiles();
  return { fs, s: new BranchService(fs) };
};
const code = (name) => (e) => e instanceof BranchError && e.code === name;

test("same-name Markdown is automatically recognized; only its visible siblings count", async () => {
  const { fs } = setup();
  await fs.mkdir("A");
  assert.equal(homeOf(fs, "A"), undefined);
  await fs.create("A/A.md", "external");
  assert.equal(homeOf(fs, "A").path, "A/A.md");
  assert.deepEqual(visibleChildren(fs, "A"), []);
  await fs.create("A/B.md", "");
  assert.equal(visibleChildren(fs, "A")[0].name, "B.md");
});
test("folder child creation does not create a home", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  const r = await s.createChild("A", "Untitled");
  assert.equal(r.child, "A/Untitled.md");
  assert.equal(homeOf(fs, "A"), undefined);
});
test("promotion preserves Markdown bytes and creates an ordinary empty child", async () => {
  const { fs, s } = setup();
  const content = "---\n标签: 测试\n---\n# A\n[[B]]\n";
  await fs.create("A.md", content);
  const r = await s.createChild("A.md", "Untitled");
  assert.equal(await fs.read("A/A.md"), content);
  assert.equal(await fs.read(r.child), "");
  assert.equal(fs.get("A.md"), undefined);
  assert.equal(fs.get("A/Untitled"), undefined);
});
test("empty source promotes into an empty home", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "");
  await s.createChild("A.md", "Untitled");
  assert.equal(await fs.read("A/A.md"), "");
});
test("only a subsequent child action promotes the new note", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await s.createChild("A", "Untitled");
  await s.createChild("A/Untitled.md", "Untitled");
  assert.equal(await fs.read("A/Untitled/Untitled.md"), "");
  assert.equal(await fs.read("A/Untitled/Untitled 1.md"), "");
});
test("acting on an existing home adds a sibling, without nesting home again", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.create("A/A.md", "hello");
  const r = await s.createChild("A/A.md", "Untitled");
  assert.equal(r.child, "A/Untitled.md");
  assert.equal(fs.get("A/A"), undefined);
});
test("child naming reserves the home and avoids existing case-insensitive names", async () => {
  const { fs, s } = setup();
  await fs.mkdir("Untitled");
  await fs.create("Untitled/untitled 1.md", "keep");
  assert.equal(
    (await s.createChild("Untitled", "Untitled")).child,
    "Untitled/Untitled 2.md",
  );
});
test("Explicit start creates an empty home immediately and can undo before editing", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  const path = await s.createHome("A");
  assert.equal(path, "A/A.md");
  assert.equal(await fs.read(path), "");
  await s.undo();
  assert.equal(homeOf(fs, "A"), undefined);
  assert.ok(fs.get("A"));
});
test("Starting an existing empty or nonempty home never overwrites it", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.create("A/A.md", "");
  await s.createHome("A");
  assert.equal(await fs.read("A/A.md"), "");
  fs.get("A/A.md").content = "external";
  await s.createHome("A");
  assert.equal(await fs.read("A/A.md"), "external");
  assert.equal(s.canUndo, false);
});
test("Concurrent start actions reuse one home; undo protects subsequent text", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  const paths = await Promise.all([s.createHome("A"), s.createHome("A")]);
  assert.deepEqual(paths, ["A/A.md", "A/A.md"]);
  fs.get(paths[0]).content = "written in native editor";
  await assert.rejects(s.undo(), code("changed"));
  assert.equal(await fs.read(paths[0]), "written in native editor");
});
test("Home creation rejects an occupied directory path and can retry a failed write", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.mkdir("A/A.md");
  await assert.rejects(s.createHome("A"), code("conflict"));
  await fs.removeEmpty("A/A.md");
  fs.fail("create", "A/A.md");
  await assert.rejects(s.createHome("A"));
  assert.equal(s.canUndo, false);
  await s.createHome("A");
  assert.equal(await fs.read("A/A.md"), "");
});
test("promotion path conflict preserves every node", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  await fs.mkdir("A");
  const before = fs.snapshot();
  await assert.rejects(s.createChild("A.md", "Untitled"), code("conflict"));
  assert.equal(fs.snapshot(), before);
});
test("failed child creation rolls back both promotion steps", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  const before = fs.snapshot();
  fs.fail("create", "A/Untitled.md");
  await assert.rejects(s.createChild("A.md", "Untitled"));
  assert.equal(fs.snapshot(), before);
  assert.equal(s.canUndo, false);
});
test("failed source move removes the empty promotion folder", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  const before = fs.snapshot();
  fs.fail("rename", "A/A.md");
  await assert.rejects(s.createChild("A.md", "Untitled"));
  assert.equal(fs.snapshot(), before);
});
test("partial rollback is reported with surviving content intact", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  fs.fail("create", "A/Untitled.md");
  fs.fail("rename", "A.md");
  await assert.rejects(s.createChild("A.md", "Untitled"), code("partial"));
  assert.equal(await fs.read("A/A.md"), "original");
});
test("promotion undo is one action restoring original structure", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  const before = fs.snapshot();
  await s.createChild("A.md", "Untitled");
  await s.undo();
  assert.equal(fs.snapshot(), before);
  assert.equal(s.canUndo, false);
});
test("undo refuses to delete a child that has been edited", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  const r = await s.createChild("A.md", "Untitled");
  fs.get(r.child).content = "new work";
  const before = fs.snapshot();
  await assert.rejects(s.undo(), code("changed"));
  assert.equal(fs.snapshot(), before);
  assert.equal(s.canUndo, true);
});
test("undo refuses when new children exist or original path has been reused", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  await s.createChild("A.md", "Untitled");
  await fs.create("A/Other.md", "new");
  await assert.rejects(s.undo(), code("changed"));
  await fs.trash("A/Other.md");
  await fs.create("A.md", "other");
  await assert.rejects(s.undo(), code("conflict"));
  assert.equal(await fs.read("A.md"), "other");
});
test("failed promotion undo restores child and home and is retryable", async () => {
  const { fs, s } = setup();
  await fs.create("A.md", "original");
  await s.createChild("A.md", "Untitled");
  const before = fs.snapshot();
  fs.fail("removeEmpty", "A");
  await assert.rejects(s.undo());
  assert.equal(fs.snapshot(), before);
  await s.undo();
  assert.equal(await fs.read("A.md"), "original");
});
test("rename syncs home and descendants and supports undo", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.create("A/A.md", "body");
  await fs.create("A/Child.md", "child");
  const before = fs.snapshot();
  await s.renameFolder("A", "B");
  assert.equal(await fs.read("B/B.md"), "body");
  assert.equal(await fs.read("B/Child.md"), "child");
  await s.undo();
  assert.equal(fs.snapshot(), before);
});
test("rename does not create absent home and never adopts an unrelated child", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await s.renameFolder("A", "B");
  assert.equal(homeOf(fs, "B"), undefined);
  await fs.create("B/C.md", "child");
  const before = fs.snapshot();
  await assert.rejects(s.renameFolder("B", "C"), code("conflict"));
  assert.equal(fs.snapshot(), before);
});
test("failed folder rename restores old home name", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.create("A/A.md", "body");
  const before = fs.snapshot();
  fs.fail("rename", "B");
  await assert.rejects(s.renameFolder("A", "B"));
  assert.equal(fs.snapshot(), before);
});
test("external rename syncs home but stops on destination conflict", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.create("A/A.md", "body");
  await fs.rename("A", "B");
  await s.followExternalRename("A", "B");
  assert.equal(await fs.read("B/B.md"), "body");
  await fs.create("B/C.md", "child");
  await fs.rename("B", "C");
  await assert.rejects(s.followExternalRename("B", "C"), code("conflict"));
  assert.equal(await fs.read("C/B.md"), "body");
  assert.equal(await fs.read("C/C.md"), "child");
});
test("delete removes only home and undo restores content without replacing external files", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  await fs.create("A/A.md", "body");
  await fs.create("A/Child.md", "child");
  await s.deleteHome("A");
  assert.equal(homeOf(fs, "A"), undefined);
  assert.equal(await fs.read("A/Child.md"), "child");
  await fs.create("A/A.md", "external");
  await assert.rejects(s.undo(), code("conflict"));
  assert.equal(await fs.read("A/A.md"), "external");
  await fs.trash("A/A.md");
  await s.undo();
  assert.equal(await fs.read("A/A.md"), "body");
});
test("concurrent actions serialize unique child names", async () => {
  const { fs, s } = setup();
  await fs.mkdir("A");
  const results = await Promise.all(
    Array.from({ length: 8 }, () => s.createChild("A", "Untitled")),
  );
  assert.equal(new Set(results.map((r) => r.child)).size, 8);
  assert.equal(fs.children("A").length, 8);
});
test("portable names reject reserved characters and Windows devices", () => {
  for (const name of [
    "",
    " ",
    "A/B",
    "A\\B",
    "..",
    "con",
    "LPT1.md",
    "trail.",
    " leading",
    "trailing ",
  ])
    assert.equal(validName(name), false, name);
  for (const name of ["中文", "A B", "Project-1", "Note.md"])
    assert.equal(validName(name), true, name);
});
