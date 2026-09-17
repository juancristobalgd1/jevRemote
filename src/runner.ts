import type { Page } from "playwright";
import { detectClickableElements } from "./perception.js";
import { askChoice, TypeSafeApiError } from "./typesafe.js";
import type { ChoiceCriteria, DetectedElement } from "./types.js";

export interface RemoteLoopConfig {
  page: Page;
  apiKey: string;
  targetUrl: string;
  goal: string;
  maxSteps: number;
}

interface ChoiceOption {
  key: string;
  element: DetectedElement;
}

export async function runRemoteLoop({
  page,
  apiKey,
  targetUrl,
  goal,
  maxSteps,
}: RemoteLoopConfig): Promise<void> {
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const clickHistory: string[] = [];

  for (let step = 1; step <= maxSteps; step += 1) {
    const elements = await detectClickableElements(page);
    if (!elements.length) {
      console.log(`[done] No visible text-labelled clickable elements remain.`);
      return;
    }

    const options = makeChoiceOptions(elements);
    const criteria = createCriteria(options);
    const decision = await askChoice({
      apiKey,
      state: {
        goal,
        url: page.url(),
        click_history: clickHistory,
        visible_elements: elements.map(({ id, label, role, href }) => ({
          id,
          label,
          role,
          ...(href ? { href } : {}),
        })),
      },
      instructions: `Choose the single visible element to click next in order to achieve this goal: ${goal}. Return one of the provided options.`,
      criteria,
    });

    const selected = options.find(({ key }) => key === decision.choice);
    if (!selected) {
      throw new TypeSafeApiError(
        `TypeSafe selected an option that was not in the current screen: ${decision.choice}`,
        { latencyMs: decision.latencyMs },
      );
    }

    console.log(
      `[step ${step}/${maxSteps}] click="${selected.element.label}" ` +
        `confidence=${formatPercent(decision.confidence)} ` +
        `latency=${decision.latencyMs.toFixed(1)}ms`,
    );
    clickHistory.push(selected.element.label);

    const target = page.locator(`[data-jevremote-id="${selected.element.id}"]`);
    if ((await target.count()) !== 1) {
      throw new Error(`The selected element is no longer present in the page.`);
    }

    await target.click({ timeout: 10_000 });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 3_000 })
      .catch(() => undefined);
  }

  console.log(`[done] Reached MAX_STEPS=${maxSteps}.`);
}

export function makeChoiceOptions(elements: DetectedElement[]): ChoiceOption[] {
  const usedKeys = new Set<string>();

  return elements.map((element) => {
    let key = element.label;
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${element.label} [${suffix}]`;
      suffix += 1;
    }
    usedKeys.add(key);
    return { key, element };
  });
}

export function createCriteria(options: ChoiceOption[]): ChoiceCriteria {
  return Object.fromEntries(
    options.map(({ key, element }) => [
      key,
      `Visible ${element.role} labelled "${element.label}".`,
    ]),
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

