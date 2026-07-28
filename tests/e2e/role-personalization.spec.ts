import { test, expect } from "@playwright/test";

// 재현 테스트 — PR #76 리뷰에서 발견된 버그:
// roleId가 ROLES[0]("AI 서비스 기획자")로 기본 초기화되고, 역할 선택 UI는 기존 STEP4에만 있어
// 사용자가 STEP3 "먼저 알아보기"에 도달했을 때 목표직무를 한 번도 확인하지 않은 채
// 기본 역할 기준 자료(검색어·미니프로젝트)를 보게 된다.
async function reachLookIntoStep(page) {
  await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
  await page.locator(".check-row input").first().check();
  await page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ }).click();
  await page.getByRole("button", { name: /가능성 찾기/ }).click();
  await expect(page.locator(".claim-card").first()).toBeVisible({ timeout: 10_000 });
  // 확인 클릭이 렌더보다 앞서면 유실될 수 있다. 카드가 confirmed 상태(.selected.confirm)가
  // 될 때까지 다시 누른다 — 이 반영이 없으면 다음 버튼은 영원히 비활성으로 남는다.
  const confirmButton = page.getByRole("button", { name: /맞습니다/ }).first();
  await expect(async () => {
    const cls = (await confirmButton.getAttribute("class")) ?? "";
    if (!cls.includes("selected")) await confirmButton.click();
    expect((await confirmButton.getAttribute("class")) ?? "").toContain("selected");
  }).toPass({ timeout: 15_000 });

  const nextStep = page.getByRole("button", { name: /먼저 알아보기/ });
  await expect(nextStep).toBeEnabled({ timeout: 15_000 });
  await nextStep.click();
}

test.describe("역할 개인화 — STEP3 자료 표시 전 목표직무 확인/선택", () => {
  test("STEP3 자료(검색 링크)보다 먼저 목표직무 선택/확인 UI가 보인다", async ({ page }) => {
    await reachLookIntoStep(page);
    // 자료 카드가 이미 보이는 시점에도 "이번에 알아볼 목표직무" 컨트롤이 함께 존재해야 한다.
    await expect(page.getByText("이번에 알아볼 목표직무")).toBeVisible();
  });

  test("다른 목표직무를 선택하면 STEP3 자료가 즉시 그 직무 기준으로 바뀐다", async ({ page }) => {
    await reachLookIntoStep(page);
    // 실제 <input type="radio">는 .model-card와 동일한 기법으로 시각적으로 숨기고 라벨(카드)이
    // 클릭 표면을 담당한다(마우스 사용자는 라벨을 클릭 → 브라우저가 내부적으로 라디오에 전달).
    // Playwright는 좌표 기반 클릭이라 숨겨진 input을 직접 못 찾으므로 라벨 텍스트를 클릭한다.
    await page.getByRole("radiogroup", { name: "목표직무 선택" }).getByText("데이터 분석가").click();
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeChecked();
    await expect(page.getByText(/데이터 수집·정제|통계·분석|시각화·리포팅|파이썬·도구|문제 정의·도메인/).first()).toBeVisible();
    await expect(page.getByText("문제 정의·도메인 연결")).toHaveCount(0); // AI 서비스 기획자 전용 역량명 혼입 없음
  });

  test("AI가 제안한 직업 가설과 사용자가 선택한 목표직무가 다른 문구로 구분된다", async ({ page }) => {
    await reachLookIntoStep(page);
    await expect(page.getByText("이번에 알아볼 목표직무")).toBeVisible();
    await expect(page.getByText(/AI 가설/).first()).toBeVisible();
  });

  test("STEP3에서 바꾼 직무가 STEP4까지 이어지고, 뒤로가기 후에도 선택이 유지되며, 다시 바꿔도 이전 직무 자료가 남지 않는다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByRole("radiogroup", { name: "목표직무 선택" }).getByText("데이터 분석가").click();

    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();
    await expect(page.locator(".role-chip b")).toHaveText("데이터 분석가"); // STEP4도 동일 직무
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeChecked(); // STEP4 라디오도 동일 상태 공유

    await page.getByRole("button", { name: "이전" }).click();
    await expect(page.getByText("이번에 알아볼 목표직무")).toBeVisible();
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeChecked(); // 뒤로가기 후에도 유지

    await page.getByRole("radiogroup", { name: "목표직무 선택" }).getByText("스마트물류 서비스 기획").click();
    await expect(page.getByRole("radio", { name: "스마트물류 서비스 기획" })).toBeChecked();
    await expect(page.getByText("물류 도메인 이해").first()).toBeVisible();
    await expect(page.getByText("데이터 수집·정제")).toHaveCount(0); // 이전 선택(데이터 분석가) 잔존 자료 0

    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.locator(".role-chip b")).toHaveText("스마트물류 서비스 기획"); // STEP4도 즉시 갱신
  });
});
