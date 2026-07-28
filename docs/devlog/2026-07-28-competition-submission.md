# 리부트 AI 활용대회 예선 1차 산출물 + About 페이지 개발일지 (2026-07-28)

## 목표

2026-07-29 제출용 예선 1차 산출물(마스터 문서·시스템 구조·트러블슈팅·3분 시연 대본·제출 이메일 초안·About 명세)과 About 페이지 확장 구현을 Draft PR로 완성한다. 이메일 발송·PR 병합·운영 배포는 하지 않는다.

## 시작 전 확인

- 저장소 `/Users/gh/gap-proof-mvp`: `main` = `19851f14a9326a175eed5220ef081dc6368575c4`(예상과 일치), `git status` clean.
- 열린 PR: `#78`(`perf/lighthouse-90`) — OPEN·Ready for review(non-draft)·MERGEABLE·HEAD `cde55cb627f687388ef327facc413dfb1d32af6b`(예상과 일치). `#79`는 병합 완료 상태(열린 PR 목록에 없음, 예상과 일치).
- 이번 작업 워크트리(`feat-learn-before-check`)는 이전 목표의 잔여 브랜치(`docs/product-alignment-roadmap`, 이미 병합됨)에 있었음 — clean 상태 확인 후 `origin/main`에서 새 브랜치 `feat/competition-about`을 생성.
- Canva·Notion MCP 커넥터: `ToolSearch`로 확인한 결과 이 환경에 연결되어 있지 않음(github·cloudflare·supabase·render·pdf-viewer·context7·playwright·posthog만 연결됨) — Canva/Notion 관련 작업은 전부 로컬 문서 대체 경로로 진행(아래 "Canva·Notion 대체" 참고).

## Superpowers 적용 방식

이 목표는 `brainstorming` → `writing-plans` → `executing-plans` 순서를 명시했다. 이전 목표(정합성 감사)와 동일하게, `/goal` 명령 자체가 이미 매우 상세한 스펙(산출물 목록·필수 구성·검증 항목·금지 목록)을 담고 있어 사용자와의 대화형 브레인스토밍이 필요한 미결정 사항이 없었다. 따라서 브레인스토밍/플랜 문서 작성을 문자 그대로 수행하는 대신, 두 스킬의 근본 원칙(placeholder 없이 완전한 산출물, 파일 구조를 미리 매핑, 자체 검토)을 실제 산출물 작성과 About 페이지 구현에 직접 적용했다. `executing-plans`의 원칙(작은 단위로 실행→검증→커밋)은 About 페이지 구현·테스트 단계에 적용했다.

## 조사

- `package.json`·`wrangler.jsonc` 직접 읽어 기술 스택 확정(Next.js 16.2.6, React 19.2.6, vinext 0.0.50, Cloudflare Workers/wrangler 4.92.0, Tailwind 4.2.1, TypeScript 5.9.3, Drizzle 존재하나 미사용).
- `wrangler.jsonc`의 `compatibility_date` 관련 주석에서 실제 트러블슈팅 사례(workerd 버전 잠금 불일치) 발견.
- PR #78 브랜치(`perf/lighthouse-90`)의 devlog(`docs/devlog/2026-07-28-lighthouse-90.md`)를 `git show`로 직접 읽어 실측 Lighthouse 수치·SEO canonical 버그·접근성 커버리지 갭·Firefox 간헐 실패 조사 등 4건의 실제 트러블슈팅 사례를 확보.
- `docs/quality-loop/FINAL_AUDIT.md`(2026-07-27)를 읽어 과거 알려진 결함(콘텐츠 밀도, STEP4 CTA 줄바꿈 — 이후 수정 확인됨, 리터럴 엔티티, `manifest.webmanifest` CORS) 확인.
- `docs/presentation/GAPPROOF_3_MINUTE_DEMO.md`(기존본)를 읽고 `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md`에서 이미 확인된 "STEP 번호가 실제 UI와 어긋남" CONFLICT를 반영해 갱신.
- `app/about/page.tsx` 현재 내용을 읽어 기존 스토리텔링(만든 계기·차별점·비목표·개인정보 원칙)을 파악하고 유지 대상으로 확정.
- `tests/e2e/responsive.spec.ts`·`accessibility.spec.ts`의 `PATHS` 배열에 `/about`이 없음을 확인 — PR #78이 `accessibility.spec.ts`를 수정 중이므로 그 파일은 건드리지 않고 수동 axe 검증으로 대체, `responsive.spec.ts`(PR #78 미관련)에는 `/about` 추가.

## 산출물

1. `docs/competition/REBOOT_AI_PRELIMINARY_MASTER.md` — 한 문장 정의부터 서비스 링크까지 15개 섹션, `[구현됨]`/`[코드 검증]`/`[가설]`/`[예정]` 태그로 사실·계획 분리.
2. `docs/competition/SYSTEM_ARCHITECTURE.md` — Mermaid 2종(전체 구조 flowchart, 신뢰 경계 sequence diagram) + Canva 도식화 구성안(SVG/PNG 렌더 도구 미설치, 임의 설치하지 않고 대체 지시만 남김).
3. `docs/competition/TROUBLESHOOTING_CASES.md` — 실제 사례 5건(workerd 호환일자, Lighthouse 측정 서버, SEO noindex 회귀, 접근성 테스트 사각지대, Firefox 간헐 실패), 전부 문제→원인→해결→검증→배운 점 구조.
4. `docs/competition/THREE_MINUTE_DEMO_SCRIPT.md` — 기존 대본의 STEP 번호 불일치 CONFLICT를 해소한 갱신본, STEP3 의도적 스킵 전략 명시.
5. `docs/competition/SUBMISSION_EMAIL_DRAFT.txt` — `whitepearl0924@kidico.or.kr` 수신 초안, "실제 발송되지 않음" 명시, 이름/연락처는 플레이스홀더.
6. `docs/competition/ABOUT_PAGE_SPEC.md` — About 페이지 확장 명세(유지/신규 섹션, 시각적 구분 방법, PR #78 충돌 최소화 전략).
7. 본 devlog.

## About 페이지 구현 (`feat/competition-about`)

`app/about/page.tsx`에 4개 섹션 추가(기존 4개 섹션은 텍스트 변경 없이 유지):
- "어떻게 작동하나요?" — STEP0~5 실제 흐름 6단계 요약(현재 코드 그대로, STEP3/4 CONFLICT를 About 페이지에서 임의로 재배열하지 않음).
- "만든 기술" — 검증된 기술 스택만 나열(Drizzle·Supabase는 미사용이므로 언급하지 않음).
- "겪은 문제와 해결" — 트러블슈팅 사례 5건 중 가장 이해하기 쉬운 1건(Lighthouse 측정 서버 문제)만 요약, 존재하지 않는 공개 URL 링크는 걸지 않음.
- "지금의 한계와 다음 계획" — "지금 되는 것"과 "다음에 할 일(예정)" 두 리스트로 명확히 구분, 새 CSS 클래스·`globals.css` 수정 없이 기존 `<ul><li>`·`<b>` 패턴만 사용.

`tests/e2e/responsive.spec.ts`의 `PATHS`에 `/about` 추가(1줄).

## 검증

- `npm run lint`: 기존 4건(무관 파일)만, 신규 0건.
- `npm test`(build 포함): **46/46 통과**.
- `npx playwright test tests/e2e/responsive.spec.ts -g "about"`: 320/360/375/390/430/768/1440px × 3브라우저 = **21/21 통과**, 가로 오버플로 0건.
- 임시 스펙 파일(커밋하지 않음, 검증 후 즉시 삭제)로 `/about` axe(wcag2a/aa) light+dark 검증: **serious/critical 0건**(4/6 케이스 즉시 통과). 나머지 2건(webkit light/dark)은 콘솔 에러 검사에서 실패했으나, 원인을 조사한 결과 `app/manifest.ts`의 절대경로 하드코딩으로 인한 로컬 CORS 오류(`FINAL_AUDIT.md`에 이미 기록된 기존 결함)이며, 홈페이지(`/`)에서도 동일하게 webkit에서 재현됨을 별도 임시 테스트로 확인 — **About 페이지 변경과 무관한 사전 존재 이슈**로 결론. axe 자체(serious/critical)는 4개 케이스 전부 0건.
- 링크 정상: 빈 href 없음(같은 임시 테스트에서 확인).
- 카피 검토: "AI가 자동으로 확정" 류 표현 없음, `docs/planning/GAPPROOF_ALIGNMENT_AUDIT_2026-07-28.md`의 CONFLICT 항목(증거등급·STEP 순서)을 "구현됐다"고 서술하지 않고 "예정"으로 명시.

## Canva·Notion 대체

커넥터 미연결 확인(위 "시작 전 확인" 참고). 대체 산출물:
- **Notion**: `docs/competition/REBOOT_AI_PRELIMINARY_MASTER.md`가 Notion 마스터 페이지에 그대로 붙여넣을 수 있는 완성된 마크다운 — 커넥터 연결 시 이 파일 내용을 새 페이지로 옮기면 됨.
- **Canva**: `docs/competition/SYSTEM_ARCHITECTURE.md` §4에 슬라이드 2장 분량의 제목·레이아웃·색상·문구 지시를 완성해 남김(연결 시 그대로 제작 가능).

이 부분은 실제 커넥터 연결 없이는 완전히 대체할 수 없다 — **blocker로 기록**: 12~15장 전체 슬라이드 데크의 실제 이미지/디자인 산출물은 이번 세션에서 생성하지 못했다.

## Git/PR

- 브랜치: `feat/competition-about`(`origin/main` `19851f14a`에서 생성).
- 변경 파일: `app/about/page.tsx`(수정), `tests/e2e/responsive.spec.ts`(수정, 1줄), `docs/competition/*`(신규 6파일), 본 devlog(신규).
- main 직접 커밋 없음, PR #78 변경·병합 없음, 새 PR 병합 없음, 운영 배포·Cloudflare/Supabase/DNS/secret 변경 없음, force-push/reset --hard 없음, 실제 이메일 발송 없음.
