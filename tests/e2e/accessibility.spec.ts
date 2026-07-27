import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PATHS = ["/", "/demo", "/why", "/how-it-works"];
const THEMES = ["light", "dark"] as const;

test.describe("접근성 검사 (axe-core)", () => {
  for (const path of PATHS) {
    for (const theme of THEMES) {
      test(`${path} (${theme}) 에 심각한 접근성 위반이 없다`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path, { waitUntil: "networkidle" });
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();

        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          serious,
          serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}건)`).join("\n"),
        ).toEqual([]);
      });
    }
  }
});
