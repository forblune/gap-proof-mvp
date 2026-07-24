# Issue #16 — 버전 조사와 해결책 결정 (2026-07-24)

## 버전 비교표

| 구성요소 | package.json 선언 | 잠금파일/실설치 | 레지스트리 최신 | 비고 |
|---|---|---|---|---|
| wrangler | 4.92.0 (정확 핀) | 4.92.0 | 4.114.0 | |
| miniflare | (wrangler·vite-plugin 종속) | 4.20260515.0 | **4.20260722.0** | 버전명 = 지원 날짜 세대 |
| workerd | (miniflare 종속) | 1.20260515.1 | — | 오류 메시지 기준 최대 지원일 **2026-05-22** |
| @cloudflare/vite-plugin | 1.37.1 | 1.37.1 (miniflare 4.20260515.0·wrangler 4.92.0 자체 고정) | 1.47.0 | |
| vinext | 0.0.50 | 0.0.50 | 1.0.0-beta.3 | 메이저 점프(베타) |
| Node / npm | >=22.13.0 | v26.3.1 / 11.16.0 | — | |

## 원인

`wrangler.jsonc`의 `compatibility_date "2026-07-23"`은 커밋 `d3c87ce`(2026-07-23)에서 파일이 처음 생길 때
**스캐폴드 생성일이 그대로 기입된 값**이다. 같은 날 설치된 workerd(1.20260515.1)는 최대 2026-05-22까지만
지원하므로, 이 설정으로 `npm run dev`는 **한 번도 기동된 적이 없다**(MiniflareCoreError, `before-dev-error.log`).

## 검토한 해결책

1. **도구 제한적 업그레이드** — 기각.
   - 최신 miniflare(4.20260722.0)조차 지원 상한이 2026-07-22라 **어떤 업그레이드로도 07-23은 만족 불가**.
   - @cloudflare/vite-plugin 1.37.1이 miniflare·wrangler 버전을 자체 의존성으로 고정 → wrangler 단독 업그레이드로는 dev 경로의 miniflare가 안 바뀜. vite-plugin(1.47.0)·vinext(1.0.0-beta.3 메이저) 동반 업그레이드가 필요해 제출 직전 breaking 위험이 큼.
2. **compatibility_date를 도구 지원 최대일로 정정** — **채택**.
   - 날짜가 의도된 시맨틱 핀이 아니라 스캐폴드 부산물임이 git 이력으로 확인됨.
   - 2026-05-22는 "임의 과거"가 아니라 **핀 고정된 툴체인이 지원하는 최대일**.
   - 빌드 산출물 `dist/server/wrangler.json`이 루트 값을 상속하므로, 이 정정으로 **로컬 dev와 배포 아티팩트의 런타임 의미가 정확히 일치**하게 됨(이전에는 로컬에서 검증 불가능한 미래 날짜로 배포될 뻔함).
   - 07-23 시맨틱으로 검증된 동작이 전무하므로(기동 불가였음) 하향으로 인한 회귀 대상 자체가 없음.

## 변경

- `wrangler.jsonc`: `compatibility_date` `"2026-07-23"` → `"2026-05-22"` + 근거 주석 3줄. (compatibility_flags 등 다른 항목 무변경)

## 변경 후 검증 (실제 dev 서버, 하네스 아님)

- `npm run dev` 정상 기동(`after-dev-startup.log`) — MiniflareCoreError 소멸
- `GET /` 200 + `<title>GapProof | 공백을 증거로</title>` 렌더
- `POST /api/analyze`: 20자 정상 → 200 `source:"sample"`(실 Solar 호출 없음 확인), 19자 → 400 `input_too_short`+메시지
- 5개 뷰포트(360/390/768/1024/1440) 전체 여정 스모크: overflow 0·console error 0·#4/#5 개선치 유지(`dev-server-smoke-metrics.json`)
- `npm test` 5/5(빌드 포함), `npm run lint` 통과, `git diff --check` 통과, tsc는 기존 3건(템플릿 잔재)만
- 빌드 산출물 상속 확인: `dist/server/wrangler.json` → `"compatibility_date":"2026-05-22"`, `"compatibility_flags":["nodejs_compat"]`

## Cloudflare 배포 런타임과 로컬 동작 차이 기록

- 프로덕션 Cloudflare 런타임은 최신 날짜를 지원하지만, **Worker의 실제 동작 시맨틱은 배포 설정의 compatibility_date로 고정**된다. 다음 배포부터 산출물 날짜 = 2026-05-22 = 로컬 dev와 동일 시맨틱.
- 현재 라이브 배포본의 날짜는 저장소 밖(소실 소스 세대)이라 확인 불가 — 배포는 여전히 #6 완료+승인 전 금지.
- **부수 관찰(#7 직결)**: dev 기동 시 `.dev.vars` 로드 로그가 있음에도 `/api/analyze`는 `source:"sample"`(model null) 반환 →
  workerd 런타임에서 `process.env` 기반 `readEnv`(route.ts:19-25)로는 시크릿이 주입되지 않는 정황(또는 해당 키 항목 부재 —
  파일 내용은 열람하지 않아 단정 불가). #7의 "프로덕션 환경변수 주입 방식 검증" 항목에서 `cloudflare:workers` env 접근으로의
  전환 검토가 필요하다는 실측 근거.
