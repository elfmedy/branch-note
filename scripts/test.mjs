import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["src/core.ts", "src/i18n.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".test-build",
  outExtension: { ".js": ".mjs" },
});
const result = spawnSync(
  process.execPath,
  ["--test", "tests/core.test.mjs", "tests/i18n.test.mjs"],
  {
    stdio: "inherit",
  },
);
process.exitCode = result.status ?? 1;
