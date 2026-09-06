import { build, context } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
const watch = process.argv.includes("--watch");
await mkdir("dist", { recursive: true });
for (const name of ["manifest.json", "styles.css"])
  await copyFile(name, `dist/${name}`);
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  platform: "browser",
  target: "es2022",
  outfile: "dist/main.js",
  sourcemap: watch ? "inline" : false,
  minify: false,
  logLevel: "info",
};
if (watch) await (await context(options)).watch();
else await build(options);
