import { test, expect } from "@playwright/test";

test.describe("주요 화면 스크린샷", () => {
  test("홈페이지", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page).toHaveScreenshot("home.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
  });

  test("데모 게이트", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "networkidle" });
    await expect(page).toHaveScreenshot("demo-gate.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
  });

  test("샘플 여정 시작 화면", async ({ page }) => {
    await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
    await expect(page).toHaveScreenshot("demo-sample-start.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
  });
});
