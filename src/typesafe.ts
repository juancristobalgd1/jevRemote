import type {
  ChoiceAnswer,
  ChoiceCriteria,
  ChoiceDecision,
  ChoiceQuestion,
  ChoiceRequest,
  JsonValue,
} from "./types.js";

export const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

type FetchLike = typeof fetch;

export interface AskChoiceInput {
  apiKey: string;
  state: JsonValue | Record<string, unknown>;
  instructions: string;
  criteria: ChoiceCriteria;
  fetchImpl?: FetchLike;
}

export class TypeSafeApiError extends Error {
  readonly status?: number;
  readonly body?: unknown;
  readonly latencyMs?: number;

  constructor(
    message: string,
    options: { status?: number; body?: unknown; latencyMs?: number } = {},
  ) {
    super(message);
    this.name = "TypeSafeApiError";
    this.status = options.status;
    this.body = options.body;
    this.latencyMs = options.latencyMs;
  }
}

export function buildChoiceQuestion(
  instructions: string,
  criteria: ChoiceCriteria,
): ChoiceQuestion {
  return { type: "choice", instructions, criteria };
}

export async function askChoice({
  apiKey,
  state,
  instructions,
  criteria,
  fetchImpl = globalThis.fetch,
}: AskChoiceInput): Promise<ChoiceDecision> {
  if (!apiKey.trim()) {
    throw new TypeSafeApiError("TYPESAFE_API_KEY is required.");
  }

  const request: ChoiceRequest = {
    state,
    model: "jev-latest",
    questions: {
      next_element: buildChoiceQuestion(instructions, criteria),
    },
  };
  const startedAt = performance.now();

  let response: Response;
  try {
    response = await fetchImpl(TYPESAFE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new TypeSafeApiError("Could not reach the TypeSafe API.", {
      latencyMs: performance.now() - startedAt,
    });
  }

  const latencyMs = performance.now() - startedAt;
  const body = await readResponseBody(response);
  if (!response.ok) {
    throw new TypeSafeApiError(`TypeSafe API returned HTTP ${response.status}.`, {
      status: response.status,
      body,
      latencyMs,
    });
  }

  return parseChoiceDecision(body, latencyMs);
}

export function parseChoiceDecision(
  body: unknown,
  latencyMs: number,
): ChoiceDecision {
  const root = asRecord(body);
  const answers = asRecord(root.answers);
  const answer = asRecord(answers.next_element);

  if (answer.type !== "choice") {
    throw new TypeSafeApiError("TypeSafe returned a non-choice answer.", {
      body,
      latencyMs,
    });
  }

  const choice = answer.choice;
  const confidence = answer.confidence;
  const probabilities = asRecord(answer.probabilities);
  if (
    typeof choice !== "string" ||
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    Object.values(probabilities).some(
      (probability) => typeof probability !== "number" || !Number.isFinite(probability),
    )
  ) {
    throw new TypeSafeApiError("TypeSafe returned an invalid choice answer.", {
      body,
      latencyMs,
    });
  }

  const parsedAnswer: ChoiceAnswer = {
    type: "choice",
    choice,
    probabilities: probabilities as Record<string, number>,
    confidence,
  };

  return {
    ...parsedAnswer,
    model: typeof root.model === "string" ? root.model : "unknown",
    latencyMs,
  };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

