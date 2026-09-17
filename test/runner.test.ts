import assert from "node:assert/strict";
import test from "node:test";
import { makeChoiceOptions } from "../src/runner.js";

test("makeChoiceOptions keeps duplicate labels addressable", () => {
  const options = makeChoiceOptions([
    { id: "a", index: 0, label: "Continue", role: "button" },
    { id: "b", index: 1, label: "Continue", role: "button" },
    { id: "c", index: 2, label: "Continue [2]", role: "a" },
  ]);

  assert.deepEqual(options.map(({ key }) => key), [
    "Continue",
    "Continue [2]",
    "Continue [2] [2]",
  ]);
});

