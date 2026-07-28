import { expect, type Page } from "@playwright/test";

// 샘플 여정의 공용 단계.
//
// 왜 공용으로 두는가: 같은 조작이 5개 스펙에 복사돼 있었고, 그중 한 곳만 고치면
// 다른 곳에서 같은 flake 가 다시 났다(firefox 320px 에서 분석 클릭이 유실돼
// .claim-card 가 끝내 나타나지 않던 실패). 조작 계약을 한 곳에 모아 둔다.
//
// 공통 원칙: React 재렌더 도중에는 클릭이 유실될 수 있다.
// 그래서 "눌렀다"가 아니라 "반영됐다"를 기준으로 다음 단계로 넘어간다.

export async function openSampleJourney(page: Page): Promise<void> {
  await page.goto("/demo?sample=1", { waitUntil: "networkidle" });

  const consent = page.locator(".check-row input").first();
  await expect(consent).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    if (!(await consent.isChecked())) await consent.check();
    expect(await consent.isChecked()).toBe(true);
  }).toPass({ timeout: 15_000 });

  const start = page.getByRole("button", { name: /내 경험에서 시작하기|샘플로 둘러보기/ });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
}

// 분석을 실행하고 후보 카드가 화면에 나올 때까지 기다린다.
// 버튼이 아직 화면에 남아 있을 때만 다시 누른다 — 중복 분석 요청을 만들지 않기 위해서다.
export async function runAnalysis(page: Page): Promise<void> {
  const analyze = page.getByRole("button", { name: /가능성 찾기/ });
  const claim = page.locator(".claim-card").first();
  await expect(async () => {
    if (await claim.isVisible().catch(() => false)) return;
    if (await analyze.isVisible().catch(() => false)) {
      await expect(analyze).toBeEnabled({ timeout: 5_000 });
      await analyze.click();
    }
    await expect(claim).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 30_000 });
}

// 첫 후보를 "확인"한다. 반영(.selected)될 때까지 다시 누른다 —
// 반영이 없으면 다음 단계 버튼은 영원히 비활성으로 남아 원인을 알기 어려운 타임아웃이 된다.
export async function confirmFirstClaim(page: Page): Promise<void> {
  const confirmButton = page.getByRole("button", { name: /맞습니다/ }).first();
  await expect(async () => {
    const cls = (await confirmButton.getAttribute("class")) ?? "";
    if (!cls.includes("selected")) await confirmButton.click();
    expect((await confirmButton.getAttribute("class")) ?? "").toContain("selected");
  }).toPass({ timeout: 15_000 });
}

export async function goToLookIntoStep(page: Page): Promise<void> {
  const nextStep = page.getByRole("button", { name: /먼저 알아보기/ });
  await expect(nextStep).toBeEnabled({ timeout: 15_000 });
  await nextStep.click();
}

// STEP2(후보 확인) 까지 — 확인은 아직 하지 않은 상태.
export async function reachClaimStep(page: Page): Promise<void> {
  await openSampleJourney(page);
  await runAnalysis(page);
}

// STEP3("먼저 알아보기") 까지 — 후보 1개를 확인한 상태.
export async function reachLookIntoStep(page: Page): Promise<void> {
  await reachClaimStep(page);
  await confirmFirstClaim(page);
  await goToLookIntoStep(page);
}
