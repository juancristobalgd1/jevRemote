import assert from "node:assert/strict";
import test from "node:test";
import {
  askChoice,
  buildChoiceQuestion,
  parseChoiceDecision,
  TYPESAFE_ENDPOINT,
} from "../src/typesafe.js";

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

test("askChoice sends the documented HTTP request shape", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      model: "jev-latest",
      answers: {
        next_element: {
          type: "choice",
          choice: "Open",
          probabilities: { Open: 0.75, Save: 0.25 },
          confidence: 0.7,
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await askChoice({
    apiKey: "test-key",
    state: { goal: "Open" },
    instructions: "Pick one",
    criteria: { Open: null, Save: null },
    fetchImpl,
  });
  const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;

  assert.equal(requestUrl, TYPESAFE_ENDPOINT);
  assert.equal(requestInit?.method, "POST");
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, "Bearer test-key");
  assert.equal((requestInit?.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.deepEqual(body, {
    state: { goal: "Open" },
    model: "jev-latest",
    questions: {
      next_element: {
        type: "choice",
        instructions: "Pick one",
        criteria: { Open: null, Save: null },
      },
    },
  });
  assert.equal(result.choice, "Open");
  assert.equal(result.confidence, 0.7);
  assert.equal(result.latencyMs >= 0, true);
});
