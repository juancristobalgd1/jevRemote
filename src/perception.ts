import type { Page } from "playwright";
import type { DetectedElement } from "./types.js";

export const CLICKABLE_SELECTOR = [
  "a[href]",
  "button",
  'input[type="button"]',
  'input[type="submit"]',
  '[role="button"]',
].join(",");

export function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function detectClickableElements(page: Page): Promise<DetectedElement[]> {
  return page.locator(CLICKABLE_SELECTOR).evaluateAll((elements) => {
    elements.forEach((element) => element.removeAttribute("data-jevremote-id"));
    const visible = elements.filter((element) => {
      const htmlElement = element as HTMLElement;
      const style = getComputedStyle(htmlElement);
      const rect = htmlElement.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        htmlElement.getAttribute("aria-hidden") !== "true"
      );
    });

    return visible.flatMap((element, index) => {
      const htmlElement = element as HTMLElement;
      const label = normalizeLabel(
        htmlElement.getAttribute("aria-label") ||
          htmlElement.innerText ||
          htmlElement.getAttribute("title") ||
          (htmlElement as HTMLInputElement).value ||
          htmlElement.querySelector("img[alt]")?.getAttribute("alt") ||
          "",
      );

      if (!label) return [];

      const id = `jevremote-${index}`;
      htmlElement.setAttribute("data-jevremote-id", id);
      return [
        {
          id,
          index,
          label,
          role: htmlElement.getAttribute("role") || htmlElement.tagName.toLowerCase(),
          ...(htmlElement instanceof HTMLAnchorElement && htmlElement.href
            ? { href: htmlElement.href }
            : {}),
        },
      ];
    });
  });
}
