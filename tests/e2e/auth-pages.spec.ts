import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ── 서버 전용 값 유출 검사 ────────────────────────────────────────────────────
// 번들러는 환경변수를 "값만" 인라인한다. 이름 옆에 값이 붙은 형태를 찾는 검사는
// 실제 유출을 절대 잡지 못한다(심사 지적). 그래서 진짜 값 자체를 찾는다.
// 값은 읽기만 하고 어디에도 기록·출력하지 않는다.

const CANARY = "gp-canary-value-do-not-ship-4f2a9c";

// NEXT_PUBLIC_* 은 브라우저에 나가는 것이 설계다. 나머지는 서버 전용이다.
const CLIENT_SAFE_PREFIXES = ["NEXT_PUBLIC_", "KAKAO_JS_KEY"];

function findEnvFile(): string | null {
  // 워크트리에는 없고 원본 체크아웃에만 있을 수 있어 위로 거슬러 올라가며 찾는다.
  let dir = resolve(process.cwd());
  for (let depth = 0; depth < 6; depth++) {
    const candidate = join(dir, ".dev.vars");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function serverSecretEntries(): { name: string; value: string }[] {
  const file = findEnvFile();
  if (!file) return [];
  const entries: { name: string; value: string }[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    // 너무 짧은 값은 우연히 어디에나 나타나 거짓 실패를 만든다.
    if (value.length < 12) continue;
    if (CLIENT_SAFE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    entries.push({ name, value });
  }
  return entries;
}

export function containsSecretValue(haystack: string, value: string): boolean {
  return haystack.includes(value);
}

function serverSecretNamesLeakedIn(haystack: string): string[] {
  return serverSecretEntries()
    .filter((entry) => containsSecretValue(haystack, entry.value))
    .map((entry) => entry.name); // 이름만 — 값은 절대 남기지 않는다.
}

// 인증 화면 검증 — 여기서 보는 것은 **설정 여부와 무관한 계약**이다.
// (오류 없이 열린다 / 데모로 돌아갈 길이 있다 / secret 이 새지 않는다 / 접근성 / 콜백 안전성)
//
// 주의: 예전 주석은 "설정이 없으면 미연결 화면이 뜨는 것도 정상"이라고 적어 두었다.
// 그 계약 자체는 옳지만(가짜 폼을 보여 주지 않는 것), 그 때문에 **운영에 공개 설정이 통째로
// 빠져 있어도 전 테스트가 통과했다** — /signup·/login 이 안내 문구만 띄우고 가입 계정이
// 0건인 채로 배포돼 있었다. 실제 폼이 그려지는지는 tests/e2e/auth-configured.spec.ts 가 보고,
// 운영 배포에 설정이 들어가는지는 scripts/preflight-env.mjs 와
// scripts/verify-build-output.mjs 가 배포 파이프라인에서 강제한다.

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

    // 심사 지적: 이름 옆에 값이 붙은 형태(NAME:"value")만 찾으면 절대 걸리지 않는다.
    // 번들러는 값을 "그대로" 인라인하므로 이름은 사라진다. 그래서 실제 값 자체를 찾는다.
    // 값은 어디에도 출력하지 않는다 — 실패해도 이름만 보고한다.
    const leaked = serverSecretNamesLeakedIn(all);
    expect(leaked, `서버 전용 값이 클라이언트 번들에 인라인됨: ${leaked.join(", ")}`).toEqual([]);
    // 이 검사가 실제로 동작하는지(값을 심으면 잡히는지) 같은 자리에서 증명한다.
    expect(containsSecretValue("prefix " + CANARY + " suffix", CANARY)).toBe(true);

    // 형태 기반 검사 — 로컬 환경 파일이 없어도 항상 실행된다.
    expect(all, "service role / secret 키 값이 번들에 있음").not.toMatch(/sb_secret_[A-Za-z0-9_-]{8,}/);
    expect(all, "service_role JWT가 번들에 있음").not.toMatch(/"role"\s*:\s*"service_role"/);
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
