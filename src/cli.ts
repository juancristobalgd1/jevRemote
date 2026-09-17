import { chromium } from "playwright";
import { runRemoteLoop } from "./runner.js";
import { TypeSafeApiError } from "./typesafe.js";

async function main(): Promise<void> {
  const apiKey = requiredEnv("TYPESAFE_API_KEY");
  const targetUrl = requiredEnv("TARGET_URL");
  const goal = requiredEnv("GOAL");
  const maxSteps = positiveInteger(process.env.MAX_STEPS || "5", "MAX_STEPS");
  const headless = process.env.HEADLESS !== "false";

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log(`[start] target=${targetUrl}`);
    console.log(`[start] goal=${goal}`);
    await runRemoteLoop({ page, apiKey, targetUrl, goal, maxSteps });
  } finally {
    await browser.close();
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

main().catch((error: unknown) => {
  if (error instanceof TypeSafeApiError) {
    const status = error.status ? ` HTTP ${error.status}` : "";
    const latency = error.latencyMs === undefined ? "" : ` latency=${error.latencyMs.toFixed(1)}ms`;
    console.error(`[error] TypeSafe API${status}${latency}: ${error.message}`);
  } else {
    console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exitCode = 1;
});

