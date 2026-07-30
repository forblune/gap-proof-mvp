# GapProof 배포 가이드 — Cloudflare Workers + forblune.com

> 이 앱은 처음부터 **Cloudflare Workers**용으로 만들어졌어요(`vite-cloudflare` 플러그인 · workerd · `nodejs_compat`).
> `vinext build`가 `dist/server/wrangler.json`(worker 이름 **`gapproof-mvp`**, `compatibility_date 2026-05-15`)을 자동 생성합니다.
> 아래 단계 중 **로그인·시크릿·도메인 연결은 건희님이 직접** 실행해요(제가 계정에 로그인할 수 없어서요). 명령은 그대로 복사해 쓰면 됩니다.

## 0. 준비물
- 맥, Node 22+ (이미 `npm run dev` 되는 상태)
- Cloudflare 계정 (forblune.com이 이 계정에 있음)
- Upstage Solar API 키

## 1. 로컬에서 실제 Solar 확인 (배포 전 점검)
```bash
cd "/Users/gh/.codex/.chatgpt-projects/g-p-688497ac51e4819190bd3ceceee938e9/gap-proof-mvp"
printf 'UPSTAGE_API_KEY=%s\nSOLAR_MODEL=solar-pro3\n' '여기에_키_붙여넣기' > .env.local
npm run dev
```
브라우저에서 http://localhost:3000 → STEP 1 → "Solar로 역량 후보 찾기".
우측 상단 배지가 초록색 **"Solar 실연결 · solar-pro3"**이면 OK. (`.env.local`은 `.gitignore`로 커밋 안 됨)

## 2. Cloudflare 로그인
```bash
npx wrangler login
```
브라우저가 열리고 Cloudflare 계정 인증 → 허용. (계정이 여러 개면 배포 시 `CLOUDFLARE_ACCOUNT_ID=<계정ID>`를 앞에 붙이세요.)

## 3. 배포
```bash
npm run deploy
```
- 이 한 줄이 `preflight-env` → `npm run build` → `verify-build-output` → `wrangler deploy` 순으로 실행됩니다.
- **`npx vinext deploy` 를 쓰지 마세요.** 배포 자체는 되지만 앞뒤 검사가 없습니다. 빌드 시점 공개
  설정(`NEXT_PUBLIC_SUPABASE_*`)이 빠진 채로 배포돼 운영에서 계정 기능이 통째로 꺼진 적이 있고,
  그때 쓴 명령이 이 명령입니다. 자세한 내용은 `docs/operations/DEPLOY_ENV.md` 를 보세요.
- 검사에서 멈추면 배포하지 말고 원인을 고치세요. 값이 없다는 뜻이지 도구 오류가 아닙니다.
- 성공하면 `https://gapproof-mvp.<서브도메인>.workers.dev` 주소가 나와요. 먼저 그 주소로 동작을 확인하세요.

## 4. 프로덕션 Solar 키(시크릿) 등록
로컬 `.env.local`은 배포본에 포함되지 않아요. 배포된 worker에는 시크릿으로 넣습니다.
```bash
npx wrangler secret put UPSTAGE_API_KEY
# 프롬프트가 뜨면 실제 키 붙여넣고 엔터
```
모델을 고정하려면(선택):
```bash
npx wrangler secret put SOLAR_MODEL   # 값: solar-pro3
```
등록 후 다시 `npm run deploy`.

> `wrangler secret` 은 **런타임** 값입니다. 브라우저가 쓰는 빌드 시점 공개 설정
> (`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)은 여기로 넣을 수 없고,
> 배포를 실행하는 디렉터리의 `.env.local` 에서만 옵니다. 두 가지를 섞지 마세요 —
> 구분은 `docs/operations/DEPLOY_ENV.md` 에 정리돼 있습니다.

> ⚠️ 확인 포인트: 배포 주소에서 분석했을 때 배지가 계속 **"샘플 데모"**면, 프로덕션에서 `process.env`로 시크릿이 안 넘어온 것일 수 있어요.
> 그 경우 알려주시면 분석 라우트(`app/api/analyze/route.ts`)가 Cloudflare `env` 바인딩에서 키를 읽도록 바꿔 확실히 연결해 드릴게요. (앱은 그동안에도 샘플로 안전 동작)

## 5. forblune.com 연결 (커스텀 도메인)
Cloudflare 대시보드에서:
1. **Workers & Pages → gapproof-mvp → Settings → Domains & Routes → Add**
2. **Custom Domain** 선택 → `gapproof.forblune.com` 입력 → 추가
3. forblune.com이 이미 Cloudflare에 있으므로 DNS 레코드가 자동 생성되고, 1~2분 내 인증서 발급.

원하면 서브도메인 이름은 바꿔도 돼요(예: `try.forblune.com`, `app.forblune.com`). 루트(`forblune.com`)에 바로 붙이는 것도 가능하지만, 다른 용도로 쓸 수 있으니 서브도메인을 권장해요.

## 6. 최종 확인
- https://gapproof.forblune.com 접속 → STEP 1~4 진행
- 배지 초록색 "Solar 실연결" 확인
- STEP 4에서 "PDF로 저장 · 인쇄"로 증거카드/Gap Brief 출력 확인

## 참고
- 배포 worker 이름을 바꾸려면 `package.json`의 `"name"`을 수정(현재 `gapproof-mvp`) 후 재빌드.
- 비용: Cloudflare Workers 무료 티어로 데모 트래픽은 충분. Solar API 사용량은 Upstage 과금.
- 보안: 키를 채팅·깃·클라이언트 코드에 절대 넣지 마세요. `wrangler secret`은 암호화 저장돼요.
- 대회 제출용으로 이 라이브 URL을 데모 링크로 쓰면 좋아요(본선 PT 백업으로는 `GapProof_prototype.html`도 있음).
