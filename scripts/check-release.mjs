import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const m = read("manifest.json");
assert.equal(m.id, "branch-note");
assert.equal(m.name, "Branch Note");
assert.match(m.version, /^\d+\.\d+\.\d+$/);
assert.match(m.minAppVersion, /^\d+\.\d+\.\d+$/);
assert.equal(m.version, read("package.json").version);
assert.equal(m.version, read("package-lock.json").version);
assert.equal(m.version, read("package-lock.json").packages[""].version);
assert.equal(typeof m.isDesktopOnly, "boolean");
assert.ok(typeof m.author === "string" && m.author.trim());
assert.equal(read("package.json").license, "MIT");
assert.equal(read("versions.json")[m.version], m.minAppVersion);
assert.ok(m.description.length <= 250 && m.description.endsWith("."));
for (const file of ["README.md", "LICENSE", "styles.css", "PUBLISHING.md", "COMPATIBILITY.md", "VALIDATION.md", "CHANGELOG.md"])
  assert.ok(readFileSync(file, "utf8").trim());
if (process.env.GITHUB_REF_TYPE === "tag")
  assert.equal(
    process.env.GITHUB_REF_NAME,
    m.version,
    "Use a version tag without a v prefix",
  );
console.log(`Release metadata verified: ${m.id} ${m.version}`);
