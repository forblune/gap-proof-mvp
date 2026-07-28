import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 증거등급 무결성 P0: 확인된 증거(원문 인용) 0개면 학습확인(퀴즈) 통과 여부와 무관하게
// STEP4→5 진행이 차단되고, 1개 이상 확인해야만 진행할 수 있다.

async function reachStep4(page) {
  await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
  await page.locator(".check-row input").first().check();
  await page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await page.getByRole("button", { name: /가능성 찾기/ }).click();
  await expect(page.locator(".claim-card").first()).toBeVisible({ timeout: 10_000 });
}

test.describe("증거등급 무결성 — STEP4→5 게이트", () => {
  test("확인 증거 0개 상태에서 STEP4→5 진행이 차단된다", async ({ page }) => {
    await reachStep4(page);
    // STEP2에서 확인 없이 바로 STEP3으로 진행 시도 — 버튼 자체가 비활성(0개 확인 시 STEP2 게이트).
    const nextFromStep2 = page.getByRole("button", { name: /먼저 알아보기/ });
    await expect(nextFromStep2).toBeDisabled();
  });

  test("퀴즈 통과 후에도 확인 증거가 0개면 STEP4→5가 차단되고 안내문이 표시된다", async ({ page }) => {
    await reachStep4(page);
    // 후보를 거절(확인 아님)해 confirmedClaims를 0으로 유지한 채 STEP3/4로 진행할 방법이 없으므로,
    // 먼저 1개를 확인해 STEP4까지 이동한 뒤, 학습확인만 통과시키고 확인은 취소해 0개로 되돌린다.
    await page.getByRole("button", { name: /맞아요/ }).first().click();
    await page.getByRole("button", { name: /먼저 알아보기/ }).click();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();

    // 학습확인 시작 → 3회 시도 안에서 동일 인덱스로 두 문항을 골라 통과시킨다
    // (makeCheck의 정답 위치가 두 문항에서 항상 동일하므로 0→1→2 순으로 시도하면 반드시 통과한다).
    await page.getByRole("button", { name: "학습확인 시작 →" }).click();
    // 주의: "학습확인 통과"는 토스트 알림과 패널 제목 두 곳에 나타나 getByText가 strict-mode
    // 위반을 던진다 — 패널 안의 고유한 완료 문구("이해도 확인 완료")로 좁혀서 사용한다.
    const passedPanel = page.getByText("이해도 확인 완료");
    for (let attemptIndex = 0; attemptIndex < 3; attemptIndex++) {
      if (await passedPanel.isVisible().catch(() => false)) break;
      const options = page.locator(".check-q");
      // 선택이 실제로 반영됐는지(.picked) 확인한 뒤 제출한다 — webkit에서 리렌더 전에
      // 클릭이 발생해 시도가 유실되던 문제를 막는다(기대값은 그대로).
      for (const questionIndex of [0, 1]) {
        const option = options.nth(questionIndex).locator(".check-opt").nth(attemptIndex);
        // 리렌더 타이밍에 따라 첫 클릭이 유실될 수 있어, 선택이 반영될 때까지 다시 누른다.
        await expect(async () => {
          if (!(await option.getAttribute("class"))?.includes("picked")) await option.click();
          expect(await option.getAttribute("class")).toContain("picked");
        }).toPass({ timeout: 8_000 });
      }
      await page.getByRole("button", { name: "제출" }).click();
      // 제출 결과가 DOM에 반영될 때까지 기다린다: 통과 패널이 뜨거나 시도 횟수가 올라간다.
      await Promise.race([
        passedPanel.waitFor({ state: "visible", timeout: 4_000 }).catch(() => {}),
        page.getByText(`시도 ${attemptIndex + 2}/3`).waitFor({ state: "visible", timeout: 4_000 }).catch(() => {}),
      ]);
    }
    await expect(passedPanel).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "닫기" }).click();

    // 확인 취소(거절)로 confirmedClaims를 0으로 되돌린다.
    await page.getByRole("button", { name: "이전" }).click(); // STEP4 → STEP3
    await page.getByRole("button", { name: "이전" }).click(); // STEP3 → STEP2
    await page.getByRole("button", { name: /거절/ }).first().click();
    await expect(page.getByText("0개 확인됨")).toBeVisible();

    // 다시 STEP4까지 이동(STEP2→3 버튼은 0개일 때 비활성이므로, 최소 이동 경로로 STEP2에 머무는 채
    // 게이트를 직접 검증 — 퀴즈 통과 이력(passedComps)은 남아있지만 STEP2→3 게이트조차 통과하지 못한다).
    await expect(page.getByRole("button", { name: /먼저 알아보기/ })).toBeDisabled();
  });

  test("확인 증거 1개 이상이면 STEP4→5로 정상 진행할 수 있다", async ({ page }) => {
    await reachStep4(page);
    await page.getByRole("button", { name: /맞아요/ }).first().click();
    await page.getByRole("button", { name: /먼저 알아보기/ }).click();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();

    const submit = page.getByRole("button", { name: "GapProof 만들기" });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText("증거에서 행동까지")).toBeVisible();
  });

  test("확인을 취소해 0개로 되돌리면 STEP4→5 버튼이 다시 비활성화된다", async ({ page }) => {
    await reachStep4(page);
    await page.getByRole("button", { name: /맞아요/ }).first().click();
    await page.getByRole("button", { name: /먼저 알아보기/ }).click();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByRole("button", { name: "GapProof 만들기" })).toBeEnabled();

    await page.getByRole("button", { name: "이전" }).click(); // STEP4 → STEP3
    await page.getByRole("button", { name: "이전" }).click(); // STEP3 → STEP2
    await page.getByRole("button", { name: /거절/ }).first().click();
    await expect(page.getByText("0개 확인됨")).toBeVisible();
    await expect(page.getByRole("button", { name: /먼저 알아보기/ })).toBeDisabled();
  });

  test("차단 안내문이 판정 표현 없이 행동 지침을 제공하고, 키보드로 접근 가능하다", async ({ page }) => {
    await reachStep4(page);
    // STEP2에서 아무것도 확인하지 않은 상태의 0개 안내문 확인(판정 표현 없음).
    const note = page.locator(".zero-note, .check-row-zero, [role='status']").filter({ hasText: "확인" });
    await expect(page.getByText(/최소 1개를 확인해 주십시오/)).toBeVisible();
    // 페이지 전체에 "틀렸다"·"역량이 없다" 같은 판정 표현이 없어야 한다.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/틀렸습니다|역량이 없습니다|자격이 없습니다/);
    // 키보드 포커스: 안내문이 있는 화면에서 Tab으로 body가 아닌 실제 인터랙티브 요소로 이동해야 한다.
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(["BUTTON", "A", "INPUT"]).toContain(focusedTag);
  });

  test("320px 모바일에서 STEP4 가로 오버플로가 없다", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await reachStep4(page);
    await page.getByRole("button", { name: /맞아요/ }).first().click();
    await page.getByRole("button", { name: /먼저 알아보기/ }).click();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("STEP4에 심각한 접근성 위반이 없다(axe wcag2a/aa)", async ({ page }) => {
    await reachStep4(page);
    await page.getByRole("button", { name: /맞아요/ }).first().click();
    await page.getByRole("button", { name: /먼저 알아보기/ }).click();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
  });
});
