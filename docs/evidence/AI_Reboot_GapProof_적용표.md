# AI Reboot 수업 내용 × GapProof 실제 적용 증거표

- 작성일: 2026-07-24 (Issue #3)
- 원자료: `docs/reference/AI_Reboot_학습노트.md` — AI Reboot 정규과정(15일/80시간) 전체 학습 노트.
  원래 파일명 `docs/preview.md`, 사용자가 2026-07-24 저장소에 추가, Issue #3에서 현재 위치로 이동.
- 판정 원칙: **수업 자료에 있다는 사실은 적용 증거가 아니다.** 실제 코드·설정·테스트·Git 기록이 있을 때만
  "실제 적용됨"으로 표시한다. 근거는 2026-07-24 읽기 전용 전수 감사 결과를 따른다.
- 상태 라벨: 실제 적용됨 / 부분 적용됨 / 학습했으나 현재 MVP에서는 의도적으로 미사용 / 코드 근거 없음 / 확인 필요

## 문서 역할 구분

| 문서 | 역할 |
|---|---|
| `docs/GapProof_NotebookLM_소스북_v0.1.md` | **제품 기준 문서** — 문제정의·사용자·제품 원칙·Solar 역할·범위. [가설]/[미실행] 표시는 확정 사실이 아님 |
| `docs/reference/AI_Reboot_학습노트.md` | **교육 원자료** — 과정에서 무엇을 배웠는지의 근거. GapProof 구현 증거로 사용하지 않음 |
| `docs/evidence/` (이 폴더) | **실제 적용 증거** — 코드·화면·테스트로 검증 가능한 사실만 기록 |
| `docs/GapProof_인수인계_STATUS.md` | 최신 복구 상태와 TODO (소스 소실·재구성 맥락) |

## 적용표

| 수업에서 배운 내용 (학습노트 근거) | 현재 적용 상태 | GapProof 적용 위치 | 코드·화면·테스트 증거 | 현재 미적용 이유 | Phase 2 계획 여부 |
|---|---|---|---|---|---|
| 문제 정의·PRD 8섹션 (Day 8) | 부분 적용됨 | 제품 문서 | `docs/GapProof_MVP_구현명세_v0.1.md` §1, `docs/GapProof_PBL_28문항_v0.1.md` 2단계 — 5스텝 흐름이 `app/page.tsx`·`app/lib/engine.ts`로 구현 | 정식 PRD 8섹션 형식 문서는 없음(명세·PBL로 대체) | — |
| 페르소나·사용자 스토리·MoSCoW·Success Metric (Day 8) | 부분 적용됨 | 제품 문서 | 소스북 §5(대상 사용자), 구현명세 §2(페르소나), 소스북 §11.1(성공 기준 6개) | 운영 KPI 계측 코드는 미구현 | 지표 계측은 Phase 2 후보 |
| 바이브코딩 — 사람은 기획·검증·결정, AI는 구현 (Day 1) | 부분 적용됨 (제품에는 인간 검증 루프로 반영) | `app/page.tsx` | 확인·수정·거절 루프 `page.tsx:142-175`, 확인된 역량만 결과 사용 `page.tsx:112-115`, "AI의 제안보다 당신의 확인이 먼저예요" `page.tsx:405` | 개발 과정 자체의 바이브코딩 여부는 저장소 아티팩트로 증명 불가 | — |
| GitHub Issue→branch→commit→PR (Day 1·8) | 부분 적용됨 | Git 저장소 | 이슈 기반 브랜치명(#1 연습 이슈, `fix/1-mobile-header-progress`), 커밋 6개, Issue #2~#13 운영 체계(2026-07-24 도입) | 감사 시점까지 PR 병합 이력 없음 — 본 Issue #3부터 PR 흐름 적용 | — |
| React 함수형 컴포넌트·hooks (Day 5·6) | 실제 적용됨 | `app/page.tsx` | `"use client"` + `useState`/`useMemo`(`page.tsx:1-11,95-111`), `Home`·`TierBadge` 컴포넌트, react 19.2.6(`package.json:19-20`) | — | — |
| TypeScript strict (전 과정) | 실제 적용됨 | 전 소스 | `tsconfig.json:7-8`(strict·noEmit), 타입 정의 `route.ts:1-16`, `engine.ts:8-48` | typecheck npm 스크립트 미배선(후속 정리 대상) | — |
| 환경변수·API 키 관리 — 서버 은닉 (Day 7·10·12) | 실제 적용됨 | `app/api/analyze/route.ts` | 키는 서버에서만 판독(`route.ts:19-25,187`), 클라이언트 노출 0건, `.gitignore` `.env*`+`.dev.vars`(45행), git 히스토리 키 리터럴 0건(감사 스캔) | — | — |
| 국내 LLM Solar API 호출 (Day 10) | 실제 적용됨 | `app/api/analyze/route.ts` | `api.upstage.ai/v1/chat/completions`+`solar-pro3`(`route.ts:18,26,201-218`), json_object·temperature 0.2 | 실키 품질·지연 측정은 [미실행](소스북 §11.3) | — |
| 할루시네이션 대응 (Day 1) | 실제 적용됨 | `app/api/analyze/route.ts` | 인용 원문 일치 검증 `route.ts:142`, 불일치 시 후보 폐기+샘플 폴백 `route.ts:236-243`, Lv.0 강제 시작, 테스트 `tests/rendered-html.test.mjs:93` | — | — |
| Chrome DevTools·React DevTools (Day 13) | 확인 필요 | — | 개발 과정 행위라 저장소 아티팩트 없음 | 증거화하려면 QA(#12)에서 사용 기록 남기기 | — |
| Lighthouse 4지표 (Day 11·13) | 코드 근거 없음 | — | 측정 리포트·수치 없음(전역 grep 0건) | 미측정 — QA 이슈 #12에서 측정·기록 예정 | — |
| Core Web Vitals (Day 13) | 부분 적용됨 | `eslint.config.mjs` | `eslint-config-next/core-web-vitals` 적용(`eslint.config.mjs:2,6`) | 런타임 CWV 측정 없음 | — |
| 시맨틱 HTML (Day 2) | 실제 적용됨 | `app/page.tsx`, `app/layout.tsx` | main/header/section/article/aside/footer/ol 사용, `html lang="ko"`(`layout.tsx:11`), SSR 테스트(`tests:38`) | — | — |
| 웹 접근성 — ARIA·키보드·대비 (Day 2·11·13) | 부분 적용됨 | `app/page.tsx`, `app/globals.css` | label 연결(`page.tsx:371,421,430`), `role="status"`(`:304`), `aria-busy/aria-live`(`:358`), focus-visible(`globals.css:23`), reduced-motion(`:318`) | `aria-describedby`·포커스 이동·Escape 미구현 — #4·#12 범위 | — |
| 반응형 웹 — 미디어쿼리·Safe Area (Day 2·11) | 부분 적용됨 | `app/globals.css` | `@media 1050px/720px`(`:212,:221`), clamp 2곳(`:50,:81`) | 스켈레톤 3열·태블릿 사각지대·safe-area 미사용 등 결함 — #4에서 수정 예정 | — |
| SEO — 메타·사이트맵 (Day 13·14) | 부분 적용됨 | `app/layout.tsx` | title·description(`layout.tsx:4-7`)·lang만 존재 | robots·sitemap·canonical 미구현 — #10 범위 | — |
| Open Graph (Day 13, 간략) | 코드 근거 없음 | — | og:*·twitter:* 전역 grep 0건 | 미구현 — #10 범위 | — |
| 공개 배포 (Day 14 — 수업은 GitHub Pages, 실전은 Cloudflare로 응용) | 실제 적용됨 | `wrangler.jsonc`, `worker/index.ts` | Workers 구성(`wrangler.jsonc:3-14`), Worker 엔트리(`worker/index.ts:28-45`), 라이브 gapproof.forblune.com(STATUS 기재) | — | — |
| README 작성 (Day 14) | 실제 적용됨 | `README.md` | 개요·실행법·5단계 흐름·제품 원칙·Solar 연결·확인 명령(69행) | — | — |
| 오류 처리 — try/catch·폴백 (Day 10·13) | 실제 적용됨 | `app/api/analyze/route.ts` | 파싱 400·길이 400/413(`route.ts:172-184`), 12초 타임아웃(`:28,197`), 폴백 4경로(`:186-262`) | 클라이언트 413 표시 왜곡은 결함으로 확인 — #5에서 수정 예정. ErrorBoundary 미사용 | — |
| 테스트 — Vitest 단위 테스트 (Day 13) | 부분 적용됨 | `tests/rendered-html.test.mjs` | node:test 4케이스(SSR·폴백 인용 검증·413), `npm test`(`package.json:12`) — 도구는 Vitest 대신 node:test | engine.ts 순수 로직 단위 테스트 0건 — 후속 보강 대상 | — |
| **Supabase** — Auth·CRUD·Storage·Realtime·Edge Function (Day 7) | **학습했으나 현재 MVP에서는 의도적으로 미사용** | — | 코드 전역 grep 0건. 구현명세 §8도 "[미구현]" 명기 | 서버 무저장 원칙과 정합: 원문 미저장(`page.tsx:333`), `no-store`(`route.ts:44`), 진짜 기록 삭제(`page.tsx:261-278`) — 민감 서사 서비스의 개인정보 최소수집 판단 | **예 — Phase 2 (#13)** |
| **RLS** — 행 단위 보안, "클라 검증만으론 부족" (Day 7) | **학습했으나 현재 MVP에서는 의도적으로 미사용** | (교훈은 서버 재검증에 반영) | 영구 저장 자체가 없어 RLS 대상 부재. "클라이언트 검증만으론 부족" 교훈은 서버 측 입력 재검증(`route.ts:178-184`)에 반영됐다고 설명 가능 | 위와 동일(무저장 원칙) | **예 — Phase 2 (#13)** |

## 사용하지 않은 기술에 대한 정직한 기재

- **Supabase·RLS·Vitest·Playwright·Zod·Vercel**: PBL 문서(`docs/GapProof_PBL_28문항_v0.1.md:357-362`)의 "기술 가설"에는 등장하나
  실제 코드에는 없다. 발표·정보 페이지(#9)에서는 실제 스택(vinext·Next 16·React 19·TypeScript·Cloudflare Workers·node:test)만 사용했다고 말한다.
- **Drizzle/D1 스캐폴드**(`db/`, `examples/d1`): 템플릿 잔재이며 실행 앱에 연결되지 않음(빈 스키마 `db/schema.ts`, `d1:null`).
  "DB를 사용했다"고 주장하지 않는다.
- 이 표의 어떤 항목도 코드 근거 없이 "적용됨"으로 승격하지 않는다.
