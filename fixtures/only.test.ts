import { test } from "bun:test";
test("not selected", () => console.log("EVENT unselected"));
test.only("selected", () => console.log("EVENT selected"));
test.skip("skipped", () => console.log("EVENT skipped"));
