import { test, expect } from "@playwright/test";
import { confirmFirstClaim, goToLookIntoStep, reachClaimStep } from "./journey";

test.describe("주요 사용자 흐름 (샘플 여정)", () => {
  test("샘플 데이터로 전체 여정을 완주한다", async ({ page }) => {
    await reachClaimStep(page);
    expect(await page.locator(".sample-badge").first().textContent()).toContain("샘플");

    await confirmFirstClaim(page);
    await goToLookIntoStep(page);
    await expect(page.getByText("먼저 검색해보기 · 배워보기")).toBeVisible();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await page.getByRole("button", { name: /GapProof 만들기/ }).click();

    await expect(page.locator(".personal-proof")).toBeVisible({ timeout: 10_000 });
  });

  test("여정에서 나가면 게이트로 복귀하고 draft를 오염시키지 않는다", async ({ page }) => {
    await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
    // 첫 렌더가 늦을 수 있어 요소가 보인 뒤에 조작한다(빈 화면 상대로 타임아웃나던 문제).
  const consentInput = page.locator(".check-row input").first();
  await expect(consentInput).toBeVisible({ timeout: 20_000 });
  await consentInput.check();
    await page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();

    const draftBefore = await page.evaluate(() => window.localStorage.getItem("gp_draft_v1"));
    expect(draftBefore).toBeNull();

    await page.getByRole("button", { name: /체험 나가기/ }).click();
    await expect(page.locator("#gate-code")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "코드 없이 샘플 둘러보기" })).toBeVisible();
  });
});
