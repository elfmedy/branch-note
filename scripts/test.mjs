import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["src/core.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".test-build/core.mjs",
});
const result = spawnSync(process.execPath, ["--test", "tests/core.test.mjs"], {
  stdio: "inherit",
});
process.exitCode = result.status ?? 1;
