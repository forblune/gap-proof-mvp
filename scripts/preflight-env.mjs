// 배포 전 검사 — 빌드 시점에 필요한 공개 설정이 없으면 **배포를 막는다**.
//
// 왜 필요한가:
// app/lib/supabase.ts 는 process.env.NEXT_PUBLIC_SUPABASE_* 를 모듈 최상위에서 읽는다.
// vinext(Vite)는 빌드할 때 process.env 에 실제로 존재하는 NEXT_PUBLIC_* 만 클라이언트 번들에
// 인라인한다. 없으면 process.env 를 빈 객체로 인라인해서 `{}.NEXT_PUBLIC_SUPABASE_URL ?? ""`
// 가 되고, isSupabaseConfigured() 가 false 가 되어 /signup·/login 이 폼 대신
// "계정 기능이 아직 연결되지 않았습니다" 를 띄운다.
//
// 이게 조용히 성공하는 배포였다. 빌드도 통과하고 테스트도 통과하고 화면도 열린다 —
// 다만 계정 기능만 통째로 없다. 그래서 배포 앞에 이 검사를 세운다.
//
// **값은 절대 출력하지 않는다.** 변수 이름과 존재 여부, 형식 판정 결과만 말한다.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODE = process.env.NODE_ENV === "development" ? "development" : "production";

// vinext(=Next.js) 와 같은 우선순위로 읽는다. 앞이 우선이고, 이미 있는 키는 덮지 않는다.
const DOTENV_FILES = [`.env.${MODE}.local`, ".env.local", `.env.${MODE}`, ".env"];

function loadEnv() {
  const env = { ...process.env };
  const used = [];
  for (const file of DOTENV_FILES) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    used.push(file);
    const parsed = parseEnv(readFileSync(path, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (env[key] === undefined) env[key] = value;
    }
  }
  return { env, used };
}

/** JWT 페이로드의 role 만 본다. 토큰 자체는 어디에도 남기지 않는다. */
function jwtRole(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/** 공개 변수에 들어오면 안 되는 값인지 판정한다. 무엇이 걸렸는지 이름만 돌려준다. */
function secretShape(value) {
  if (/^sb_secret_/.test(value)) return "secret 키(sb_secret_)";
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)) return "개인키 블록";
  if (/^GOCSPX-/.test(value)) return "Google OAuth client secret";
  const role = jwtRole(value);
  if (role && role !== "anon") return `role="${role}" JWT`;
  return null;
}

const problems = [];
const { env, used } = loadEnv();

// 1) 프로젝트 URL
const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
if (!url) {
  problems.push("NEXT_PUBLIC_SUPABASE_URL 이 비어 있습니다.");
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url)) {
  // 형식만 본다. 값은 출력하지 않는다.
  problems.push("NEXT_PUBLIC_SUPABASE_URL 의 형식이 https://<project-ref>.supabase.co 가 아닙니다.");
}

// 2) 공개 키 — publishable 우선, 구형 프로젝트는 anon 으로 대체 가능
const publishable = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
const anon = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const publicKey = publishable || anon;
if (!publicKey) {
  problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (또는 NEXT_PUBLIC_SUPABASE_ANON_KEY) 가 비어 있습니다.");
}

// 3) 공개 변수에 비밀값이 들어오지 않았는지 — 이건 넣는 순간 브라우저 번들에 그대로 실린다
for (const name of Object.keys(env)) {
  if (!name.startsWith("NEXT_PUBLIC_")) continue;
  const shape = secretShape((env[name] ?? "").trim());
  if (shape) problems.push(`${name} 에 ${shape} 로 보이는 값이 들어 있습니다. 공개 변수는 브라우저 번들에 그대로 실립니다.`);
}

console.log("배포 전 검사 — 빌드 시점 공개 설정");
console.log(`  읽은 파일: ${used.length ? used.join(", ") : "(없음 — process.env 만 사용)"}`);
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${url ? "있음" : "없음"}`);
console.log(`  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${publishable ? "있음" : "없음"}`);
console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY(대체): ${anon ? "있음" : "없음"}`);

if (problems.length) {
  console.error("\n배포를 중단합니다. 이대로 배포하면 계정 기능이 꺼진 채로 나갑니다.\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\n해결: .env.example 을 .env.local 로 복사해 값을 채우십시오(.env.local 은 커밋되지 않습니다).");
  console.error("      절차는 docs/operations/DEPLOY_ENV.md 를 보십시오.\n");
  process.exit(1);
}

console.log("\n통과 — 빌드에 공개 설정이 전달됩니다.");
