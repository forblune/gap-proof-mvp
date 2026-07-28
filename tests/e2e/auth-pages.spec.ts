import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 인증 화면 검증.
// 이 환경에는 Supabase 공개 설정이 없으므로 "설정되지 않음" 화면이 정직하게 뜨는 것이
// 정상 동작이다 — 가짜 로그인 폼을 보여 주지 않는 것 자체가 계약이다.
// 설정이 있으면 실제 폼이 뜨며, 두 경우 모두 아래 계약을 만족해야 한다.

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/profile"];

test.describe("인증 화면", () => {
  for (const route of AUTH_ROUTES) {
    test(`${route} 이 오류 없이 열리고 데모로 돌아갈 길을 안내한다`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !msg.text().includes("Access-Control-Allow-Origin")) {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("h1")).toBeVisible();
      // 비회원도 데모를 쓸 수 있다는 사실이 모든 인증 화면에 있어야 한다.
      await expect(page.getByRole("link", { name: /데모/ }).first()).toBeVisible();
      expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
    });
  }

  test("인증 화면 어디에도 secret 이 노출되지 않는다", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", async (res) => {
      if (/\.(js|mjs)(\?|$)/.test(res.url()) && res.status() === 200) {
        try { scripts.push(await res.text()); } catch { /* 읽을 수 없는 응답은 건너뛴다 */ }
      }
    });
    await page.goto("/login", { waitUntil: "networkidle" });
    const all = scripts.join("\n") + (await page.content());

    // 실제 "값"이 번들에 들어갔는지를 본다.
    // 주의: @supabase/auth-js는 "Never expose your `service_role` key in the browser" 라는
    // 경고 주석을 포함하므로, 단어 자체가 아니라 값의 형태(할당·키 접두사)로 판정한다.
    expect(all, "client secret 값이 번들에 있음").not.toMatch(
      /(GOOGLE|KAKAO|NAVER)_CLIENT_SECRET["'\s]*[:=]\s*["'][^"']+["']/,
    );
    expect(all, "service role / secret 키 값이 번들에 있음").not.toMatch(/sb_secret_[A-Za-z0-9_-]{8,}/);
    expect(all, "service_role JWT가 번들에 있음").not.toMatch(/"role"\s*:\s*"service_role"/);
    expect(all, "서버 전용 키 값이 번들에 있음").not.toMatch(
      /(GEMINI_API_KEY|UPSTAGE_API_KEY|KMOOC_SERVICE_KEY|GATE_SESSION_SECRET|GATE_ACCESS_CODE)["'\s]*[:=]\s*["'][^"']+["']/,
    );
    expect(all, "Google API 키 형식이 번들에 있음").not.toMatch(/AIza[0-9A-Za-z_-]{30,}/);
    expect(all, "Upstage 키 형식이 번들에 있음").not.toMatch(/\bup_[A-Za-z0-9]{20,}/);
  });

  test("로그인·가입 화면이 320px 에서 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    for (const route of ["/login", "/signup"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth, `${route} 가로 오버플로`).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });

  test("인증 화면에 심각한 접근성 위반이 없다(axe wcag2a/aa)", async ({ page }) => {
    for (const route of ["/login", "/signup", "/profile"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, `${route}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
    }
  });

  test("callback 은 code 없이 오면 로그인으로 되돌리고 세션을 만들지 않는다", async ({ page }) => {
    await page.goto("/auth/callback", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("auth=missing_code");
  });

  test("callback 은 어떤 형태의 외부 주소로도 나가지 않는다(역슬래시 우회 포함)", async ({ page, baseURL }) => {
    // 역슬래시는 WHATWG URL에서 슬래시와 같게 취급되므로 "/\\evil.com" 이 외부로 해석될 수 있다.
    // 실제 도착 origin 이 우리 origin 인지 단언한다(같은 값끼리 비교하는 항진명제가 아니다).
    const ourOrigin = new URL(baseURL ?? "http://localhost:3000").origin;
    const attempts = [
      "https://example.com/evil",
      "//example.com/evil",
      "/\\example.com",
      "/\\\\example.com",
      "\\/example.com",
    ];
    for (const next of attempts) {
      await page.goto(`/auth/callback?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
      expect(new URL(page.url()).origin, `next=${next} 로 외부 이동함`).toBe(ourOrigin);
      expect(page.url(), `next=${next}`).not.toContain("example.com");
    }
  });

  test("사용자가 취소하면 취소했다는 사실을 로그인 화면으로 전달한다", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("auth=cancelled");
  });
});
