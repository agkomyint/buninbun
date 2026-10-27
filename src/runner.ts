import { isDeepStrictEqual } from "node:util";

type Fn = () => unknown | Promise<unknown>;
type Test = { name: string; fn: Fn; mode: "run" | "skip" | "only" };
type Suite = { name: string; entries: (Suite | Test)[]; beforeAll: Fn[]; afterAll: Fn[]; beforeEach: Fn[]; afterEach: Fn[] };
const makeSuite = (name: string): Suite => ({ name, entries: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] });
const root = makeSuite("");
let current = root;
export function describe(name: string, fn: () => void) {
  const child = makeSuite(name); current.entries.push(child);
  const previous = current; current = child;
  try { fn(); } finally { current = previous; }
}
const add = (mode: Test["mode"]) => (name: string, fn: Fn = () => {}) => { current.entries.push({ name, fn, mode }); };
export const test = Object.assign(add("run"), { skip: add("skip"), only: add("only") });
export const it = test;
export const beforeAll = (fn: Fn) => { current.beforeAll.push(fn); };
export const afterAll = (fn: Fn) => { current.afterAll.push(fn); };
export const beforeEach = (fn: Fn) => { current.beforeEach.push(fn); };
export const afterEach = (fn: Fn) => { current.afterEach.push(fn); };

class Matchers {
  constructor(private actual: unknown, private negated = false) {}
  private check(value: boolean, name: string) { if (value === this.negated) throw new Error(`Assertion failed: ${this.negated ? "not " : ""}${name}`); }
  toBe(expected: unknown) { this.check(Object.is(this.actual, expected), "toBe"); }
  toEqual(expected: unknown) { this.check(isDeepStrictEqual(this.actual, expected), "toEqual"); }
  toBeTruthy() { this.check(Boolean(this.actual), "toBeTruthy"); }
  toBeFalsy() { this.check(!this.actual, "toBeFalsy"); }
  toContain(expected: unknown) { this.check(typeof this.actual === "string" ? this.actual.includes(String(expected)) : Array.isArray(this.actual) && this.actual.includes(expected), "toContain"); }
  toThrow(expected?: string | RegExp) {
        if (typeof this.actual !== "function") throw new Error("toThrow requires a function");
        let thrown: unknown; let didThrow = false;
        try { this.actual(); } catch (error) { didThrow = true; thrown = error; }
        const message = thrown instanceof Error ? thrown.message : String(thrown);
        this.check(didThrow && (expected === undefined || (typeof expected === "string" ? message.includes(expected) : expected.test(message))), "toThrow");
  }
  get not() { return new Matchers(this.actual, !this.negated); }
}
export function expect(actual: unknown) { return new Matchers(actual); }
function isThenable(value: unknown): value is PromiseLike<unknown> { return value != null && (typeof value === "object" || typeof value === "function") && typeof (value as PromiseLike<unknown>).then === "function"; }
function hasTest(s: Suite, predicate: (test: Test) => boolean): boolean {
  for (const entry of s.entries) if ("entries" in entry ? hasTest(entry, predicate) : predicate(entry)) return true;
  return false;
}
function countSkipped(s: Suite): number {
  let count = 0;
  for (const entry of s.entries) count += "entries" in entry ? countSkipped(entry) : Number(entry.mode === "skip");
  return count;
}
export async function run() {
  const only = hasTest(root, t => t.mode === "only");
  let passed = 0, failed = 0, skipped = 0;
  async function visit(s: Suite, parents: Suite[]) {
    const active = hasTest(s, t => t.mode !== "skip" && (!only || t.mode === "only"));
    if (!active) { if (!only) skipped += countSkipped(s); return; }
    for (const hook of s.beforeAll) { const result = hook(); if (isThenable(result)) await result; }
    const before = [...parents, s].flatMap(suite => suite.beforeEach);
    const after = [s, ...parents.slice().reverse()].flatMap(suite => suite.afterEach);
    for (const entry of s.entries) {
      if ("entries" in entry) { await visit(entry, [...parents, s]); continue; }
      if (entry.mode === "skip") { if (!only) skipped++; continue; }
      if (only && entry.mode !== "only") continue;
      let error: unknown; let hasError = false;
      try { for (const hook of before) { const result = hook(); if (isThenable(result)) await result; } const result = entry.fn(); if (isThenable(result)) await result; }
      catch (e) { error = e; hasError = true; }
      finally { try { for (const hook of after) { const result = hook(); if (isThenable(result)) await result; } } catch (e) { if (!hasError) error = e; hasError = true; } }
      if (hasError) { failed++; console.error(`FAIL ${entry.name}: ${error}`); } else passed++;
    }
    for (const hook of s.afterAll) { const result = hook(); if (isThenable(result)) await result; }
  }
  try { await visit(root, []); } catch (error) { failed++; console.error(error); }
  console.error(`RESULT ${passed} pass ${failed} fail ${skipped} skip`);
  return failed ? 1 : 0;
}
