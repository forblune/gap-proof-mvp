import { test, expect, type Page } from "@playwright/test";
import { reachLookIntoStep as sharedReachLookIntoStep } from "./journey";
import AxeBuilder from "@axe-core/playwright";

// 인정 체계 UI 검증: 영상 학습·수료증·수행 확인서·증거 충족도.
// 핵심 계약 — 조건 없이 발급되지 않고, 퀴즈만으로 수행 인정이 생기지 않으며,
// 증거 충족도는 취업 가능성이 아니라 산정식이 공개된 비율이다.

// 각 단계가 실제로 반영된 것을 확인하고 다음으로 넘어간다.
// 전체 스위트를 동시에 돌릴 때(자원 경합) 클릭이 렌더보다 앞서면서 단계가 유실되던 문제를 막는다.
async function reachLookIntoStep(page: Page) {
  await sharedReachLookIntoStep(page);
  // STEP3 에 실제로 도착한 것을 확인한다.
  await expect(page.getByText("먼저 검색해보기 · 배워보기")).toBeVisible({ timeout: 10_000 });
}

test.describe("인정 체계 — 영상 학습 · 발급 · 증거 충족도", () => {
  test("영상 학습 입력이 보이고, 인정 상한을 화면에 명시한다", async ({ page }) => {
    await reachLookIntoStep(page);
    await expect(page.getByPlaceholder("https://www.youtube.com/watch?v=...")).toBeVisible();
    // 인정 상한 고지: 영상 학습·질문은 학습 완료·이해 확인까지만
    await expect(page.getByText(/학습 완료·이해 확인.*까지만 인정/)).toBeVisible();
  });

  test("주소 없이 학습 자료 만들기 버튼은 비활성이다", async ({ page }) => {
    await reachLookIntoStep(page);
    await expect(page.getByRole("button", { name: "학습 자료 만들기" })).toBeDisabled();
  });

  test("잘못된 YouTube 주소는 사용자 언어 오류로 안내하고 자료를 만들지 않는다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByPlaceholder("https://www.youtube.com/watch?v=...").fill("https://vimeo.com/12345");
    await page.getByRole("button", { name: "학습 자료 만들기" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText(/YouTube|확인해 주십시오|학습 자료/);
    // 실패 시 자료를 지어내지 않는다
    await expect(page.getByText("스스로 확인하기")).toHaveCount(0);
  });

  test("학습 자료가 없으면 수료증·수행 확인서 발급 UI 자체가 나타나지 않는다", async ({ page }) => {
    await reachLookIntoStep(page);
    await expect(page.getByRole("button", { name: /학습 수료증 발급/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /수행 확인서 발급/ })).toHaveCount(0);
  });

  test("증거 충족도는 산정식과 '채용 가능성 아님' 고지를 함께 보여 준다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();

    await expect(page.getByText(/증거 충족도 \d+%/)).toBeVisible();
    await expect(page.getByText(/산정식:/)).toBeVisible();
    await expect(page.getByText(/채용 가능성·합격 가능성·적성을 뜻하지 않습니다/)).toBeVisible();
  });

  test("취업 확률·합격 가능성 예측 표현이 화면 어디에도 없다", async ({ page }) => {
    await reachLookIntoStep(page);
    await page.getByRole("button", { name: /격차·행동 보기/ }).click();
    await expect(page.getByText("목표직무 비교")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/취업 확률|합격 확률|취업확률|합격 가능성 \d|채용 확률/);
    expect(body).not.toMatch(/취업 가능성 \d+%|적성 점수/);
  });

  test("320px 모바일에서 학습 영역이 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await reachLookIntoStep(page);
    await expect(page.getByPlaceholder("https://www.youtube.com/watch?v=...")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("클라이언트 번들에 Gemini API 키가 노출되지 않는다", async ({ page }) => {
    const scriptBodies: string[] = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (/\.(js|mjs)(\?|$)/.test(url) && response.status() === 200) {
        try {
          scriptBodies.push(await response.text());
        } catch {
          /* 본문을 읽을 수 없는 응답은 건너뛴다 */
        }
      }
    });
    await reachLookIntoStep(page);
    const all = scriptBodies.join("\n") + (await page.content());
    expect(all).not.toMatch(/GEMINI_API_KEY\s*[:=]\s*["'][^"']+["']/);
    expect(all).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/); // Google API 키 형식
    expect(all).not.toMatch(/generativelanguage\.googleapis\.com\?.*key=/);
  });

  test("학습 영역에 심각한 접근성 위반이 없다(axe wcag2a/aa)", async ({ page }) => {
    await reachLookIntoStep(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
  });
});
