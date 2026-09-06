import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const bundle = readFileSync("dist/main.js", "utf8");
const requires = [...bundle.matchAll(/\brequire\(["']([^"']+)["']\)/g)].map(
  (m) => m[1],
);
assert.deepEqual(
  [...new Set(requires)],
  ["obsidian"],
  "Production must import only Obsidian",
);
assert.ok(
  !/\binnerHTML\b|\bfetch\s*\(|\bXMLHttpRequest\b|\beval\s*\(|sourceMappingURL/.test(
    bundle,
  ),
  "Unexpected runtime content or source map",
);
assert.deepEqual(readdirSync("dist").sort(), [
  "main.js",
  "manifest.json",
  "styles.css",
]);
for (const file of ["manifest.json", "styles.css"])
  assert.equal(
    readFileSync(`dist/${file}`, "utf8"),
    readFileSync(file, "utf8"),
  );
console.log(
  "Production bundle verified: only Obsidian external; exactly three matching release assets.",
);
