// 실제 컴포넌트 소스에 대한 접근성 회귀 방지.
//
// 왜 필요한가: 피드백 위젯은 로그인한 사용자에게만 렌더된다. E2E 스위트에는 세션이 없어
// 위젯의 실제 마크업에 한 번도 도달하지 못했고, 그래서 "이름 없는 파일 입력"이
// 심사에서 발견될 때까지 살아남았다. 손으로 옮겨 적은 마크업을 검사하는 테스트는
// 컴포넌트가 바뀌어도 조용히 통과한다 — 그래서 파일 자체를 읽는다.
//
// 이 테스트는 구조를 확인할 뿐 렌더 결과를 대신하지 않는다. axe 검사는 E2E에 그대로 둔다.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const widget = readFileSync(join(root, "app/components/feedback-widget.tsx"), "utf8");
const signup = readFileSync(join(root, "app/signup/page.tsx"), "utf8");
const demo = readFileSync(join(root, "app/demo/page.tsx"), "utf8");

test("파일 입력에 접근성 이름이 있다 — sr-only 는 포커스도 되고 트리에도 남는다", () => {
  const fileInput = widget.match(/<input[^>]*type="file"[\s\S]{0,400}?\/>/);
  assert.ok(fileInput, "type=\"file\" 입력을 찾지 못했습니다");
  assert.match(fileInput[0], /aria-label="[^"]+"/, "파일 입력에 aria-label 이 없습니다");
});

test("첨부 빼기 버튼이 어떤 파일인지 말한다 — '빼기' 만으로는 구분되지 않는다", () => {
  assert.match(widget, /aria-label=\{`첨부 빼기: \$\{[^}]+\}`\}/);
});

test("필수 표시를 별표에 의존하지 않는다 — 스크린리더는 * 를 읽지 않는다", () => {
  assert.match(widget, /<legend>분류 \(필수\)<\/legend>/);
  assert.match(widget, /피드백 글 \(필수\)/);
  // 라벨 안에 홀로 남은 별표가 없어야 한다.
  assert.equal(/>\s*\*\s*</.test(widget), false, "라벨에 * 표시가 남아 있습니다");
});

test("보낼 수 없는 이유를 화면에 적는다 — 비활성 버튼만 두면 원인을 추측하게 된다", () => {
  assert.match(widget, /role="status"/);
  assert.match(widget, /cert-missing/);
  // 가입 화면도 같은 계약을 지킨다(심사 지적: 여기만 이유가 없었다).
  assert.match(signup, /role="status"/);
  assert.match(signup, /cert-missing/);
});

test("민감정보 안내 문구가 지정된 그대로 남아 있다", () => {
  assert.match(
    widget,
    /캡처 이미지에 이름, 이메일, 전화번호 등 민감한 정보가 포함되지 않았는지 확인해 주세요\./,
  );
});

test("학습 질문 입력칸의 이름이 입력 중에 바뀌지 않는다", () => {
  // label 이 도움말·글자수까지 감싸면 한 글자 칠 때마다 입력칸의 접근성 이름이 바뀐다.
  assert.match(demo, /htmlFor=\{fieldId\}/, "질문 라벨이 입력칸을 직접 가리키지 않습니다");
  assert.match(demo, /aria-describedby=\{`\$\{fieldId\}-guide \$\{fieldId\}-count`\}/);
});

test("증서·피드백의 필수 안내가 습니다체를 유지한다", () => {
  // 사용자 인용문은 원문 그대로 두되, 우리가 쓰는 안내 문구에는 해요체를 남기지 않는다.
  for (const [name, source] of [["feedback-widget", widget], ["signup", signup]]) {
    // 해요체 종결 어미를 폭넓게 잡는다. "알려주세요" 처럼 "하세요" 가 아닌 형태도 포함해야 한다.
    // 이 두 파일에는 사용자 인용문이 없으므로 인용을 잘못 잡을 걱정이 없다.
    // 사용자가 문구를 그대로 지정한 민감정보 안내는 예외다(지시가 문체 규칙보다 우선한다).
    // 매치가 어미만 잡을 수 있어, 걸러내기는 검사 전에 문장 단위로 한다.
    const scanned = source.replace(
      "캡처 이미지에 이름, 이메일, 전화번호 등 민감한 정보가 포함되지 않았는지 확인해 주세요.",
      "",
    );
    const violations = [...scanned.matchAll(/[가-힣]+(세요|해요|어요|아요|에요|예요|나요)\s*[.?!<]/g)]
      .map((match) => match[0].trim());
    assert.deepEqual(violations, [], `${name} 에 해요체가 남아 있습니다: ${violations.join(", ")}`);
  }
});
