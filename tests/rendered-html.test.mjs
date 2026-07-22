import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
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

test("server-renders the GapProof sample journey", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>GapProof \| 공백을 증거로<\/title>/i);
  assert.match(html, /Solar 샘플 데모/);
  assert.match(html, /공백을 지우지 않고/);
  assert.match(html, /실제 Solar 호출 전 단계/);
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
