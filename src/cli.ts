import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import * as runner from "./runner.ts";
const args = process.argv.slice(2);
if (args[0] === "test") args.shift();
if (args.length !== 1 || args[0]?.startsWith("-")) { console.error("Usage: buninbun test <test-file>"); process.exit(2); }
Bun.plugin({ name: "buninbun-test", setup(build) {
  build.onLoad({ filter: /\.[cm]?[jt]sx?$/, namespace: "file" }, async ({ path }) => ({ contents: (await readFile(path, "utf8")).replace(/(["'])bun:test\1/g, '$1buninbun:test$1'), loader: path.endsWith(".tsx") ? "tsx" : path.endsWith(".jsx") ? "jsx" : path.endsWith(".ts") ? "ts" : "js" }));
  build.onResolve({ filter: /^buninbun:test$/ }, () => ({ path: "test-api", namespace: "buninbun" }));
  build.onLoad({ filter: /.*/, namespace: "buninbun" }, () => ({ loader: "object", exports: runner }));
} });
try { await import(pathToFileURL(resolve(args[0]!)).href); process.exitCode = await runner.run(); }
catch (error) { console.error(error); process.exitCode = 1; }
