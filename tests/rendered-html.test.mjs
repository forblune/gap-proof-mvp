import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 테스트 격리: 실행 환경에 키가 있어도 실제(유료) Solar API를 호출하지 않도록
// 테스트 프로세스에서 키를 제거한다. 운영 코드에는 테스트 전용 분기를 두지 않는다.
delete process.env.UPSTAGE_API_KEY;
delete process.env.SOLAR_MODEL;

// 게이트 테스트용 값(실서비스 값 아님). 서버는 Workers env가 없으면 process.env로 폴백한다.
const TEST_GATE_CODE = "test-demo-code";
process.env.GATE_ACCESS_CODE = TEST_GATE_CODE;
process.env.GATE_SESSION_SECRET = "test-session-secret-not-production";

// 요청마다 서로 다른 테스트 IP를 부여해 rate limit 버킷을 테스트 간 격리한다.
// (실서비스에서 CF-Connecting-IP는 Cloudflare 엣지가 설정하는 신뢰 헤더)
let ipCounter = 0;
function testIp() {
  ipCounter += 1;
  return `10.99.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

function gateRequest(code, ip = testIp()) {
  return new Request("http://localhost/api/gate", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ code }),
  });
}

async function obtainGateCookie() {
  const response = await fetchWorker(gateRequest(TEST_GATE_CODE));
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  // http://localhost 요청에서는 Secure를 생략한다(운영 HTTPS에서는 포함 — 별도 테스트)
  assert.doesNotMatch(setCookie, /Secure/i);
  // 쿠키에 접근 코드 원문이 들어가지 않는다
  assert.ok(!setCookie.includes(TEST_GATE_CODE));
  return setCookie.split(";")[0];
}

function analyzeRequest(experience, cookie, ip = testIp()) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ip ? { "cf-connecting-ip": ip } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ experience }),
  });
}

// 실제 Workers isolate처럼 모듈 인스턴스를 요청 간 유지한다
// (rate limit 보조 카운터 등 모듈 상태의 실동작 검증을 위해 1회만 로드).
let workerModulePromise;
function loadWorker() {
  workerModulePromise ??= import(new URL("../dist/server/index.js", import.meta.url).href).then(
    (mod) => mod.default,
  );
  return workerModulePromise;
}

async function fetchWorker(request) {
  const worker = await loadWorker();

  return worker.fetch(
    request,
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function render(path = "/") {
  return fetchWorker(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
  );
}

// Gate 2a(#36): 홈은 공개 제품 스토리 — 게이트·데모 폼 없이 핵심 질문에 답한다
test("serves the public homepage without any gate", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const phrase of [
    "경력이라고 생각하지 않았던 경험",   // Hero
    "왜 필요한가",                        // 문제
    "누구를 위한가",                      // 대상
    "어떤 경험이 가능한가",               // 입력 범위
    "어떻게 작동하는가",                  // 파이프라인 요약
    "가상 사례",                          // Before/After (실존 아님 고지)
    "AI 모델 선택",                       // 모델
    "기술·안전·검증",                     // 기술
    "현재와 다음 단계",                   // 구현/계획 구분
    "취업 가능성이나 적성을 판정하지 않습니다", // 판정 아님
  ]) {
    assert.ok(html.includes(phrase), `home should include ${phrase}`);
  }
  assert.ok(!html.includes('id="gate-code"'), "home must not render the gate");
  assert.ok(!html.includes('id="experience"'), "home must not render the demo form");
  assert.ok(html.includes('href="/demo"'), "home links to the demo");
});

test("server-renders the access gate for unauthenticated visitors", async () => {
  const response = await render("/demo");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>GapProof \| 공백을 증거로<\/title>/i);
  // 게이트 화면: 서비스 이름 + 짧은 설명 + 데모 코드임을 명시
  assert.match(html, /심사·멘토링 데모/);
  assert.match(html, /안내받은 데모 코드를 입력해 주십시오/);
  assert.match(html, /계정 로그인이나 개인 비밀번호가 아닙니다/);
  assert.match(html, /취업 가능성이나 적성을 판정하지 않습니다/);
  // 비인증 HTML에는 메인 데모 흐름이 노출되지 않는다 (전체 데모 진입 게이트 정책)
  assert.doesNotMatch(html, /공백을 지우지 않고/);
  assert.doesNotMatch(html, /\[필수\] 경험 분석을 위한 원문 처리/);
  assert.doesNotMatch(html, /Solar 샘플 데모/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("emits SEO, Open Graph, share metadata, robots, and sitemap", async () => {
  const page = await render();
  const html = await page.text();
  const head = html.slice(0, html.indexOf("</head>"));
  for (const probe of ["og:title", "og:image", "og:site_name", "og:locale", "og:url", "twitter:card", "canonical", "apple-touch-icon", "favicon.svg", "icon-512"]) {
    assert.ok(head.includes(probe), `head should include ${probe}`);
  }
  assert.ok(head.includes("/og.png"), "og image url");

  const robots = await fetchWorker(new Request("http://localhost/robots.txt"));
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /Disallow: \/api\//);
  assert.match(robotsText, /Sitemap: https:\/\/gapproof\.forblune\.com\/sitemap\.xml/);

  const sitemap = await fetchWorker(new Request("http://localhost/sitemap.xml"));
  assert.equal(sitemap.status, 200);
  const sitemapText = await sitemap.text();
  for (const route of ["/why", "/who", "/about", "/guide", "/how-it-works", "/technology", "/privacy", "/terms"]) {
    assert.ok(sitemapText.includes(`https://gapproof.forblune.com${route}`), `sitemap ${route}`);
  }

  // 대표 이미지 실파일 1200×630 (PNG IHDR)
  const og = await readFile(new URL("../public/og.png", import.meta.url));
  assert.equal(og.readUInt32BE(16), 1200);
  assert.equal(og.readUInt32BE(20), 630);

  // 정보 페이지 canonical
  const about = await (await fetchWorker(new Request("http://localhost/about", { headers: { accept: "text/html" } }))).text();
  assert.ok(about.includes("canonical"), "about canonical");

  // 공유 계약: 공유 문구는 목표직무·확인 개수·행동명(프리셋/집계값)만 개인화하고, 경험 원문·근거·인용문은 페이로드에 미포함(소스 계약)
  const pageSource = await readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /const SHARE_TEXT =/);
  assert.match(pageSource, /const buildResultShareText = /);
  assert.match(pageSource, /text: buildResultShareText\(\)/);
  assert.doesNotMatch(pageSource, /navigator\.share\([^)]*experience/s);
  const shareFnBody = pageSource.slice(
    pageSource.indexOf("const buildResultShareText = "),
    pageSource.indexOf("const copyShareLink ="),
  );
  assert.doesNotMatch(shareFnBody, /experience|\.quote\b/);
  assert.match(pageSource, /목표 직무, 확인한 역량 개수, 이번 주 행동만 담깁니다/);
});

test("serves public information pages without the demo gate", async () => {
  const pages = [
    ["/privacy", ["전문가(법률) 검토 전의 초안", "서버에 저장하지 않습니다", "만 14세 미만 이용"]],
    ["/terms", ["전문가(법률) 검토 전의 초안", "판정하지 않으며", "AI 산출물의 한계"]],
    ["/why", ["행동 증거 중심 원칙", "과장하지 않는 구조", "GapProof가 하지 않는 것"]],
    ["/who", ["이런 분을 위해 만들었습니다", "대신 결정하지 않는 것", "상담 보조자료이며 자동판정이 아닙니다"]],
    ["/about", ["만든 계기", "하지 않는 판단", "취업 가능성이나 적성을 판정하지 않습니다"]],
    ["/guide", ["사용 순서", "입력하지 않아도 되는 정보", "오류가 나면 이렇게 대처합니다"]],
    ["/how-it-works", ["파이프라인", "증거등급 기준", "원문 인용 검증"]],
    ["/technology", ["실제 기술 스택", "보안·개인정보 설계", "의도적으로 사용하지 않았습니다"]],
  ];

  for (const [path, phrases] of pages) {
    // 쿠키 없이(비인증) 접근 — 공개 페이지 정책(#6)
    const response = await fetchWorker(
      new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    );
    assert.equal(response.status, 200, path);
    const html = await response.text();
    for (const phrase of phrases) {
      assert.ok(html.includes(phrase), `${path} should contain "${phrase}"`);
    }
    // 공용 내비게이션 존재 + 메인 데모 흐름·게이트 입력은 미노출
    assert.ok(html.includes("이용 가이드"), `${path} nav`);
    assert.ok(!html.includes("[필수] 경험 분석을 위한 원문 처리"), `${path} must not expose the demo flow`);
    assert.ok(!html.includes('id="gate-code"'), `${path} must not render the gate input`);
  }
});

test("keeps AI claims bounded and user-confirmed", async () => {
  const [page, layout, packageJson, css] = await Promise.all([
    readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type ClaimStatus = "pending" \| "confirmed" \| "rejected"/);
  assert.match(page, /AI의 제안보다 당신의 확인이 먼저입니다/);
  assert.match(page, /거절한 항목은 카드와 추천에서 빠집니다/);
  assert.match(page, /원문 공유는 직접 선택합니다/);
  assert.match(page, /새 분석 시작하기/); // Gate 9: 파괴적 작업 재명명
  // #35: 삭제·잠금은 공통 리셋 헬퍼로 입력을 비우고 draft도 함께 지운다
  assert.match(page, /resetJourneyState\("", \[\]\)/);
  assert.match(page, /clearDraft\(window\.localStorage\)/);
  assert.match(page, /원문 인용은 증거이므로 수정하지 않습니다/);
  assert.match(page, /claim\.id === id \? \{ \.\.\.claim, skill: nextSkill, status: "pending" \}/);
  assert.match(page, /confirmedClaims\.map\(\(claim\) => <li key=\{claim\.id\}>\{claim\.skill\}<\/li>\)/);
  assert.match(page, /샘플 데이터/);
  // Issue #5: 상태 표시 정확성 계약
  assert.doesNotMatch(page, /연결 오류로 준비된 샘플 결과를 표시합니다/); // 입력 오류를 정적 샘플로 대체하지 않음
  assert.doesNotMatch(page, /2026\.07\.22/); // 카드 날짜 하드코딩 제거
  assert.match(page, /formatProofDate/); // 생성 시점 날짜 사용
  // Gate 3(#39): 자동 절삭 금지 — textarea에 maxLength를 두지 않고 초과를 명시 오류로 알린다
  assert.doesNotMatch(page, /id="experience" maxLength/);
  assert.match(page, /최소 20자 · 최대 10,000자/); // 길이 조건 안내(화면·서버 일치)
  assert.match(page, /자동으로 잘라내지 않습니다/); // 절삭 금지 계약
  assert.match(page, /role="alertdialog"/); // 기록 삭제 확인 절차
  assert.match(page, /다음 단계로 가려면 내 경험에서 확인할 수 있는 근거를 하나 이상 선택해 주십시오/); // 확인 0개 가드 안내(증거등급 무결성 P0)
  assert.match(page, /notice\.kind === "error" \? "alert" : "status"/); // 오류 알림 라이브 리전
  assert.match(page, /개인정보가 감지되면 가려서 표시됩니다/); // 마스킹 가능성 고지(#7)
  assert.match(layout, /SITE_TITLE = "GapProof \| 공백을 증거로"/);
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test("returns a traceable sample when a Solar key is unavailable", async () => {
  const experience =
    "항공물류를 전공했습니다. 집에서 AI 수학을 독학했습니다. Solar API로 웹 프로젝트를 만들었습니다.";
  const cookie = await obtainGateCookie();
  const response = await fetchWorker(analyzeRequest(experience, cookie));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  const body = await response.json();
  assert.equal(body.source, "sample");
  assert.equal(body.model, null);
  assert.ok(Array.isArray(body.claims));
  assert.ok(body.claims.length >= 1 && body.claims.length <= 3);
  for (const claim of body.claims) {
    assert.equal(claim.tier, 0);
    assert.equal(claim.confidence, "확인 필요");
    assert.equal(claim.status, "pending");
    assert.ok(experience.includes(claim.quote));
  }
});

test("rejects oversized experience before any model call", async () => {
  const cookie = await obtainGateCookie();
  const response = await fetchWorker(analyzeRequest("가".repeat(10001), cookie));

  assert.equal(response.status, 413);
  const body = await response.json();
  assert.equal(body.error, "input_too_long");
  assert.equal(body.message, "경험은 10,000자 이내로 적어 주십시오. 지금 내용은 그대로 두고 넘치는 만큼만 줄여 주십시오.");
});

test("enforces input boundaries with actionable user messages", async () => {
  const cookie = await obtainGateCookie();
  const post = (experience) => fetchWorker(analyzeRequest(experience, cookie));

  const r19 = await post("가".repeat(19));
  assert.equal(r19.status, 400);
  const b19 = await r19.json();
  assert.equal(b19.error, "input_too_short");
  assert.equal(b19.message, "경험을 20자 이상 적어 주십시오.");

  const r20 = await post("가".repeat(20));
  assert.equal(r20.status, 200);
  assert.equal((await r20.json()).source, "sample");

  const r3000 = await post("가".repeat(3000));
  assert.equal(r3000.status, 200);
  assert.equal((await r3000.json()).source, "sample");
});

test("gate protects the analyze API with a signed HttpOnly session", async () => {
  const validExperience =
    "항공물류를 전공했습니다. 집에서 AI 수학을 독학했습니다. Solar API로 웹 프로젝트를 만들었습니다.";

  // 1) 비인증 분석 요청: JSON 401, 분석·비용 경로 미실행
  const unauthorized = await fetchWorker(analyzeRequest(validExperience));
  assert.equal(unauthorized.status, 401);
  const unauthorizedBody = await unauthorized.json();
  assert.equal(unauthorizedBody.error, "unauthorized");
  assert.ok(unauthorizedBody.message.includes("데모 코드"));

  // 2) 위조 쿠키 거부
  const forged = await fetchWorker(analyzeRequest(validExperience, "gp_gate=v1.9999999999.deadbeef"));
  assert.equal(forged.status, 401);

  // 3) 빈 코드 400 / 오답 401
  const empty = await fetchWorker(gateRequest("  "));
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error, "code_required");

  const wrong = await fetchWorker(gateRequest("wrong-code"));
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).error, "invalid_code");

  // 4) 올바른 코드 → 서명 쿠키 발급(HttpOnly/Secure/SameSite는 obtainGateCookie에서 검증) → 분석 허용
  const cookie = await obtainGateCookie();
  const statusCheck = await fetchWorker(
    new Request("http://localhost/api/gate", { headers: { cookie } }),
  );
  assert.deepEqual(await statusCheck.json(), { authorized: true });
  const authorized = await fetchWorker(analyzeRequest(validExperience, cookie));
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).source, "sample");

  // 5) fail-closed: 게이트 환경변수가 없으면 코드가 맞아도 503, 기존 세션도 무효(401)
  const savedCode = process.env.GATE_ACCESS_CODE;
  const savedSecret = process.env.GATE_SESSION_SECRET;
  delete process.env.GATE_ACCESS_CODE;
  delete process.env.GATE_SESSION_SECRET;
  try {
    const unconfigured = await fetchWorker(gateRequest(TEST_GATE_CODE));
    assert.equal(unconfigured.status, 503);
    assert.equal((await unconfigured.json()).error, "gate_not_configured");

    const closedAnalyze = await fetchWorker(analyzeRequest(validExperience, cookie));
    assert.equal(closedAnalyze.status, 401);
  } finally {
    process.env.GATE_ACCESS_CODE = savedCode;
    process.env.GATE_SESSION_SECRET = savedSecret;
  }
});

test("cookie policy: SameSite=Lax everywhere, Secure only outside local HTTP", async () => {
  const gatePost = (origin) =>
    fetchWorker(
      new Request(`${origin}/api/gate`, {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": testIp() },
        body: JSON.stringify({ code: TEST_GATE_CODE }),
      }),
    );

  // 운영 HTTPS 조건 → Secure 포함
  const https = await gatePost("https://gapproof.example");
  assert.equal(https.status, 200);
  const httpsCookie = https.headers.get("set-cookie") ?? "";
  assert.match(httpsCookie, /HttpOnly/i);
  assert.match(httpsCookie, /Secure/i);
  assert.match(httpsCookie, /SameSite=Lax/i);
  assert.match(httpsCookie, /Path=\//);
  assert.match(httpsCookie, /Max-Age=43200/); // 12시간
  assert.ok(!httpsCookie.includes(TEST_GATE_CODE));

  // localhost가 아닌 HTTP 호스트도 Secure 포함(생략은 localhost/127.0.0.1 한정)
  const httpRemote = await gatePost("http://gapproof.example");
  assert.match(httpRemote.headers.get("set-cookie") ?? "", /Secure/i);

  // 로컬 HTTP → Secure 생략 (obtainGateCookie에서 검증)
  const local = await gatePost("http://127.0.0.1");
  const localCookie = local.headers.get("set-cookie") ?? "";
  assert.doesNotMatch(localCookie, /Secure/i);
  assert.match(localCookie, /SameSite=Lax/i);

  // 데모 잠금(로그아웃): 쿠키 즉시 만료 + 이후 분석은 401
  const logout = await fetchWorker(new Request("http://localhost/api/gate", { method: "DELETE" }));
  assert.equal(logout.status, 200);
  const cleared = logout.headers.get("set-cookie") ?? "";
  assert.match(cleared, /gp_gate=;/);
  assert.match(cleared, /Max-Age=0/);
  assert.deepEqual(await logout.json(), { authorized: false });

  const afterLogout = await fetchWorker(
    analyzeRequest("항공물류를 전공했습니다. 집에서 AI 수학을 독학했습니다. Solar API로 웹 프로젝트를 만들었습니다."),
  );
  assert.equal(afterLogout.status, 401);
});

test("applies security headers on every response", async () => {
  const page = await render();
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  assert.equal(page.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(page.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);

  const api = await fetchWorker(analyzeRequest("가".repeat(30)));
  assert.equal(api.headers.get("x-content-type-options"), "nosniff");
});

test("masks obvious PII before analysis while keeping quote integrity", async () => {
  const cookie = await obtainGateCookie();
  const experience =
    "항공물류를 전공했고 웹 프로젝트를 만들었습니다. 제 이메일은 test@example.com 이고 연락처는 010-1234-5678 입니다.";
  const response = await fetchWorker(analyzeRequest(experience, cookie));
  assert.equal(response.status, 200);
  const body = await response.json();
  const serialized = JSON.stringify(body);
  // 원문 PII가 응답 어디에도 없다 (Solar로도 마스킹된 텍스트만 전송됨)
  assert.ok(!serialized.includes("test@example.com"));
  assert.ok(!serialized.includes("010-1234-5678"));
  assert.ok(serialized.includes("[이메일]"));
  // 마스킹 사실 고지 + 인용 검증은 마스킹 텍스트 기준으로 계속 동작
  assert.match(body.notice, /가리고 분석했습니다/);
  assert.deepEqual(body.masked, ["이메일", "전화번호"]);
  assert.ok(body.claims.length >= 1);
});

test("rate limits repeated calls per client key", async () => {
  const cookie = await obtainGateCookie();
  const fixedIp = "203.0.113.77";
  const experience = "항공물류를 전공했고 집에서 AI 수학과 웹을 독학하며 프로젝트를 만들었습니다.";
  for (let i = 0; i < 10; i += 1) {
    const ok = await fetchWorker(analyzeRequest(experience, cookie, fixedIp));
    assert.equal(ok.status, 200, `attempt ${i + 1}`);
  }
  const limited = await fetchWorker(analyzeRequest(experience, cookie, fixedIp));
  assert.equal(limited.status, 429);
  // 429 계약: Retry-After(60초 창과 일관) + no-store + 내부 키·IP·digest 비노출
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.match(limited.headers.get("cache-control") ?? "", /no-store/);
  const body = await limited.json();
  assert.equal(body.error, "rate_limited");
  assert.ok(body.message.includes("1분"));
  const limitedSerialized = JSON.stringify(body);
  assert.ok(!limitedSerialized.includes(fixedIp));
  assert.ok(!limitedSerialized.includes("ip:"));
  assert.ok(!limitedSerialized.includes("session:"));

  // 게이트 무차별 대입 방지: 같은 IP에서 오답 10회 이후 429
  const bruteIp = "203.0.113.88";
  for (let i = 0; i < 10; i += 1) {
    const wrong = await fetchWorker(gateRequest("wrong-code", bruteIp));
    assert.equal(wrong.status, 401, `gate attempt ${i + 1}`);
  }
  const gateLimited = await fetchWorker(gateRequest("wrong-code", bruteIp));
  assert.equal(gateLimited.status, 429);
  assert.equal(gateLimited.headers.get("retry-after"), "60");
  assert.match(gateLimited.headers.get("cache-control") ?? "", /no-store/);
  assert.equal((await gateLimited.json()).error, "rate_limited");
});

test("rate limit session fallback uses an irreversible digest key", async () => {
  // 소스 계약: 원본 토큰을 키에 쓰지 않고 SHA-256 digest + 네임스페이스만 사용,
  // 신뢰 IP는 CF-Connecting-IP뿐(X-Forwarded-For 미사용)
  const src = await readFile(new URL("../app/lib/rate-limit.ts", import.meta.url), "utf8");
  assert.match(src, /SHA-256/);
  assert.match(src, /session:\$\{/);
  assert.match(src, /anonymous:shared/);
  assert.match(src, /headers\.get\("cf-connecting-ip"\)/);
  // 주석 언급은 허용하되, 코드가 X-Forwarded-For를 실제로 읽지 않는지 검사
  assert.doesNotMatch(src, /headers\.get\(["']x-forwarded-for["']\)/i);
  assert.doesNotMatch(src, /slice\(-24\)/);

  const experience = "항공물류를 전공했고 집에서 AI 수학과 웹을 독학하며 프로젝트를 만들었습니다.";

  // 동일 세션(동일 쿠키, IP 없음) → 동일 digest 버킷: 11번째에서 429
  const cookieA = await obtainGateCookie();
  for (let i = 0; i < 10; i += 1) {
    const ok = await fetchWorker(analyzeRequest(experience, cookieA, null));
    assert.equal(ok.status, 200, `same-session attempt ${i + 1}`);
  }
  const limitedA = await fetchWorker(analyzeRequest(experience, cookieA, null));
  assert.equal(limitedA.status, 429);
  // 429 응답 어디에도 쿠키 원문·digest가 없다
  const rawToken = cookieA.split("=")[1];
  const responseText = JSON.stringify(await limitedA.json()) + JSON.stringify([...limitedA.headers.entries()]);
  assert.ok(!responseText.includes(rawToken));
  assert.ok(!/session:[0-9a-f]{8}/.test(responseText));

  // 다른 세션(만료초가 다른 토큰) → 다른 digest 버킷: 즉시 허용
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const cookieB = await obtainGateCookie();
  assert.notEqual(cookieA, cookieB);
  const allowedB = await fetchWorker(analyzeRequest(experience, cookieB, null));
  assert.equal(allowedB.status, 200);
});

test("enforces the Solar model allowlist", async () => {
  const cookie = await obtainGateCookie();
  const experience = "항공물류를 전공했고 집에서 AI 수학과 웹을 독학하며 프로젝트를 만들었습니다.";
  const post = (model) =>
    fetchWorker(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": testIp(), cookie },
        body: JSON.stringify({ experience, model }),
      }),
    );

  // 임의 모델 문자열 → 안전한 400 (요청 값 미반사)
  const evil = await post("totally-evil-model");
  assert.equal(evil.status, 400);
  const evilBody = await evil.json();
  assert.equal(evilBody.error, "model_not_allowed");
  assert.ok(!JSON.stringify(evilBody).includes("totally-evil-model"));

  // 허용 모델 → 정상 (키 없음 → 샘플 폴백, 실 Solar 호출 0건)
  const allowed = await post("solar-mini");
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).source, "sample");

  // 모델 미지정 → 기본 모델 경로로 정상
  const none = await post(undefined);
  assert.equal(none.status, 200);

  // 단일 출처 계약: 서버·클라이언트가 같은 allowlist 모듈 사용, 클라이언트는 선택 값만 전송
  const models = await readFile(new URL("../app/lib/models.ts", import.meta.url), "utf8");
  assert.match(models, /solar-pro3/);
  assert.match(models, /isAllowedModel/);
  const page = await readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8");
  assert.match(page, /SOLAR_MODELS\.map/);
  assert.match(page, /model: modelId/);
  // Gate 5(#41): native select → 카드형 다이얼로그(요약+변경 버튼, 공식/자체 구분)
  assert.match(page, /aria-label="AI 분석 모델 선택"/);
  assert.match(page, /모델 변경/);
  assert.match(page, /평가 중/); // 검증 전 항목을 장점으로 꾸미지 않는 계약
});

test("fails closed when the Workers rate limit binding is unavailable", async () => {
  const cookie = await obtainGateCookie();
  const experience = "항공물류를 전공했고 집에서 AI 수학과 웹을 독학하며 프로젝트를 만들었습니다.";

  for (const mode of ["binding-missing", "binding-error"]) {
    process.env.RATE_LIMIT_TEST_MODE = mode;
    try {
      // analyze: 503 + rate_limit_unavailable, Solar/폴백 경로 미도달
      const analyze = await fetchWorker(analyzeRequest(experience, cookie));
      assert.equal(analyze.status, 503, `analyze ${mode}`);
      const body = await analyze.json();
      assert.equal(body.error, "rate_limit_unavailable");
      assert.match(analyze.headers.get("cache-control") ?? "", /no-store/);
      assert.ok(!("claims" in body)); // 분석 결과 미생성 = 비용 경로 미실행

      // gate: 정답 코드여도 코드 검증을 계속하지 않고 503 종료(쿠키 미발급)
      const gate = await fetchWorker(gateRequest(TEST_GATE_CODE));
      assert.equal(gate.status, 503, `gate ${mode}`);
      assert.equal((await gate.json()).error, "rate_limit_unavailable");
      assert.ok(!gate.headers.get("set-cookie"));
    } finally {
      delete process.env.RATE_LIMIT_TEST_MODE;
    }
  }
});
