// 빌드 직후 검사 — 브라우저로 나가는 산출물을 두 방향에서 본다.
//
//  1) 공개 설정이 **실제로 인라인됐는가**. preflight 가 통과해도 빌드 도구가 값을 넣지 않으면
//     소용없다. 실제로 그런 상태로 배포돼 있었다: 클라이언트 번들에
//     `{}.NEXT_PUBLIC_SUPABASE_URL ?? ""` 가 남아 항상 빈 문자열이었다.
//  2) 비밀값이 **섞여 들어가지 않았는가**. NEXT_PUBLIC_ 접두사를 잘못 붙이면 그대로 실린다.
//
// **값은 출력하지 않는다.** 몇 건인지와 통과 여부만 말한다.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_DIR = join(ROOT, "dist", "client");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(js|mjs|html|css|json)$/.test(name)) out.push(path);
  }
  return out;
}

if (!existsSync(CLIENT_DIR)) {
  console.error(`빌드 산출물이 없습니다: ${CLIENT_DIR}. 먼저 npm run build 를 실행하십시오.`);
  process.exit(1);
}

const files = walk(CLIENT_DIR);
const problems = [];

// ── 1) 공개 설정이 인라인됐는가 ─────────────────────────────────────────────
const PROJECT_URL = /https:\/\/[a-z0-9-]{8,}\.supabase\.(?:co|in)/;
const UNRESOLVED = /\{\s*\}\s*\.NEXT_PUBLIC_SUPABASE_/;

let urlFiles = 0;
let unresolvedFiles = 0;
for (const file of files) {
  const body = readFileSync(file, "utf8");
  if (PROJECT_URL.test(body)) urlFiles += 1;
  if (UNRESOLVED.test(body)) unresolvedFiles += 1;
}

if (unresolvedFiles > 0) {
  problems.push(
    `클라이언트 번들 ${unresolvedFiles}개에 치환되지 않은 process.env.NEXT_PUBLIC_SUPABASE_* 참조가 남아 있습니다. ` +
    "빌드 시점에 값이 전달되지 않았습니다 — 이대로 배포하면 계정 기능이 꺼집니다.",
  );
}
if (urlFiles === 0) {
  problems.push("클라이언트 번들 어디에도 Supabase 프로젝트 URL 이 인라인되지 않았습니다.");
}

// ── 2) 비밀값이 섞이지 않았는가 ─────────────────────────────────────────────
// 주의: Supabase 라이브러리 자체가 "sb_secret_" 접두사 판별 코드와 JSDoc 의 "service_role"
// 문자열을 포함한다. 그래서 **접두사 뒤에 실제 키 길이가 따라오는 경우**만 잡는다.
const SECRET_PATTERNS = [
  ["secret 키(sb_secret_)", /sb_secret_[A-Za-z0-9_-]{20,}/],
  ["Google OAuth client secret", /GOCSPX-[A-Za-z0-9_-]{20,}/],
  ["개인키 블록", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS 액세스 키", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
];

const secretHits = [];
for (const file of files) {
  const body = readFileSync(file, "utf8");
  for (const [label, pattern] of SECRET_PATTERNS) {
    if (pattern.test(body)) secretHits.push({ label, file: file.replace(ROOT + "/", "") });
  }
  // JWT 중 role 이 anon 이 아닌 것(=service_role 등)만 문제 삼는다.
  for (const token of body.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      if (payload.role && payload.role !== "anon") {
        secretHits.push({ label: `role="${payload.role}" JWT`, file: file.replace(ROOT + "/", "") });
      }
    } catch {
      // 형식이 JWT 가 아니면 무시 — 우연히 비슷한 문자열일 수 있다
    }
  }
}
for (const hit of secretHits) problems.push(`${hit.file} 에 ${hit.label} 로 보이는 값이 있습니다.`);

console.log("빌드 산출물 검사 (dist/client)");
console.log(`  검사한 파일: ${files.length}개`);
console.log(`  Supabase 프로젝트 URL 이 인라인된 파일: ${urlFiles}개`);
console.log(`  치환되지 않은 NEXT_PUBLIC_SUPABASE_* 참조가 남은 파일: ${unresolvedFiles}개`);
console.log(`  비밀값으로 보이는 문자열: ${secretHits.length}건`);

if (problems.length) {
  console.error("\n검사 실패:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}

console.log("\n통과 — 공개 설정은 들어갔고 비밀값은 없습니다.");
