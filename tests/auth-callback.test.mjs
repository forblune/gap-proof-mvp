// 콜백 리다이렉트 대상 검증 — 열린 리다이렉트(CWE-601) 회귀 방지.
// 심사에서 "/\evil.com" 이 https://evil.com/ 으로 해석돼 통과하던 결함이 발견됐다.
import test from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../app/lib/safe-redirect.ts";

const ORIGIN = "https://gapproof.example.com";

test("같은 사이트 상대 경로는 그대로 통과한다", () => {
  assert.equal(safeNext("/profile", ORIGIN), "/profile");
  assert.equal(safeNext("/demo?sample=1", ORIGIN), "/demo?sample=1");
  assert.equal(safeNext("/a/b#c", ORIGIN), "/a/b#c");
});

test("절대 URL·프로토콜 상대 경로는 거부한다", () => {
  assert.equal(safeNext("https://evil.com/x", ORIGIN), "/profile");
  assert.equal(safeNext("http://evil.com", ORIGIN), "/profile");
  assert.equal(safeNext("//evil.com/x", ORIGIN), "/profile");
});

test("dot-segment 우회를 거부한다 — 반환값이 다시 해석돼 //evil.com 이 되는 경로", () => {
  for (const attempt of ["/..//evil.com", "/.//evil.com", "/a/../..//evil.com", "/x/..//evil.com/y"]) {
    const result = safeNext(attempt, ORIGIN);
    assert.equal(new URL(result, ORIGIN).origin, ORIGIN, `${attempt} → ${result} 가 외부로 나간다`);
    assert.ok(!result.startsWith("//"), `${attempt} → ${result} 가 프로토콜 상대 경로다`);
  }
});

test("역슬래시 우회를 거부한다 — WHATWG URL은 \\ 를 / 와 같게 취급한다", () => {
  for (const attempt of ["/\\evil.com", "/\\\\evil.com", "\\/evil.com", "/a\\b", "\\\\evil.com"]) {
    const result = safeNext(attempt, ORIGIN);
    assert.equal(result, "/profile", `${attempt} 를 통과시켰다`);
    // 결과를 실제로 해석해도 우리 origin 을 벗어나지 않아야 한다.
    assert.equal(new URL(result, ORIGIN).origin, ORIGIN);
  }
});

test("어떤 입력이든 결과는 항상 우리 origin 안에 머문다", () => {
  const attempts = [
    null, "", "   ", "javascript:alert(1)", "data:text/html,x",
    "https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com",
    "/legit", "/legit?a=1", "///evil.com", "/%2F%2Fevil.com",
    "/..//evil.com", "/.//evil.com", "/a/../..//evil.com", "/x/..//evil.com/y",
  ];
  for (const attempt of attempts) {
    const result = safeNext(attempt, ORIGIN);
    assert.ok(result.startsWith("/"), `${attempt} → ${result} 가 상대 경로가 아니다`);
    assert.equal(new URL(result, ORIGIN).origin, ORIGIN, `${attempt} → ${result} 가 외부로 나간다`);
  }
});

test("빈 값이면 안전한 기본 경로를 쓴다", () => {
  assert.equal(safeNext(null, ORIGIN), "/profile");
  assert.equal(safeNext("", ORIGIN), "/profile");
});
