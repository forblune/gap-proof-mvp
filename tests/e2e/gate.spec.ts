import { test, expect } from "@playwright/test";

test.describe("접근 코드 게이트", () => {
  test("게이트 화면이 기본으로 노출된다", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "networkidle" });
    await expect(page.locator("#gate-code")).toBeVisible();
    await expect(page.getByRole("button", { name: "데모 열기" })).toBeDisabled();
  });

  test("잘못된 코드는 오류 메시지를 표시하고 게이트를 유지한다", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "networkidle" });
    await page.locator("#gate-code").fill("wrong-code-xyz");
    await expect(page.getByRole("button", { name: "데모 열기" })).toBeEnabled();
    await page.getByRole("button", { name: "데모 열기" }).click();
    await expect(page.locator(".notice.error")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#gate-code")).toBeVisible();
  });

  test("코드 없이 샘플 둘러보기 버튼으로 게이트를 우회할 수 있다", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "코드 없이 샘플 둘러보기" }).click();
    await expect(page.locator("#gate-code")).toHaveCount(0);
    await expect(page.locator(".hero, .page-shell")).toBeVisible();
  });

  test("?sample=1 로 직접 접근 시 게이트 없이 샘플 모드로 진입한다", async ({ page }) => {
    await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
    await expect(page.locator("#gate-code")).toHaveCount(0);
  });
});
