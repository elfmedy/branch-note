import { spawnSync } from "node:child_process";
for (const args of [
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  ["node_modules/eslint/bin/eslint.js", "src", "--max-warnings=0"],
  ["scripts/test.mjs"],
  ["scripts/check-release.mjs"],
  ["esbuild.config.mjs"],
  ["scripts/check-bundle.mjs"],
]) {
  console.log(`Checking: ${args.join(" ")}`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
