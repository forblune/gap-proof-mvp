# 배포 환경 설정 — 빌드 시점 값과 런타임 값의 구분

이 문서는 **운영에서 계정 기능이 통째로 꺼져 있던 사고**의 재발을 막기 위한 것이다.
`/signup`·`/login` 이 폼 대신 "계정 기능이 아직 연결되지 않았습니다" 를 띄웠고,
가입한 계정이 0건이었다. 빌드는 통과했고 테스트도 통과했고 화면도 열렸다 —
계정 기능만 없었다.

## 무엇이 잘못됐었나

`app/lib/supabase.ts` 는 공개 설정을 **모듈 최상위**에서 읽는다.

```ts
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
```

vinext(Vite)는 빌드할 때 `process.env` 에 **실제로 존재하는** `NEXT_PUBLIC_*` 만 클라이언트
번들에 인라인한다. 값이 없으면 `process.env` 를 빈 객체로 인라인하므로 번들에는 이렇게 남는다.

```js
var ba = {}.NEXT_PUBLIC_SUPABASE_URL ?? ``;   // 항상 빈 문자열
```

그러면 `isSupabaseConfigured()` 가 false 가 되고, 인증 화면들이 조기 반환해 안내 문구만 남는다.

원인은 하나였다. **이 두 변수가 저장소 어디에도 적혀 있지 않았다.**
`.dev.vars.example` 은 런타임 변수 7개만 안내했고, `wrangler.jsonc` 에는 `vars`·`build` 가 없고,
CI 도 없다. 배포는 사람이 직접 `npm run build && wrangler deploy` 를 실행하는 방식이라
그 사람의 셸에 값이 없으면 조용히 빈 채로 나갔다.

## 두 종류를 구분한다

| | 빌드 시점 (build-time) | 런타임 (runtime) |
|---|---|---|
| 파일 | `.env.local` (또는 `.env`) | `.dev.vars` (로컬) / `wrangler secret` (운영) |
| 읽는 주체 | vinext(Vite)가 번들에 인라인 | Worker 가 요청 처리 중 `readServerEnv()` 로 읽음 |
| 어디까지 가나 | **브라우저 번들에 그대로 실림** | 서버에만 남음 |
| 접두사 | `NEXT_PUBLIC_` 만 클라이언트로 나감 | 접두사 없음 |
| 예 | `NEXT_PUBLIC_SUPABASE_URL`<br>`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `UPSTAGE_API_KEY`, `GEMINI_API_KEY`,<br>`GATE_SESSION_SECRET`, `KMOOC_SERVICE_KEY` |

**흔한 함정**: `.dev.vars` 에 `NEXT_PUBLIC_*` 을 적어도 빌드에는 전달되지 않는다.
`.dev.vars` 는 Wrangler 런타임 전용 파일이고 Vite 는 읽지 않는다.
같은 이유로, 이 문제를 `wrangler secret put` 으로 고치려는 시도는 효과가 없다.

vinext 의 빌드 시점 탐색 순서(Next.js 와 동일, 앞이 우선):

```
process.env > .env.<mode>.local > .env.local > .env.<mode> > .env
```

## 설정 절차

### 1. 로컬 준비 (한 번만)

```bash
cp .env.example .env.local
```

`.env.local` 을 열어 두 값을 채운다. 값은 Supabase 대시보드
→ Project Settings → API 에서 확인한다.

- `NEXT_PUBLIC_SUPABASE_URL` — 프로젝트 URL (`https://<project-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable 키 (`sb_publishable_…`)
  - 구형 프로젝트라 publishable 키가 없다면 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 대신 쓴다.

`.env.local` 은 `.gitignore` 대상이라 커밋되지 않는다. `.env.example` 만 커밋된다(이름만 담겨 있다).

이 두 값은 **브라우저에 노출되도록 설계된 공개 값**이다. 숨기려 애쓸 필요가 없고,
실제 보호는 RLS 가 한다(`supabase/migrations/0002~0005`). 다만 아래는 절대 넣지 않는다.

- `service_role` 키, secret 키(`sb_secret_…`)
- OAuth client secret, DB 비밀번호, 관리자 토큰

`NEXT_PUBLIC_` 접두사가 붙은 값은 예외 없이 브라우저 번들에 그대로 실린다.

### 2. 배포

```bash
npm run deploy
```

이 한 줄이 다음을 순서대로 수행한다.

1. `predeploy` → `scripts/preflight-env.mjs`
   빌드 시점 공개 설정이 없거나 형식이 틀리면 **여기서 멈춘다**(종료코드 1).
   `NEXT_PUBLIC_*` 에 비밀값처럼 보이는 값이 들어와도 멈춘다.
2. `npm run build`
3. `scripts/verify-build-output.mjs`
   산출물에 공개 설정이 실제로 인라인됐는지, 비밀값이 섞이지 않았는지 확인한다.
   preflight 를 통과해도 빌드 도구가 값을 넣지 않으면 여기서 잡힌다.
4. `wrangler deploy`

두 검사 모두 **값을 출력하지 않는다.** 변수 이름과 존재 여부, 건수만 보고한다.

### 3. 런타임 비밀값 (별도)

서버에서만 쓰는 값은 Wrangler 쪽이다. 빌드와 무관하다.

```bash
npx wrangler secret put UPSTAGE_API_KEY
npx wrangler secret put GEMINI_API_KEY
# 이름 목록은 .dev.vars.example 참고
```

## 인증 콜백 쿠키 — HttpOnly 를 붙이면 로그인이 조용히 실패한다

같은 조사에서 두 번째 결함이 나왔다. `/auth/callback` 이 세션 쿠키에 `HttpOnly` 를 강제로
붙이고 있었다. 언뜻 더 안전해 보이지만, 이 앱에서는 **로그인 자체를 무효로 만든다.**

이 앱은 세션을 브라우저에서 읽는다 — `/profile` 같은 화면은 클라이언트 컴포넌트이고
`createBrowserClient` 로 세션을 조회한다. 브라우저 클라이언트는 `document.cookie` 만 볼 수 있고
`HttpOnly` 쿠키는 거기에 나타나지 않는다. 그래서 메일 확인 링크·비밀번호 재설정 링크·소셜
로그인으로 들어온 사용자는 **세션이 정상적으로 만들어져도 화면에서는 계속 로그아웃 상태**였다.
오류도 로그도 남지 않는다.

`@supabase/ssr` 자신도 같은 이유로 기본값을 `httpOnly: false` 로 정해 두었다
(`utils/constants.js` 의 `DEFAULT_COOKIE_OPTIONS`). 지금은 그 규약을 따른다 —
속성 조합은 `app/lib/auth-cookie.ts` 한 곳에서 정하고, `HttpOnly` 는 호출자가 명시적으로
요구할 때만 붙인다. 회귀는 `tests/auth-callback.test.mjs` 가 막는다.

보호 수준이 낮아진 것이 아니다. 비밀번호 로그인 경로는 이미 `createBrowserClient` 가
`document.cookie` 로 같은 토큰을 non-HttpOnly 로 쓰고 있었다. 콜백만 홀로 달랐고 그 불일치가
링크·소셜 경로를 망가뜨렸을 뿐이다. 실제 방어선은 그대로다 — RLS, 짧은 수명의 access token,
`SameSite=Lax`, `Secure`.

> 세션을 서버에서만 읽는 구조로 바꾸면 `HttpOnly` 를 되살릴 수 있다. 그것은 인증 화면 전체를
> 서버 컴포넌트로 옮기는 별도 작업이고, 이 P0 의 범위가 아니다.

## 알려진 함정

- **`wrangler deploy` 가 종료코드 1 로 끝나도 업로드는 성공한 경우가 있다.**
  workers.dev 서브도메인이 등록돼 있지 않아 배포 *이후* 확인 단계에서 실패하는 것이다.
  `Uploaded gapproof-mvp` 줄이 보였다면 업로드는 됐다. 실제 반영 여부는
  운영 주소를 직접 열어 확인한다.
- **메일 링크는 금방 만료된다.** 확인·재설정 링크를 몇 시간 뒤에 누르면 `otp_expired`
  (`Email link is invalid or has expired`)로 실패한다. 검증할 때는 받은 즉시 누른다.
- **화면이 뜨자마자 누른 첫 클릭은 먹지 않을 수 있다.** 인증 화면은 클라이언트 컴포넌트라
  하이드레이션 전에는 제출이 그냥 새로고침으로 끝난다(입력에 `name` 이 없어 값이 URL 에
  실리지는 않는다). 자동 검증 스크립트는 입력값이 유지되는지 확인한 뒤에 눌러야 한다.

## 아직 남은 외부 설정 (사람이 해야 함)

### 1. Supabase URL 설정 — 지금은 모든 메일 링크가 사용자의 PC 로 향한다

**가장 급하다.** 앱은 가입·재설정 요청에 올바른 운영 주소를 함께 보낸다.

```ts
// app/signup/page.tsx
options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile` }
```

그런데 실제로 발송된 메일의 링크는 이렇게 생겼다(2026-07-29 운영에서 3회 확인).

```
https://<project-ref>.supabase.co/auth/v1/verify?token=…&type=signup&redirect_to=http://localhost:3000
```

`redirect_to` 가 요청한 값이 아니라 `http://localhost:3000` 이다. Supabase 는 허용 목록에 없는
주소를 거부하고 **Site URL 로 되돌린다.** 즉 Site URL 이 아직 개발용 `http://localhost:3000` 이고,
운영 콜백 주소가 목록에 없다.

결과: 실사용자가 확인 메일이나 재설정 메일의 링크를 누르면 자기 PC 의 `localhost:3000` 으로
이동한다. 그런 서버는 없으므로 화면이 열리지 않고, 가입도 재설정도 끝나지 않는다.
가입 요청과 메일 발송까지는 정상이라 겉보기에는 아무 문제가 없어 보인다.

**사람이 해야 할 일** — Supabase 대시보드 → Authentication → URL Configuration:

- **Site URL** 을 `https://gapproof.forblune.com` 으로 바꾼다.
- **Redirect URLs** 에 다음을 추가한다.
  - `https://gapproof.forblune.com/auth/callback`
  - `http://localhost:3000/auth/callback` (로컬 개발용)

바꾼 뒤에는 새 계정으로 가입해 메일 링크가 `redirect_to=https://gapproof.forblune.com/auth/callback…`
로 오는지 눈으로 확인한다. 링크의 유효시간이 짧으니(만료되면 `otp_expired`) 받은 즉시 누른다.

> 링크 이후의 흐름 자체는 이미 운영에서 검증했다. 메일 링크가 준 `code` 를 `/auth/callback` 에
> 넣으면 세션이 만들어지고, 새로고침해도 유지되고, 로그아웃하면 다시 막힌다.
> 남은 것은 Supabase 가 그 주소로 보내 주게 만드는 설정 하나뿐이다.

### 2. 커스텀 SMTP — 지금 상태로는 실사용자가 가입할 수 없다

공개 설정을 넣은 뒤 실제로 가입을 시도해 본 결과, **두 번째 가입부터 429
`over_email_send_rate_limit`** 이 떨어졌다. Supabase 기본 메일 서비스는 프로젝트당
시간당 약 2통으로 제한되며, 원래 개발용이다. 앱은 이 오류를 "메일을 너무 자주
보냈습니다" 로 정직하게 안내하지만, 사용자가 늘면 대부분이 가입 확인 메일을 받지 못한다.

해결: Supabase 대시보드 → Project Settings → Authentication → SMTP Settings 에서
자체 SMTP(예: Resend, SendGrid, Amazon SES)를 연결한다. 연결 전까지 "가입 가능"이라고
판정하면 안 된다.

### 3. 소셜 로그인 provider

Google·Kakao 버튼은 화면에 있지만 Supabase 대시보드 → Authentication → Providers 에서
각각 켜고 외부 콘솔(Google Cloud, Kakao Developers)에 콜백 주소를 등록해야 동작한다.
미설정 상태에서는 `/auth/v1/authorize?provider=google` 이 400 `provider is not enabled` 를
돌려준다. **버튼이 보인다는 이유로 사용 가능하다고 판정하지 않는다.**
