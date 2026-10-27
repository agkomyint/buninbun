import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
const log = (s: string) => console.log(`EVENT ${s}`);
describe("outer", () => {
  beforeAll(() => log("outer beforeAll"));
  afterAll(() => log("outer afterAll"));
  beforeEach(() => log("outer beforeEach"));
  afterEach(() => log("outer afterEach"));
  test("values", () => { expect(2 + 2).toBe(4); expect({ a: [1, 2] }).toEqual({ a: [1, 2] }); expect("hello").toContain("ell"); log("values"); });
  describe("inner", () => {
    beforeEach(() => log("inner beforeEach"));
    afterEach(() => log("inner afterEach"));
    test("async", async () => { await Promise.resolve(); expect(false).toBeFalsy(); expect(true).not.toBeFalsy(); log("async"); });
  });
  test.skip("skipped", () => log("should not run"));
});
