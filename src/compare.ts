import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const project = resolve(import.meta.dir, "..");
const fixtureDir = join(project, "fixtures");
const binary = process.env.BUNINBUN_BINARY ? resolve(process.env.BUNINBUN_BINARY) : null;
const version = await Bun.spawn([process.execPath, "--version"], { stdout: "pipe" }).stdout.text();
console.log(`Comparing against Bun ${version.trim()}`);
let mismatches = 0;
try {
  for (const name of (await readdir(fixtureDir)).filter(x => x.endsWith(".test.ts")).sort()) {
    const original = join(fixtureDir, name);
    async function execute(args: string[]) {
      // The only fixture intentionally tests selection; Bun disables .only in CI by default.
      const process = Bun.spawn(args, { cwd: project, stdout: "pipe", stderr: "pipe", env: { ...Bun.env, CI: "false", NO_COLOR: "1" } });
      const [stdout, stderr, exit] = await Promise.all([process.stdout.text(), process.stderr.text(), process.exited]);
      return { stdout, stderr, exit };
    }
    const [reference, candidate] = await Promise.all([
      execute([process.execPath, "test", original]),
      execute(binary ? [binary, "test", original] : [process.execPath, "run", join(project, "src", "cli.ts"), "test", original]),
    ]);
    const events = (s: string) => s.split(/\r?\n/).filter(line => line.startsWith("EVENT "));
    const counts = (s: string) => Object.fromEntries(["pass", "fail", "skip"].map(key => [key, Number(s.match(new RegExp(`(\\d+) ${key}\\b`))?.[1] ?? 0)]));
    const expected = { exit: reference.exit, events: events(reference.stdout), counts: counts(reference.stderr) };
    const actual = { exit: candidate.exit, events: events(candidate.stdout), counts: counts(candidate.stderr) };
    if (/Ran \d+ tests? across \d+ files?\./.test(reference.stderr) && /RESULT \d+ pass \d+ fail \d+ skip/.test(candidate.stderr) && JSON.stringify(expected) === JSON.stringify(actual)) console.log(`PASS ${name}`);
    else { mismatches++; console.error(`FAIL ${name}\n  Bun: ${JSON.stringify(expected)}\n  ours: ${JSON.stringify(actual)}\n  candidate stderr: ${candidate.stderr}`); }
  }
} finally { /* no fixture files are modified */ }
console.log(`${mismatches} fixture mismatch(es)`);
if (mismatches) process.exitCode = 1;
