// 개인정보 처리방침이 "탈퇴하면 모두 삭제된다" 고 적는 이상, 탈퇴 함수는 사용자 소유 테이블을
// 하나도 빠뜨리면 안 된다.
//
// 실제로 있던 문제: 사용자 데이터 테이블 대부분은 auth.users 를 참조하는데 app.delete_account() 는
// auth.users 행을 지우지 않고 profiles 만 soft-delete 했다. 그래서 연쇄 삭제가 발화하지 않고
// proof_cards·learning_records·certificates·experiences·analyses·external_credentials·
// feedback_* 가 그대로 남았다. 방침은 삭제됐다고 말하고 DB 에는 남아 있는 상태였다.
//
// 이 테스트는 "새 사용자 테이블을 추가하고 탈퇴 함수에 넣는 걸 잊는" 다음 번 재발을 막는다.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../supabase/migrations/", import.meta.url).pathname;
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const ALL_SQL = FILES.map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");

// profiles 는 user_id 가 아니라 id 가 곧 사용자이고, 재가입 시 초대 코드 재사용을 막기 위해
// 의도적으로 soft-delete 를 유지한다. 표시 이름 등 식별 정보는 지운다.
const SOFT_DELETE_ONLY = new Set(["profiles"]);

function userOwnedTables(sql) {
  const found = new Set();
  const re = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  for (const [, name, body] of sql.matchAll(re)) {
    if (/user_id\s+uuid[^,]*references/.test(body)) found.add(name);
  }
  return found;
}

// 마지막으로 정의된 app.delete_account() 본문 — create or replace 가 여러 번 나오므로 최신 것을 본다.
function latestDeleteAccountBody(sql) {
  const blocks = [...sql.matchAll(/create or replace function app\.delete_account\(\)[\s\S]*?\nend \$\$;/g)];
  assert.ok(blocks.length > 0, "app.delete_account() 정의를 찾지 못했습니다");
  return blocks[blocks.length - 1][0];
}

test("탈퇴 함수가 사용자 소유 테이블을 하나도 빠뜨리지 않는다", () => {
  const tables = userOwnedTables(ALL_SQL);
  assert.ok(tables.size >= 8, `사용자 테이블 탐지 실패(${tables.size}개) — 정규식이 스키마 형식과 어긋났습니다`);
  const body = latestDeleteAccountBody(ALL_SQL);
  const missing = [...tables].filter(
    (t) => !SOFT_DELETE_ONLY.has(t) && !new RegExp(`delete from public\\.${t}\\s+where user_id`).test(body),
  );
  assert.deepEqual(missing, [], `탈퇴 시 삭제되지 않는 사용자 테이블: ${missing.join(", ")}`);
});

test("profiles 는 soft-delete 하되 표시 이름은 지운다", () => {
  const body = latestDeleteAccountBody(ALL_SQL);
  assert.match(body, /update public\.profiles set display_name = null, deleted_at = now\(\)/);
});

test("첨부는 제출보다 먼저, 외부 증빙은 경험보다 먼저 지운다(외래키 순서)", () => {
  const body = latestDeleteAccountBody(ALL_SQL);
  const at = (table) => body.indexOf(`delete from public.${table}`);
  assert.ok(at("feedback_attachments") < at("feedback_submissions"), "첨부를 제출보다 먼저 지워야 합니다");
  assert.ok(at("external_credentials") < at("experiences"), "외부 증빙을 경험보다 먼저 지워야 합니다");
});
