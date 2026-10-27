import { test, describe, beforeEach, afterEach, expect } from "bun:test";
describe("async hooks", () => {
  beforeEach(async () => { await Promise.resolve(); console.log("EVENT before"); });
  afterEach(async () => { await Promise.resolve(); console.log("EVENT after"); });
  test("async pass", async () => { await Promise.resolve(); expect(1).toBe(1); console.log("EVENT pass"); });
  test("async reject", async () => { await Promise.resolve(); console.log("EVENT reject"); throw new Error("failure"); });
  test("still runs", () => console.log("EVENT next"));
});
