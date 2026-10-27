import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const binary = resolve(process.env.BUNINBUN_BINARY || (process.platform === "win32" ? "dist/buninbun.exe" : "dist/buninbun"));
const iterations = Number(process.env.BENCH_ITERATIONS || 20);
const warmups = Number(process.env.BENCH_WARMUPS || 3);
const count = Number(process.env.BENCH_TESTS || 1000);
if (![iterations, count].every(n => Number.isSafeInteger(n) && n > 0) || !Number.isSafeInteger(warmups) || warmups < 0) throw new Error("Benchmark counts must be integers; iterations and tests must be positive, warmups nonnegative");
const dir = await mkdtemp(join(tmpdir(), "buninbun-bench-"));
const file = join(dir, "workload.test.ts");
await writeFile(file, `import { test, expect } from "bun:test";\nfor (let i = 0; i < ${count}; i++) test('case ' + i, () => { expect(i + 1).toBe(i + 1); });\n`);
const commands = [["bun test", [process.execPath, "test", file]], ["bun test --dots", [process.execPath, "test", "--dots", file]], ["buninbun test", [binary, "test", file]]] as const;
const results: Record<string, number[]> = Object.fromEntries(commands.map(([label]) => [label, []]));
async function run(label: string, command: readonly string[]) {
  const start = performance.now();
  const child = Bun.spawn([...command], { stdout: "pipe", stderr: "pipe", env: { ...Bun.env, NO_COLOR: "1" } });
  const [stdout, stderr, code] = await Promise.all([child.stdout.text(), child.stderr.text(), child.exited]);
  const ms = performance.now() - start;
  if (code !== 0 || !new RegExp(`\\b${count} pass\\b`).test(stderr) || !/\b0 fail\b/.test(stderr)) throw new Error(`${label} failed validation (exit ${code}):\n${stdout}\n${stderr}`);
  return ms;
}
try {
  for (let i = 0; i < warmups + iterations; i++) {
    const order = [...commands.slice(i % commands.length), ...commands.slice(0, i % commands.length)];
    for (const [label, command] of order) { const ms = await run(label, command); if (i >= warmups) results[label]!.push(ms); }
  }
  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2; };
  const version = await Bun.spawn([process.execPath, "--version"], { stdout: "pipe" }).stdout.text();
  console.log(`Bun ${version.trim()} | ${process.platform}/${process.arch} | ${count} tests | ${warmups} warmups | ${iterations} samples`);
  for (const [label] of commands) console.log(`${label}: median ${median(results[label]!).toFixed(2)} ms (min ${Math.min(...results[label]!).toFixed(2)}, max ${Math.max(...results[label]!).toFixed(2)})`);
  console.log(`buninbun / bun median: ${(median(results["buninbun test"]!) / median(results["bun test"]!)).toFixed(2)}x`);
  console.log(`buninbun / bun --dots median: ${(median(results["buninbun test"]!) / median(results["bun test --dots"]!)).toFixed(2)}x`);
} finally { await rm(dir, { recursive: true, force: true }); }
