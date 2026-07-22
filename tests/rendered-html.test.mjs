import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function fetchWorker(request) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

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

async function render() {
  return fetchWorker(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
  );
}

test("server-renders the GapProof sample journey", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>GapProof \| 공백을 증거로<\/title>/i);
  assert.match(html, /Solar 샘플 데모/);
  assert.match(html, /공백을 지우지 않고/);
  assert.match(html, /실제 Solar를 호출하고, 없으면 원문 기반 샘플/);
  assert.match(html, /체험 기록 저장에 동의/);
  assert.match(html, /취업 가능성이나 적성을 판정하지 않습니다/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("keeps AI claims bounded and user-confirmed", async () => {
  const [page, layout, packageJson, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type ClaimStatus = "pending" \| "confirmed" \| "rejected"/);
  assert.match(page, /AI의 제안보다 당신의 확인이 먼저예요/);
  assert.match(page, /거절한 항목은 카드와 추천에서 빠집니다/);
  assert.match(page, /원문 공유는 직접 선택해요/);
  assert.match(page, /기록 삭제/);
  assert.match(page, /샘플 데이터/);
  assert.match(layout, /title:\s*"GapProof \| 공백을 증거로"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test("returns a traceable sample when a Solar key is unavailable", async () => {
  const experience =
    "항공물류를 전공했습니다. 집에서 AI 수학을 독학했습니다. Solar API로 웹 프로젝트를 만들었습니다.";
  const response = await fetchWorker(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experience }),
    }),
  );

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
  const response = await fetchWorker(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experience: "가".repeat(3001) }),
    }),
  );

  assert.equal(response.status, 413);
  const body = await response.json();
  assert.equal(body.error, "input_too_long");
});
