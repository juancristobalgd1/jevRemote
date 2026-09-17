import assert from "node:assert/strict";
import test from "node:test";
import { buildChoiceQuestion, parseChoiceDecision } from "../src/typesafe.js";

test("buildChoiceQuestion preserves the typed choice contract", () => {
  assert.deepEqual(
    buildChoiceQuestion("Pick the next action", { Open: null, Save: "Persist the work" }),
    {
      type: "choice",
      instructions: "Pick the next action",
      criteria: { Open: null, Save: "Persist the work" },
    },
  );
});

test("parseChoiceDecision reads choice, probabilities, confidence and latency", () => {
  assert.deepEqual(
    parseChoiceDecision(
      {
        model: "jev-latest",
        answers: {
          next_element: {
            type: "choice",
            choice: "Open",
            probabilities: { Open: 0.9, Save: 0.1 },
            confidence: 0.8,
          },
        },
      },
      91.4,
    ),
    {
      model: "jev-latest",
      type: "choice",
      choice: "Open",
      probabilities: { Open: 0.9, Save: 0.1 },
      confidence: 0.8,
      latencyMs: 91.4,
    },
  );
});

