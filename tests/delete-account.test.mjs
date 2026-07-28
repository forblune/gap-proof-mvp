// 개인정보 처리방침이 "탈퇴하면 모두 삭제된다" 고 적는 이상, 탈퇴 함수는 사용자 소유 테이블을
// 하나도 빠뜨리면 안 된다.
//
// 실제로 있던 문제 두 가지:
//  1) 사용자 데이터 테이블은 auth.users 를 참조하는데 0001 의 app.delete_account() 는
//     auth.users 행을 지우지 않고 profiles 만 soft-delete 했다. 연쇄 삭제가 발화하지 않아
//     proof_cards·learning_records·certificates·experiences·analyses·external_credentials·
//     feedback_* 가 그대로 남았다.
//  2) 그 0001 자체가 운영 프로젝트에 적용된 적이 없다. app 스키마가 없어 함수도 없었다.
//     앱 코드도 0001 의 객체를 한 번도 참조하지 않는다.
//
// 그래서 삭제 진입점은 public.delete_my_account() 다(auth.uid() 만 쓰므로 app 스키마와 무관).
// 이 테스트는 "새 사용자 테이블을 추가하고 탈퇴 함수에 넣는 걸 잊는" 다음 번 재발을 막는다.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../supabase/migrations/", import.meta.url).pathname;
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const ALL_SQL = FILES.map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");

function userOwnedTables(sql) {
  const found = new Set();
  const re = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  for (const [, name, body] of sql.matchAll(re)) {
    if (/user_id\s+uuid[^,]*references/.test(body)) found.add(name);
  }
  return found;
}

function deleteFunctionBody(sql) {
  const blocks = [...sql.matchAll(/create or replace function public\.delete_my_account\(\)[\s\S]*?\nend \$\$;/g)];
  assert.ok(blocks.length > 0, "public.delete_my_account() 정의를 찾지 못했습니다");
  return blocks[blocks.length - 1][0];
}

// 0001 이 적용된 환경에만 있는 테이블은 to_regclass 로 확인한 뒤 동적으로 지운다.
// 정적 delete 문이 아니라 배열 원소로 등장하므로 그것도 "덮고 있다" 로 인정한다.
function covers(body, table) {
  return (
    new RegExp(`delete from public\\.${table}\\s+where user_id`).test(body) ||
    new RegExp(`'${table}'`).test(body)
  );
}

test("탈퇴 함수가 사용자 소유 테이블을 하나도 빠뜨리지 않는다", () => {
  const tables = userOwnedTables(ALL_SQL);
  assert.ok(tables.size >= 8, `사용자 테이블 탐지 실패(${tables.size}개) — 정규식이 스키마 형식과 어긋났습니다`);
  const body = deleteFunctionBody(ALL_SQL);
  const missing = [...tables].filter((t) => !covers(body, t));
  assert.deepEqual(missing, [], `탈퇴 시 삭제되지 않는 사용자 테이블: ${missing.join(", ")}`);
});

test("프로필도 함께 지운다 — 방침이 '프로필까지 삭제' 라고 적었다", () => {
  assert.match(deleteFunctionBody(ALL_SQL), /delete from public\.profiles where id = v_uid/);
});

test("첨부는 제출보다 먼저, 외부 증빙은 경험보다 먼저 지운다(외래키 순서)", () => {
  const body = deleteFunctionBody(ALL_SQL);
  const at = (table) => body.indexOf(`delete from public.${table}`);
  assert.ok(at("feedback_attachments") < at("feedback_submissions"), "첨부를 제출보다 먼저 지워야 합니다");
  assert.ok(at("external_credentials") < at("experiences"), "외부 증빙을 경험보다 먼저 지워야 합니다");
});

test("app 스키마에 의존하지 않는다 — 운영에는 app 스키마가 없다", () => {
  const body = deleteFunctionBody(ALL_SQL);
  assert.ok(!/\bapp\./.test(body), "탈퇴 함수가 app 스키마를 참조합니다 — 운영에는 존재하지 않습니다");
  assert.match(body, /auth\.uid\(\)/);
});
