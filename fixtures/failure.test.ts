import { test, expect } from "bun:test";
test("pass", () => { expect(() => { throw new Error("boom"); }).toThrow("boom"); console.log("EVENT pass"); });
test("failure", () => { console.log("EVENT failure"); expect(1).toBe(2); });
test("after failure", () => { console.log("EVENT after failure"); expect([1, 2]).toContain(2); });
