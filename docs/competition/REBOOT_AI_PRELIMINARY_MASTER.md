# GapProof — 리부트 AI 활용대회 예선 1차 제출 마스터 문서

**작성일**: 2026-07-28 (제출 목표: 2026-07-29) · **버전**: 1차본 · **상태 표기**: `[구현됨]` 현재 코드/운영에 존재 · `[코드 검증]` 소스코드를 직접 열람해 확인 · `[테스트 확인]` 자동화 테스트로 확인 · `[운영 확인]` 운영 사이트에서 직접 확인 · `[가설]` 아직 사용자/기관 검증 전 · `[예정]` 계획이며 미구현

이 문서는 `GapProof_제품기획_기준서_v3.0.pdf`, `GapProof_원페이지_기획정의서_v3.0.pdf`, `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md`, `docs/planning/GAPPROOF_ROADMAP_TO_2026-08-03.md`, `docs/planning/GAPPROOF_NEXT_PR_SPEC.md`, 실제 코드(`app/`), `docs/devlog/`, PR #78(`perf/lighthouse-90`) 검증 결과를 근거로 작성했다. 사용자 수·기관 반응·성과는 지어내지 않았으며, 확인되지 않은 항목은 `[가설]`로 명시한다.

---

## 1. 한 문장 정의

> GapProof는 전공 밖 학습과 공백기의 시도를, Solar가 원문 근거가 있는 역량 후보로 구조화하고 사용자가 직접 확인한 증거만 목표 직무의 격차와 이번 주 행동으로 연결하는 전환 설계 서비스다.

**한 줄로 다시 말하면**: 판정도, 강의 추천도 아닙니다. GapProof는 **증거를 만드는 서비스**입니다.

`[구현됨]` 위 한 문장 정의는 원페이지 기획정의서 v3.0의 한 문장 정의를 그대로 채택했으며, `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` §2.1에서 실제 첫 화면 카피("공백을 지우지 않고, 증거로 바꿉니다")와 ALIGNED로 확인됐다.

## 2. 문제·기획 배경·스토리

**만든 사람의 경험**(`app/about/page.tsx`에 이미 게시됨, `[구현됨]`): 항공물류를 전공하면서 AI 수학과 웹을 독학했고, Upstage Solar API를 연결한 한국어 상담 MVP(MindHub)를 만들어 본 경험이 있다. 문제는 "배우지 않은 것"이 아니라 "전공 밖에서 배운 것을 어떤 직무 역량으로 설명해야 하는지가 늘 애매했다"는 데 있었다.

**시장의 문제**(기준서 §1.1~1.3 근거): 이력서 양식은 학력·경력을 요구하지만, 전공 밖 독학·소규모 프로젝트·돌봄이나 아르바이트 같은 비정형 경험은 "경력"으로 번역되지 못한 채 버려진다. 기존 서비스들은 두 극단으로 갈린다 — (a) 직업 추천/적성 검사류는 판정을 내리지만 근거를 보여주지 않고, (b) 강의 추천 플랫폼은 학습을 권하지만 그 학습이 실제로 무엇을 증명하는지 확인하지 않는다.

**GapProof의 답**: 판정도, 강의 추천도 아닌 **증거 만들기**. AI(Solar)는 원문에서 역량 후보를 뽑아내는 데까지만 관여하고, 그 후보가 진짜 증거가 되는지는 반드시 사용자가 원문을 보고 확인한다. 확인된 증거만 격차·행동으로 이어진다.

**한 문장 페인포인트**(`app/why/page.tsx:23`, `[구현됨]`): "많은 사람이 '저는 한 게 없어요'라고 말합니다. 하지만 대화를 나눠 보면 돌봄, 아르바이트, 커뮤니티 운영, 독학처럼 실제로 한 행동이 잔뜩 나옵니다. 문제는 경험의 부재가 아니라, 그 경험을 직무의 언어로 옮겨 본 적이 없다는 것입니다."

## 3. 목표 사용자

`[구현됨/가설 혼재 — 명확히 구분]`

- **대회 제출 기준 첫 사용자**(기준서 §4.1): 18~34세 전환청년 — 전공과 희망 직무가 어긋나거나, 학업·취업 사이 공백/이탈/전환 경험이 있고, 비공식 학습이나 소규모 프로젝트 경험을 가진 사람. 첫 접점 채널은 청년일자리센터, 두 번째는 대학 취업지원팀/진로센터로 상정한다. `[가설]` — 실제 이 채널을 통한 유입은 아직 검증되지 않았다.
- **장기 비전**(기준서 §4.1, 대회 범위와 명시적으로 분리): 모든 전환기의 사람(재취업, 커리어 전환, 육아휴직 복귀 등). 이번 제출에서는 기능으로 구현하지 않는다.
- **부차 사용자**: 상담/교육 관계자(청년센터 상담사, 대학 진로상담사) — Gap Brief를 상담 자료로 활용하는 대상. `[가설]` — 8/3 이전 1명 인터뷰 예정(§13 참고), 아직 미실시.

## 4. 서비스 흐름과 핵심 화면

`[구현됨]` (`app/demo/page.tsx`, 실제 코드 확인)

| STEP | 화면 표제 | 내용 |
|---|---|---|
| STEP 0 | 게이트 | 접근 코드 또는 샘플 체험, 동의 체크(선택 항목 포함), 모델 선택(Pro 3 기본) |
| STEP 1 · 경험함 | "학적 밖에 있던 경험을 적어주세요" | 자유 텍스트 입력, 이메일·전화번호 등 PII 자동 마스킹 |
| STEP 2 · 사용자 확인 | "AI의 제안보다 당신의 확인이 먼저입니다" | Solar(또는 샘플) 역량 후보 카드 + 원문 인용 + 확인/거절 |
| STEP 3 · 먼저 알아보기 | "AI가 아니라 당신이 직접 확인하는 단계입니다" | 최우선 격차 역량에 연결된 학습/제도 검색 링크(YouTube·K-MOOC·고용24·온통청년) — 건너뛰기 가능 |
| STEP 4 · 목표직무 비교 | "미래 전체가 아니라, 이번 주 한 걸음을 찾습니다" | 목표직무 선택, 격차 지도, 이번 주 행동 후보, 선택형 학습확인 퀴즈 |
| STEP 5 · 증거에서 행동까지 | "설명이 아니라, 바로 실행할 다음 걸음이 생겼습니다" | 증거카드 + Gap Brief 결과 |

**중요한 정직한 한계**(`[코드 검증]`, `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` §2.5 인용): STEP3("먼저 알아보기")은 STEP4의 격차 지도와 같은 최우선 격차 데이터를 사용하지만, 화면 순서상 격차가 사용자에게 확인되기 **전에** 노출된다. 이는 기준서 §6.4("강의 추천은 GapProof의 시작이 아니라 확인된 격차를 닫는 행동 중 하나다")와 CONFLICT로 감사 문서에 이미 기록되어 있으며, STEP3↔STEP4 순서를 맞바꾸는 최소 수정이 `docs/planning/GAPPROOF_NEXT_PR_SPEC.md`의 근접 2순위 후보로 명시돼 있다. **`[예정]`** — 이번 제출 시점에는 아직 미수정 상태이며, 시연에서는 STEP3을 건너뛰어 이 CONFLICT가 심사에 노출되는 것을 최소화한다(`docs/competition/THREE_MINUTE_DEMO_SCRIPT.md` 참고).

## 5. 검증된 기술 스택

`[코드 검증]` (`package.json`, `wrangler.jsonc` 직접 확인, 2026-07-28)

| 영역 | 실제 사용 기술 | 버전 |
|---|---|---|
| 프레임워크 | Next.js (App Router 스타일 API 위에서 vinext로 구동) | 16.2.6 |
| UI 런타임 | React + React DOM (Server Components) | 19.2.6 |
| 빌드/번들 | Vite + `vinext`(Vite 기반 RSC 프레임워크) + `@vitejs/plugin-rsc` | vite 8.0.13 / vinext 0.0.50 |
| 배포 대상 | Cloudflare Workers (`workerd` 런타임) | `wrangler` 4.92.0, `@cloudflare/vite-plugin` 1.37.1 |
| 스타일 | Tailwind CSS 4 | 4.2.1 |
| 언어 | TypeScript(strict) | 5.9.3 |
| ORM(코드상 존재, 이 기능 영역에서는 미사용) | Drizzle ORM | 0.45.2 |
| 단위 테스트 | Node.js 내장 `node:test` | Node ≥22.13.0 |
| e2e 테스트 | Playwright + `@axe-core/playwright` | 1.62+ |
| 성능 측정 | Lighthouse CLI | 13.4.1 |
| 린트 | ESLint 9.39.4 + `eslint-config-next` | 16.2.6 |
| LLM | Upstage Solar API(외부 HTTP 호출, `/api/analyze`) | — |

**정직한 사실 하나**: Supabase MCP 커넥터가 이 환경에 연결되어 있지만, 이번 감사(`docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` §2.8)에서 확인했듯 실제 GapProof 애플리케이션 코드(`app/`)에는 Supabase 데이터 쓰기 경로가 전혀 없다 — `app/technology/page.tsx`가 이를 명시적으로 밝히고 있다. Drizzle ORM도 `package.json`에 의존성으로 존재하나 이 기능 영역 코드에서 사용되지 않는다.

## 6. 시스템 구조

상세 다이어그램과 컴포넌트별 설명은 `docs/competition/SYSTEM_ARCHITECTURE.md` 참고. 요약:

1. 사용자 브라우저 → Cloudflare Workers(`workerd`)가 정적 자산(Assets 바인딩, gzip/brotli 압축)과 API 라우트를 함께 서빙.
2. `/api/gate`, `/api/analyze`는 Cloudflare Workers Rate Limiting API 바인딩(각 10회/60초)으로 보호.
3. `/api/analyze`가 Upstage Solar를 호출하거나(`Solar 실연결` 배지), 샘플 모드에서는 실제 API를 호출하지 않고 규칙 기반 샘플 데이터를 반환(`Solar 샘플 데모` 배지로 화면에 명확히 구분).
4. 서버 응답은 `app/lib/engine-v2.ts`의 `sanitizeClaimsV2`(원문 substring 대조)·`sanitizeHypotheses`(판정성 어휘 필터)를 거쳐 신뢰 가능한 후보만 클라이언트로 전달.
5. 클라이언트는 사용자가 확인한 증거만으로 `app/lib/engine.ts`의 `tierFromLink`·`competencyStrength`·`computeGapMap`을 실행해 격차·증거등급을 계산(서버 저장 없음, 브라우저 로컬 상태).
6. 개인 원문·분석 결과는 서버에 영속 저장하지 않으며, 외부 기관/국가로 전송하는 코드 경로가 없음(`docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` §2.8에서 grep으로 확인).

## 7. Solar·규칙·사용자 확인의 역할 분리

`[코드 검증]` (`app/lib/engine-v2.ts` 직접 확인)

| 역할 | 담당 | 코드 근거 |
|---|---|---|
| 역량 후보 제안 | Solar(AI) | `/api/analyze` → Upstage Solar 호출 |
| 원문에 없는 인용 폐기 | 규칙(코드) | `quoteInSource()`, `engine-v2.ts:48-51,85` — substring 미일치 시 폐기 |
| 판정성 어휘("적합","천직","적성","합격","보장" 등) 직업가설 폐기 | 규칙(코드) | `VERDICT_WORDS` 필터, `engine-v2.ts:37,65` |
| 최종 확정 | 사용자 | STEP2에서 카드별 "맞아요/아니요" 클릭 — 확인 전까지 다음 단계 진행 버튼 비활성 |
| 등급·격차 계산 | 규칙(코드) | `engine.ts`의 `tierFromLink`·`competencyStrength`·`computeGapMap` |

**AI가 자동으로 확정한다고 표현하지 않는다** — Solar는 후보를 제안할 뿐이며, 원문 대조와 최종 확정은 코드 규칙과 사용자에게 있다. 이는 이 대회 제출 전체에서 지켜야 할 원칙이며, 이 문서의 모든 카피가 이 원칙을 따른다.

## 8. 트러블슈팅 (요약)

전체 사례는 `docs/competition/TROUBLESHOOTING_CASES.md` 참고. 대표 3건:

1. **로컬 `workerd` 버전과 스캐폴드 `compatibility_date` 불일치로 dev 서버 기동 불가** — 잠금파일에 고정된 workerd가 지원하는 최대 날짜보다 스캐폴드 생성일이 늦어 발생. `compatibility_date`를 지원 범위 내로 조정해 해결.
2. **로컬 Lighthouse Performance 84~90점(목표 미달)의 원인이 코드가 아니라 측정 서버였음** — `vinext start`(범용 Vite 프리뷰)가 정적 자산을 무압축으로 서빙하는 반면 실제 배포 대상인 Cloudflare Workers Assets 바인딩은 압축 서빙. 측정을 `wrangler dev`(실제 workerd)로 바꾸자 코드 변경 없이 98~99점으로 확인됨.
3. **`/demo` SEO 개선 시도(noindex 추가)가 오히려 SEO 점수를 100→66으로 떨어뜨림** — Lighthouse `is-crawlable` 감사가 noindex 페이지를 자동 감점. 변경마다 재측정해 회귀를 확인하고 즉시 되돌린 사례.

## 9. 테스트·Lighthouse·접근성·SEO 현황

`[테스트 확인]` (2026-07-28 재실행, `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` 및 PR #78 devlog 근거)

- 단위 테스트: **46/46 통과**(`npm test`, `node:test`).
- e2e(Playwright, Chromium+Firefox+WebKit): **189/189 통과**.
- 접근성(axe-core, wcag2a/aa): **serious/critical 위반 0건**.
- 린트: 기존 4건(오늘 작업과 무관, `<a>` vs `next/link` 2건 + 미이스케이프 따옴표 2건), 신규 0건.
- Lighthouse(모바일, `wrangler dev` 기준, PR #78 최종 재측정 — **main에는 아직 미병합**, `[예정]` 병합 시점은 로드맵 참고): `/` Performance 99·Accessibility 100·Best Practices 96·SEO 100, `/demo?sample=1` 98·100·96·100, `/how-it-works` 99·100·96·100, `/technology` 99·100·96·100.

**정직한 한계**(`[코드 검증]`): 리터럴 엔티티(`&ldquo;`/`&rdquo;`) 렌더링 결함이 `app/why`, `app/about`, `app/terms`, `app/privacy`, `app/demo/page.tsx` 5개 파일 26곳에 남아 있다(핵심 페인포인트 인용구 "저는 한 게 없어요" 포함). 아직 수정되지 않았다 — `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` §2.14, P0.

## 10. 개인정보 보호

`[구현됨/코드 검증]`
- 서버에 경험 원문을 영속 저장하지 않음(`app/about/page.tsx`에 이미 명시, grep으로 재확인됨).
- 이메일·전화번호·주민등록번호로 보이는 패턴은 분석 전 자동 마스킹.
- "새 분석 시작하기"로 화면 상태를 즉시 초기화 가능.
- 외부 기관/국가로 전송하는 코드 경로 없음(`app/` 전체 grep 확인).
- Supabase 미사용(코드에 데이터 쓰기 경로 없음).

## 11. 현재 한계 (정직하게)

`[코드 검증]`, 전부 `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md`에서 CONFLICT로 확정된 항목:

1. **증거등급 무결성 CONFLICT(P0)**: `app/lib/engine.ts:74`가 2문항 퀴즈 통과만으로 증거등급을 코드 주석 표기 그대로 "수행 확인(Lv.2)" 수준까지 올린다(내부적으로는 tier 값 3) — 산출물/수행 링크 요구 없음. 기준서 §6.4를 직접 위반하며, 같은 파일 51행 자체 주석("수행 확인(Lv.2)·기관 확인(Lv.3)은 MVP 범위 밖이므로 임의로 올리지 않는다")과도 모순된다. **주의**: 이 파일 자체의 tier 번호 표기가 주석마다 조금씩 다르게 쓰여 있어(51행과 56행·74행의 Lv 표기가 정확히 일치하지 않음), 이 문서는 코드가 실제로 사용하는 문구("수행 확인")를 그대로 인용했다.
2. **확인된 증거 0개라도 다음 단계 진행 가능(P0, #1과 같은 원인)**: `app/demo/page.tsx:1195`의 STEP4→5 진입 버튼이 `confirmedClaims.length === 0 && passedComps.length === 0`으로만 막혀 있어, 원문으로 확인한 증거가 하나도 없어도 학습확인 퀴즈만 통과하면 "GapProof 결과"까지 도달할 수 있다. 기준서 §7.3("확인된 역량이 0개면 격차 단계로 진행할 수 없다")과 직접 충돌한다. `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md` §2.4에 별도 CONFLICT로 기록되어 있으며, 이 문서 §11.1과 같은 PR로 함께 고칠 예정이다.
3. **STEP3/STEP4 순서 CONFLICT(P0)**: 위 §4 참고 — "먼저 알아보기"가 격차 확인보다 먼저 노출됨.
4. **리터럴 엔티티 렌더링(P0)**: 위 §9 참고.
5. **3분 시연 대본이 실제 화면과 불일치**했던 이력(P0, 이번 제출에서 `docs/competition/THREE_MINUTE_DEMO_SCRIPT.md`로 갱신해 해결).
6. **STEP4 정보 밀도**: 390px 기준 약 2700px 스크롤 — 사용자 3명 실측 전까지는 `[가설]`.

이 문서와 이 대회 제출 전체는 위 한계를 숨기지 않는다.

## 12. 활용 계획

- **상담 현장**: Gap Brief를 청년일자리센터·대학 진로상담팀의 상담 자료로 활용(`[가설]`, 관계자 인터뷰 전).
- **자기주도 학습 동기부여**: 확인된 증거 기반으로 "이번 주 행동" 하나를 실행 가능한 단위로 제시.
- **향후 기관 연계**(`[예정]`, 이번 제출 범위 아님): 명시적 동의 기반 기관 공유, 기관별 프라이빗/하이브리드 배포 검토(§7.5 허용 문구 범위 내).

## 13. 단기·중기·장기 계획

**단기(8/3 이전, `docs/planning/GAPPROOF_ROADMAP_TO_2026-08-03.md` 상세)**:
- 증거등급 무결성 수정(P0)
- STEP3/4 순서 조정(P0)
- 리터럴 엔티티 수정(P0)
- 사용자 3명 + 상담/교육 관계자 1명 검증(7/30)
- 8/2 release freeze

**중기(제출 후~다음 라운드)**:
- 실제 산출물/수행 링크 업로드 UI(진짜 Lv.2 증거 경로 구축)
- STEP4 정보 밀도 개선(사용자 실측 결과 기반)

**장기(`[가설]`, 비전 단계, 이번 대회 범위 아님)**:
- 모든 전환기 사용자로 확장
- 기관별 프라이빗/하이브리드 배포 검토(검증 후에만 메시징에 사용, §7.5 기준)
- K-MOOC 전체 DB 연동, 학적 연동 등 — 명시적으로 이번엔 하지 않음(기준서 §9.4)

## 14. 구현됨 / 예정 구분 요약표

| 항목 | 상태 |
|---|---|
| 경험 입력 → Solar 후보 + 원문 인용 | `[구현됨]` |
| 원문 substring 검증, 판정어휘 필터 | `[구현됨/테스트 확인]` |
| 사용자 확인 없이 진행 불가(STEP2→3) | `[구현됨/테스트 확인]` |
| STEP3 "먼저 알아보기"(학습·제도 링크) | `[구현됨]` — 순서는 CONFLICT 상태 |
| 격차 지도·이번 주 행동 | `[구현됨]` |
| 증거카드·Gap Brief | `[구현됨]` — 등급 정확성은 CONFLICT 상태 |
| 증거등급 무결성 수정(`engine.ts:74` + `page.tsx:1195` 게이트) | `[예정]` (P0, 7/29) |
| STEP3/4 순서 조정 | `[예정]` (P0, 7/30) |
| 실제 산출물 업로드 기반 Lv.2 증거 | `[예정]` (중기, 이번 대회 범위 아님) |
| 기관 연계·프라이빗 배포 | `[예정]` (장기 비전, `[가설]`) |

## 15. 서비스 링크와 기술 증빙

- 운영 데모: `https://gapproof.forblune.com`(`/`, `/demo`) — `[운영 확인]` HTTP 200(직전 세션에서 확인).
- 저장소: 비공개, 심사 시 필요하면 별도 공유(이 문서 자체에는 실제 GitHub 조직/계정 정보를 포함하지 않음).
- 기술 증빙 문서: `docs/competition/SYSTEM_ARCHITECTURE.md`, `docs/competition/TROUBLESHOOTING_CASES.md`, `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md`.

---

**작성 원칙 확인**: 이 문서 어디에도 실제 사용자 수·기관 도입 실적·성과 지표를 지어내지 않았다. 모든 수치(테스트 통과 수, Lighthouse 점수)는 위 §9에 근거를 명시한 실측값이다. `[가설]`로 표시된 항목은 검증 전이며 검증된 사실처럼 서술하지 않았다.
