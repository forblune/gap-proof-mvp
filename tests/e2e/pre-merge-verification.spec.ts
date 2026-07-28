import { test, expect, type Page, type Route } from "@playwright/test";

// PR #76 병합 전 최종 검증 — draft 복원의 역할 일관성, 키보드 조작, 포커스, 다중 뷰포트를 다룬다.
// 일반(비-샘플) 모드를 검증하되 실제 게이트 백엔드(GATE_ACCESS_CODE 등 시크릿)는 필요하지 않다:
// 이 테스트 환경에는 유효한 게이트 코드가 없으므로, 로컬 데모 게이트 확인 엔드포인트(/api/gate GET)만
// 라우트 가로채기로 모킹해 인증을 통과시킨다 — Solar(/api/analyze)나 Supabase는 draft 복원 과정에서
// 애초에 호출되지 않으며, 이 테스트에서도 가로채거나 호출하지 않는다.
async function mockGateAuthorized(page: Page) {
  await page.route("**/api/gate", async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authorized: true }) });
    } else {
      await route.continue();
    }
  });
}

const DRAFT_FIXTURE = {
  v: 1,
  savedAt: "2026-07-28T00:00:00.000Z",
  step: 3,
  storeConsent: true,
  aggregateConsent: false,
  experience: "엑셀로 데이터를 정리하고 표로 요약한 경험이 있습니다.",
  claims: [
    {
      id: 1,
      skill: "데이터 정제 경험",
      quote: "엑셀로 데이터를 정리하고 표로 요약했습니다.",
      source: "사용자 입력",
      tier: 0,
      confidence: "확인 필요",
      question: "관련 파일이 남아있나요?",
      status: "confirmed",
      link: "",
    },
  ],
  roleId: "data_analyst",
  passedChecks: {},
  analysisSource: "idle",
  analysisModel: null,
  modelId: "solar-pro3",
  analysisNotice: "",
  selectedAction: "project",
  proofDate: null,
};

async function reachLookIntoStep(page: Page) {
  await page.goto("/demo?sample=1", { waitUntil: "networkidle" });
  // 첫 렌더가 늦을 수 있어 요소가 보인 뒤에 조작한다(빈 화면 상대로 타임아웃나던 문제).
  const consentInput = page.locator(".check-row input").first();
  await expect(consentInput).toBeVisible({ timeout: 20_000 });
  await consentInput.check();
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

test.describe("필수 검증 1 — 일반 모드 draft 새로고침 복원", () => {
  test("데이터 분석가로 저장된 draft가 새로고침 후 복원되고 STEP3·4·5가 동일 roleId 기준이다", async ({ page }) => {
    await mockGateAuthorized(page);
    await page.addInitScript((draft) => {
      window.localStorage.setItem("gp_draft_v1", JSON.stringify(draft));
    }, DRAFT_FIXTURE);

    await page.goto("/demo", { waitUntil: "networkidle" });

    // localStorage draft에 roleId가 실제로 저장돼 있었는지(테스트 fixture 자체의 계약 확인)
    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("gp_draft_v1") ?? "{}"));
    expect(stored.roleId).toBe("data_analyst");

    // 복원: STEP3 "먼저 알아보기"로 진입, 데이터 분석가 라디오가 선택돼 있다.
    await expect(page.getByText("이번에 알아볼 목표직무")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeChecked();
    await expect(page.getByText("데이터 수집·정제").first()).toBeVisible(); // 데이터 분석가 기준 역량
    await expect(page.getByText("문제 정의·도메인 연결")).toHaveCount(0); // AI 서비스 기획자 전용 자료 혼입 0

    // 실제로 새로고침해도 동일하게 복원된다(라우트 모킹·initScript 모두 새 로드에도 유지됨).
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeChecked();

    // STEP4도 동일 roleId 기준
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.locator(".role-chip b")).toHaveText("데이터 분석가");

    // STEP5도 동일 roleId 기준
    await page.getByRole("button", { name: /GapProof 만들기/ }).click();
    await expect(page.getByText("데이터 분석가").first()).toBeVisible();
  });
});

test.describe("필수 검증 2 — 시각·UX", () => {
  test("320/375/430/768/1440px에서 STEP3·STEP4 모두 가로 스크롤이 없다", async ({ page }) => {
    const widths = [320, 375, 430, 768, 1440];
    await reachLookIntoStep(page);
    await page.getByText(/제도 확인하기/).click(); // 접힌 콘텐츠까지 포함해 검사
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth - overflow.clientWidth, `STEP3 ${width}px`).toBeLessThanOrEqual(1);
    }
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth - overflow.clientWidth, `STEP4 ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test("키보드(화살표)만으로 목표직무를 변경할 수 있다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByRole("radio", { name: "AI 서비스 기획자" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "데이터 분석가" })).toBeFocused();
  });

  test("STEP3 진입 시 제목으로 포커스가 이동한다", async ({ page }) => {
    await reachLookIntoStep(page);
    await expect(
      page.getByRole("heading", { name: "AI가 아니라 당신이 직접 확인하는 단계입니다." }),
    ).toBeFocused();
  });
});
