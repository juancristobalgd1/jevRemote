export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ChoiceCriteria = Record<string, string | null>;

export interface ChoiceQuestion {
  type: "choice";
  instructions: string | JsonValue | JsonValue[];
  criteria: ChoiceCriteria;
}

export interface ChoiceRequest {
  state: JsonValue | Record<string, unknown>;
  model: "jev-latest";
  questions: Record<string, ChoiceQuestion>;
}

export interface DetectedElement {
  id: string;
  index: number;
  label: string;
  role: string;
  href?: string;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ChoiceDecision extends ChoiceAnswer {
  model: string;
  latencyMs: number;
}

