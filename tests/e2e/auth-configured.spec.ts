import { test, expect } from "@playwright/test";

// 인증 화면이 **실제로 동작하는 폼**을 그리는지 확인한다.
//
// 왜 따로 필요한가:
// auth-pages.spec.ts 는 "설정이 없으면 미연결 안내가 뜨는 것도 정상"이라는 계약을 검사한다.
// 그 계약 자체는 옳다(가짜 폼을 보여 주지 않는 것). 그런데 그 때문에 **운영에 공개 설정이
// 통째로 빠져 있어도 전 테스트가 통과했다.** /signup·/login 이 안내 문구만 띄우고
// 가입 계정이 0건인 채로 배포돼 있었다.
//
// 그래서 이 스펙은 반대 방향을 본다 — 설정이 들어간 빌드에서 폼이 진짜 있는지.
// 공개 설정 없이 빌드하면 **일부러 실패한다.** e2e 는 제대로 설정된 빌드에서 돌아야 한다.
// 설정 방법은 docs/operations/DEPLOY_ENV.md 를 본다.
//
// goto 는 domcontentloaded 까지만 기다린다. networkidle 은 firefox 에서 열린 연결 때문에
// 좀처럼 끝나지 않아 테스트 타임아웃을 먹었다(화면은 이미 올바르게 그려져 있었다).
// Playwright 의 단언은 스스로 기다리므로 DOM 준비만 확인하면 충분하다.

const NOT_CONFIGURED = "아직 연결되지 않았습니다";

// firefox 에서 페이지 로드와 컨텍스트 정리가 30초 기본값을 넘겨 실패한 적이 있다
// (단언은 통과했고 화면도 올바랐다 — 하네스가 느린 것이었다). 여유를 둔다.
test.describe.configure({ timeout: 60_000 });

test.describe("인증 화면이 실제 폼을 그린다", () => {
  test("/signup — 이메일·비밀번호·필수 동의가 모두 있다", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(NOT_CONFIGURED);
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
    // 필수 동의 2종(약관·개인정보, 만 14세 이상)
    await expect(page.locator(".auth-consent input[type=checkbox]")).toHaveCount(2);
    await expect(page.locator("button[type=submit]")).toBeVisible();
  });

  test("/login — 이메일·비밀번호와 소셜 버튼이 있다", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(NOT_CONFIGURED);
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    // 버튼이 있다는 것과 provider 가 켜져 있다는 것은 다르다 —
    // 실제 사용 가능 여부는 Supabase 대시보드 설정에 달려 있고 여기서 판정하지 않는다.
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Kakao/i })).toBeVisible();
  });

  test("/forgot-password — 이메일 입력이 있다", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(NOT_CONFIGURED);
    await expect(page.locator("input[type=email]")).toBeVisible();
  });

  test("비로그인 사용자는 /profile 에서 기록을 볼 수 없다", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(NOT_CONFIGURED);
    // 로그인 안내로 막고, 남의 기록을 그리지 않는다.
    await expect(page.locator("h1")).toContainText("로그인");
    await expect(page.locator(".profile-card, [data-proof-card]")).toHaveCount(0);
  });

  test("브라우저가 Supabase 인증 엔드포인트로 실제 요청을 보낸다", async ({ page }) => {
    const authRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/\/auth\/v1\//.test(url)) authRequests.push(new URL(url).pathname);
    });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#login-email", "no-such-user-e2e@example.com");
    await page.fill("#login-password", "definitely-not-the-password");
    await page.click("button[type=submit]");
    // 설정이 없으면 createClient() 가 null 이라 요청 자체가 나가지 않는다 — 그걸 잡는 검사다.
    await expect.poll(() => authRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(authRequests.some((path) => path.includes("/token"))).toBe(true);
  });

  for (const width of [320, 375]) {
    test(`${width}px 에서 인증 화면이 가로로 넘치지 않는다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      for (const route of ["/signup", "/login", "/forgot-password"]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} 가로 오버플로`).toBeLessThanOrEqual(1);
      }
    });
  }
});
