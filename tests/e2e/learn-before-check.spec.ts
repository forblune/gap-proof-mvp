import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Learn Before Check Phase 1 — 신규 STEP 3 "먼저 알아보기" 검증.
// 샘플 모드로 진행하므로 실제 Solar 호출·외부 API 호출·Supabase 접근이 전혀 없다.
async function reachLookIntoStep(page) {
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

test.describe("Learn Before Check Phase 1 — 먼저 알아보기", () => {
  test("자료(검색 링크)가 퀴즈보다 먼저, 자동 시작 없이 표시된다", async ({ page }) => {
    await reachLookIntoStep(page);

    await expect(page.getByText("먼저 검색해보기 · 배워보기")).toBeVisible();
    await expect(page.locator(".lookinto-card:visible")).toHaveCount(2); // 기본 펼침(배워보기: YouTube·K-MOOC)
    await expect(page.locator(".lookinto-card")).toHaveCount(4); // 접힌 제도 확인하기 2개도 DOM에는 존재
    await expect(page.locator(".check-panel")).toHaveCount(0); // 퀴즈는 이 단계에 없다(자동 시작 금지 포함)

    // 제도 확인하기(고용24·온통청년)는 <details>로 접혀 있다가 펼치면 나타난다
    await expect(page.getByText("고용24 열어보기")).not.toBeVisible();
    await page.getByText(/제도 확인하기/).click();
    await expect(page.getByText("고용24 열어보기")).toBeVisible();
    await expect(page.getByText("온통청년 열어보기")).toBeVisible();
  });

  test("모든 외부 링크는 https·새 창·noopener noreferrer이며 실제 API 호출을 만들지 않는다", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));

    await reachLookIntoStep(page);
    await page.getByText(/제도 확인하기/).click();

    const links = page.locator(".lookinto-link");
    const count = await links.count();
    expect(count).toBe(4); // YouTube · K-MOOC · 고용24 · 온통청년

    for (let i = 0; i < count; i += 1) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^https:\/\//);
      const ariaLabel = await link.getAttribute("aria-label");
      expect(ariaLabel).toMatch(/새 창에서 열림/);
    }

    // 클릭하지 않았으므로 이 페이지 자체가 youtube.com·kmooc.kr·work24.go.kr·youthcenter.go.kr로
    // 요청을 보내지 않았어야 한다(링크만 구성 — 실제 API 호출 없음).
    const external = requests.filter((url) =>
      /youtube\.com|kmooc\.kr|work24\.go\.kr|youthcenter\.go\.kr|upstage\.ai/.test(url),
    );
    expect(external).toEqual([]);
  });

  test("건너뛰어도 다음 단계(격차·행동)로 진행할 수 있다", async ({ page }) => {
    await reachLookIntoStep(page);
    await expect(page.getByText("둘러보지 않아도 다음으로 넘어갈 수 있습니다.")).toBeVisible();
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();
  });

  test("이전 버튼으로 역량 확인 단계(STEP 2)로 돌아갈 수 있다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByRole("button", { name: "이전" }).click();
    await expect(page.getByText("사용자 확인")).toBeVisible();
  });

  test("320~1440px 전 구간에서 가로 스크롤·겹침이 없다", async ({ page }) => {
    const widths = [
      { label: "320", width: 320, height: 690 },
      { label: "360", width: 360, height: 780 },
      { label: "375", width: 375, height: 812 },
      { label: "390", width: 390, height: 844 },
      { label: "430", width: 430, height: 932 },
      { label: "768", width: 768, height: 1024 },
      { label: "1440", width: 1440, height: 900 },
    ];
    for (const viewport of widths) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport === widths[0]) {
        await reachLookIntoStep(page);
        await page.getByText(/제도 확인하기/).click();
      }
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth - overflow.clientWidth,
        `${viewport.label}px: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test("먼저 알아보기 단계에 심각한 접근성 위반이 없다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByText(/제도 확인하기/).click(); // 접힌 콘텐츠까지 포함해 검사
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}건)`).join("\n")).toEqual([]);
  });
});
