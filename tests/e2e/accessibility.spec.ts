import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 심사 지적: /technology(JS 시각화)와 인증·개인정보 화면이 한 번도 검사되지 않았다.
const PATHS = [
  "/",
  "/demo",
  "/demo?sample=1",
  "/why",
  "/how-it-works",
  "/technology",
  "/login",
  "/signup",
  "/privacy",
];
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

  // 분석 진행 화면은 2.4초만 떠 있어 위의 경로 스캔이 절대 닿지 않는다.
  // 실제로 이 사각지대에서 대비 위반(설명 글 2.45:1)이 한 번 들어왔다 나갔다 —
  // 화면이 살아 있는 동안 직접 멈춰 세워 검사한다.
  for (const theme of THEMES) {
    test(`분석 진행 화면 (${theme}) 에 심각한 접근성 위반이 없다`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
      await page.locator(".check-row input").first().check();
      await page.getByRole("button", { name: /샘플로 둘러보기|내 경험에서 시작하기/ }).click();
      await page.locator("#experience").waitFor({ timeout: 15_000 });
      await page.getByRole("button", { name: /가능성 찾기/ }).click();
      await page.locator(".analysis-progress").waitFor({ timeout: 5_000 });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .include(".analysis-progress")
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
});
