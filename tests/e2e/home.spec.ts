import { test, expect } from "@playwright/test";

// metadataBase가 운영 도메인으로 고정돼 있어(app/layout.tsx) 로컬 dev에서 manifest 링크가
// 크로스오리진으로 뜨는 것은 알려진 로컬 전용 아티팩트다 (tests/e2e/qa-sweep.cjs의 LOCAL_ARTIFACT와 동일 기준).
const LOCAL_ARTIFACT = /Access-Control-Allow-Origin|manifest\.webmanifest/;

test.describe("홈페이지 접근", () => {
  test("홈페이지가 정상적으로 로드된다", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveTitle(/GapProof/);
  });

  test("데모 진입 링크가 존재한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a.nav-cta", { hasText: "데모 열기" })).toBeVisible();
  });
});

test.describe("콘솔 오류 검사", () => {
  for (const path of ["/", "/demo", "/why", "/how-it-works"]) {
    test(`${path} 에서 콘솔 오류가 발생하지 않는다`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !LOCAL_ARTIFACT.test(msg.text())) errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(path, { waitUntil: "networkidle" });
      expect(errors, `콘솔 오류: ${errors.join(" | ")}`).toEqual([]);
    });
  }
});

test.describe("실패한 네트워크 요청 검사", () => {
  for (const path of ["/", "/demo", "/why"]) {
    test(`${path} 에서 실패한 요청이 없다`, async ({ page }) => {
      const failed: string[] = [];
      page.on("requestfailed", (req) => {
        if (LOCAL_ARTIFACT.test(req.url())) return;
        failed.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
      });
      const responses: { url: string; status: number }[] = [];
      page.on("response", (res) => {
        responses.push({ url: res.url(), status: res.status() });
      });
      await page.goto(path, { waitUntil: "networkidle" });
      const serverErrors = responses.filter((r) => r.status >= 500);
      expect(failed, `실패한 요청: ${failed.join(" | ")}`).toEqual([]);
      expect(serverErrors, `5xx 응답: ${JSON.stringify(serverErrors)}`).toEqual([]);
    });
  }
});
