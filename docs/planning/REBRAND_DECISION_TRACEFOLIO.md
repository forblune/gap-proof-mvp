# 리브랜딩 — GapProof → Tracefolio

결정일: 2026-07-28 · 감사일: 2026-07-28

## 1. 브랜드 정의

**Tracefolio** = Trace + Portfolio

- **Trace**: 사용자가 실제로 해온 경험, 행동, 학습, 결과물, 선택과 과정의 흔적
- **Portfolio**: 그 흔적을 정리해 자신과 다른 사람이 이해하고 확인할 수 있는 형태

핵심 의미: **"흩어진 경험의 흔적을 근거 있는 포트폴리오로 만든다."**

- 공식 태그라인: **"경험의 흔적을, 보여줄 수 있는 근거로."**
- 보조 설명: "해온 일을 정리하고, 근거 수준을 확인해, 보여줄 수 있는 포트폴리오로 만듭니다."
- 한국어 표기: 트레이스폴리오 (공식 표기는 `Tracefolio`로 통일)
- 소문자 `tracefolio`는 URL·파일명 등 기술적으로 필요한 곳에서만

핵심 가치: 신뢰 · 명확성 · 정직한 근거 · 성장 · 사용자 주도성

**Tracefolio가 하지 않는 것**: 취업 가능성 계산 · 적성 판정 · 사용자가 하지 않은 성과 생성 ·
AI 후보를 검증된 역량처럼 표현 · 퀴즈 통과만으로 수행 능력 인정 · 사용자 기록을 외부기관
자격처럼 표시 · 근거 없는 최종 카드 발급.

## 2. Forblune과의 관계

`Tracefolio by Forblune` — Forblune은 회사·운영 브랜드, Tracefolio는 Forblune이 운영하는 제품입니다.

| 위치 | 표기 |
|---|---|
| 랜딩·헤더·서비스 UI 주 브랜드 | `Tracefolio` |
| 푸터·About·개인정보처리방침·이용약관 | `Tracefolio by Forblune` 또는 `운영: Forblune` |
| 발급 문서 서비스 브랜드 | `Tracefolio` |
| 발급 문서 운영 주체 | `Forblune` |
| Proof Card 소유 주체 | 사용자 — `Created with Tracefolio` / `Tracefolio에서 작성된 기록` |

메인 화면마다 Forblune을 반복 노출하지 않습니다. 법적 운영 주체·서비스 제공자를 표시해야 할 때만 씁니다.

**Forblune이나 Tracefolio가 사용자의 능력을 외부기관처럼 인증했다는 오해를 주지 않습니다.**
다섯 층위를 계속 구분합니다: 사용자 경험 기록 / AI가 추출한 후보 / Tracefolio에서 만든 학습 완료 기록 /
사용자가 첨부한 외부기관 자격증 / 실제 외부 발급기관이 검증한 자격.

## 3. 이름 변경 감사 (2026-07-28 기준)

저장소 전체 발견 건수: `GapProof` 302 · `gapproof` 85 · `gap-proof` 64 · `GAPPROOF` 25.

**grep 결과를 0으로 만드는 것이 목표가 아닙니다.** 아래 분류에 따라 처리합니다.

### A. 사용자 노출 브랜드명 → `Tracefolio`로 변경

앱 화면·메타데이터. 대상 파일과 건수:

| 파일 | 건수 | 비고 |
|---|---|---|
| `app/demo/page.tsx` | 16 | 여정 전체 문구 |
| `app/lib/recognition.ts` | 11 | 인정 체계 설명 문구 |
| `app/who/page.tsx` | 6 | |
| `app/page.tsx` | 6 | 랜딩 |
| `app/why/page.tsx` | 5 | |
| `app/privacy/page.tsx` | 5 | B 항목과 겹침 |
| `app/components/info-shell.tsx` | 4 | 헤더·푸터 |
| `app/about/page.tsx` | 4 | B 항목과 겹침 |
| `app/terms/page.tsx` | 3 | B 항목과 겹침 |
| `app/layout.tsx` | 3 | title·metadata·OG |
| `app/how-it-works/page.tsx` | 3 | |
| `app/guide/page.tsx` | 3 | |
| `app/components/stack-converge.tsx` | 3 | 시각화 중앙 라벨 |
| `app/technology/page.tsx` | 2 | |
| `app/manifest.ts` | 2 | PWA `name`·`short_name` |
| `app/components/auth-shell.tsx` | 2 | 인증 화면 |
| `app/lib/resources.ts`, `app/lib/models.ts`, `app/lib/engine.ts` | 각 1~ | 문구 확인 필요 |
| `app/api/analyze/route.ts`, `app/api/lesson/route.ts` | 각 1~ | 사용자에게 가는 메시지만 |
| `README.md` | 현재 제품 설명 부분만 | |

### B. 운영·법적 문서 → 문맥에 맞춰 `Tracefolio` / `Forblune`

- `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/about/page.tsx`
- `app/lib/recognition.ts`의 `CERTIFICATE_ISSUER`
  - 현재: `"Forblune · GapProof"` → **`"Tracefolio by Forblune"`**
  - ⚠️ 이 값은 발급 문서에 인쇄되고 **고유번호 생성(`certificateSerial`)에도 들어갑니다**.
    바꾸면 같은 학습 기록이라도 번호가 달라집니다. 실사용자 데이터 0건인 지금이 가장 안전합니다.
  - `CERTIFICATE_USAGE_NOTE.wording`의 표기 예시도 함께 변경

### C. 기술 식별자 → **이번 단계에서 유지**

사용자에게 보이는 브랜드명이 아니라 기술 식별자입니다. 브랜드명을 바꾸려고 무리하게 변경하지 않습니다.

| 대상 | 값 | 유지 이유 |
|---|---|---|
| GitHub 저장소 | `forblune/gap-proof-mvp` | 링크·이슈·PR 이력이 끊깁니다 |
| 로컬 프로젝트 경로 | `gap-proof-mvp` | |
| Cloudflare Worker 이름 | `gapproof-mvp` (`wrangler.jsonc:3`) | 바꾸면 **새 Worker가 생성**되고 기존 배포·시크릿이 따라오지 않습니다 |
| `package.json` name | `gapproof-mvp` | |
| Supabase 프로젝트 이름·project ref | (변경 없음) | |
| DB 테이블명·마이그레이션 이름·적용된 SQL | (변경 없음) | 이미 적용된 것을 다시 쓰지 않습니다 |
| Storage bucket | `feedback-attachments` | 브랜드명이 들어 있지 않습니다 |
| 환경변수 이름 | (변경 없음) | |
| 내부 API 경로 | `/api/analyze`, `/api/lesson`, `/api/feedback`, `/api/gate` | |
| localStorage 테마 키 | `gapproof-theme` (`app/layout.tsx:44`, `app/components/theme-toggle.tsx:9`) | 바꾸면 기존 사용자의 테마 설정이 초기화됩니다 |
| 도메인 상수 | `https://gapproof.forblune.com` (`layout.tsx:5`, `sitemap.ts:3`, `robots.ts:6`) | **DNS 승인 전까지 유지** — §6 도메인 계획 참고 |

### D. 과거 기록·마이그레이션·변경 이력 → 유지 (사실 왜곡 금지)

- `supabase/migrations/*.sql`의 `-- 적용 버전: gapproof_*` 주석 — **실제로 그 이름으로 적용된 사실**입니다.
  고치면 운영 기록과 어긋납니다.
- `docs/worklog/`, `docs/evidence/`, `docs/devlog/`, `docs/rc/`, `docs/quality-loop/` — 당시 기록입니다.
- 필요 시 `GapProof(현 Tracefolio)`로만 보충 설명합니다.

### E. 테스트의 사용자 문구 → 새 브랜드명으로 수정

- `tests/rendered-html.test.mjs`
- `tests/recognition.test.mjs` (`CERTIFICATE_ISSUER` 검증 포함)
- `tests/e2e/evidence-gate.spec.ts`, `tests/e2e/user-flow.spec.ts`, `tests/e2e/home.spec.ts`
- `tests/e2e/pre-merge-verification.spec.ts`

### F. 기술 식별자를 검증하는 테스트 → 기존 이름 유지

- `tests/auth-callback.test.mjs` (도메인·origin 검증)
- `tests/e2e/run-id.ts` (실행 식별자)
- 레거시 `tests/e2e/*.cjs` (현재 스위트가 사용하지 않음)

### Allowlist

`GapProof`/`gapproof`가 **의도적으로 남는** 위치는 위 C·D 전체입니다.
이 문서가 allowlist 역할을 하며, 변경 시 함께 갱신합니다.

## 4. Proof Card 명칭

일괄 변경하지 않고 검토합니다. 후보: `Tracefolio Card` / `Trace Card` / `근거 카드`.
데이터 모델(`proof_cards` 테이블, `ProofCard` 타입)과 외부 링크 호환성은 건드리지 않고,
**사용자에게 보이는 명칭만** 결정합니다. 결정 근거는 리브랜딩 구현 커밋에 기록합니다.

## 5. 브랜드 컬러

방향: **Deep Indigo + Teal + Cool Neutral**

- Deep Indigo: 신뢰, 전문성, 분석, 안정
- Teal: 연결, 발견, 성장, 다음 단계
- Cool Neutral: 긴 문장과 분석 결과의 가독성

**노란색은 대표 강조색으로 쓰지 않습니다.** 랜딩 첫 화면의 노란 밑줄은 색만 바꾸지 않고
Tracefolio의 시각 언어(가는 상승형 trace line 또는 `brand-soft` 배경 강조)로 다시 설계합니다.
한 화면에서 강조 효과는 한 곳에만 씁니다.

초기 토큰 값은 출발점이며, WCAG 대비 검사에서 실패하면 브랜드 방향을 유지한 채 명도만 조정합니다.
실제 채택 값과 측정 대비는 구현 시 이 문서에 갱신합니다.

이번 단계는 **라이트 모드를 우선 완성**합니다.

## 6. 도메인 전환 — HOLD (사용자 승인 필요)

목표: `tracefolio.forblune.com` · 기존 `gapproof.forblune.com` 유지 후 301 리디렉션.

**구현·검증 완료 후 계획을 보고하고, 명시적 승인을 받기 전까지 아래를 변경하지 않습니다.**

- DNS
- Cloudflare Worker custom domain
- Supabase Site URL 및 redirect allowlist
- Google OAuth redirect URI
- Kakao OAuth redirect URI 및 JavaScript 허용 도메인
- canonical URL · sitemap · robots · Open Graph URL
- 공유 링크 · 이메일 링크
- 기존 북마크와 Proof Card 공유 링크 호환

## 7. 착수 조건 (이 문서 작성 시점 상태)

| 조건 | 상태 |
|---|---|
| P0·P1 기능 수정 완료 | 완료 (`5fd5687`) |
| lint | 통과 (신규 0건, 기존 21건) |
| typecheck | 통과 (신규 0건, 기존 `worker/index.ts` 2건) |
| build | 통과 |
| unit·integration | 133/133 통과 |
| 단일 격리 E2E | **실행 중** |
| 인증·RLS·Storage 검증 | 완료 — RLS 미적용 0, `anon` 권한 0, 위험 권한 0, 버킷 비공개, 어드바이저 0 |
| 테스트 DB·Storage 잔여물 | 0건 |
| commit·PR 보존 | `5fd5687`, PR #82 (Draft) |
| 리뷰어 지적 해결·재검토 | 지적 해결 완료, **재검토 대기** |
