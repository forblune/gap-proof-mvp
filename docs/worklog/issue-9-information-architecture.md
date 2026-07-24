# Issue #9 — About·Guide·Pipeline·Technology 정보구조 구현

- Issue: https://github.com/forblune/gap-proof-mvp/issues/9
- 브랜치: `feat/9-information-architecture` (기준 커밋 `aaedc22` = main)
- 작업일: 2026-07-25

## 설계 결정

1. **정보구조**: `/about`(문제·대상·계기·차이·하지 않는 판단·개인정보 원칙) · `/guide`(5단계 순서·이유·소요시간 표, 입력 불필요 정보, 오류 시 행동) · `/how-it-works`(12단계 파이프라인, 증거등급 Lv.0~3 표, 폴백) · `/technology`(실제 스택 표, 보안 6종 카드, 검증 방법, 수업 적용, 제한사항). 공용 셸 `app/components/info-shell.tsx`(헤더 브랜드+내비·aria-current, 데모 CTA, 푸터).
2. **공개/보호 경계(#6 정책 준수)**: 정보 페이지는 게이트 없이 공개(서버 컴포넌트 SSR). **메인 데모 흐름·게이트 입력을 렌더하지 않음을 테스트로 강제**. 게이트 화면·데모 푸터에 정보 링크 내비 추가 — 첫 방문자가 코드 없이도 목적·원리를 읽을 수 있음.
3. **모바일 우선**: info-bar는 높이 자동+줄바꿈 내비(터치 40px), 본문 카드 max-width 880px, 표는 `.table-scroll`(가로 스크롤 컨테이너 — 페이지 overflow 0 유지). 360·1440 실측 overflow 0.
4. **과장 없는 콘텐츠 원칙**: 소스북(제품 기준)과 감사 결과의 사실만 사용. 기술 페이지는 "쓴 기술만 말하고 검증한 만큼만 주장" — 실제 스택(vinext·React 19·TS·Workers·Solar·node:test), 실측 수치(테스트 13종→14종, 5뷰포트, workerd 실측), **Supabase·RLS는 학습했으나 무저장 설계로 의도적 미사용(Phase 2)** 명시. 창업 계기는 공개 승인된 서사만(전공·독학·MindHub — 가족사 제외). GitHub는 "비공개, 요청 시 조정"으로 정직 기재.
5. **보안 장치의 이해 가능한 언어화**: 게이트("코드를 서버가 검증, 없으면 열리지 않음"), rate limit("60초 10회, 확인 불가 시 거절"), PII("보내기 전에 가리고 알려줌"), 키("브라우저로 전달 안 됨").
6. **핵심 흐름 무간섭**: `page.tsx` 변경은 게이트 링크·푸터 내비 2곳뿐. 데모 5단계 로직 무변경(회귀 스윕으로 검증). 페이지별 `metadata`(title·description)는 기본 사용성 수준만 — OG·sitemap 등 SEO는 #10 범위.

## 변경 파일

- 신규: `app/components/info-shell.tsx`, `app/about|guide|how-it-works|technology/page.tsx`, `docs/evidence/issue-9/`
- 수정: `app/page.tsx`(게이트 링크·푸터 내비), `app/globals.css`(info-* 스타일), `tests/rendered-html.test.mjs`

## 검증 결과

- `npm test` **14/14 PASS** — 신규: 4개 라우트 비인증 SSR 200 + 핵심 문구 + 공용 내비 + **메인 데모·게이트 입력 미노출** 어서션. 기존 게이트·한도·마스킹·allowlist 전부 유지
- E2E: 4페이지 × 360/1440 **overflow 0**, aria-current 활성 표시, 게이트 링크 4종 → `/about` 이동 → 브랜드 클릭 시 게이트 복귀, 페이지 오류 0 (`info-pages-results.json`, 캡처 5장)
- 데모 회귀: 5뷰포트 전체 여정 스윕 overflow 0·console error 0
- lint·diff-check 통과 · tsc 레거시 2건만 · 비밀값 스캔 0건 · 실 유료 Solar 호출 0건

## 남은 제한사항 / 후속

- OG·Twitter 메타·sitemap·robots에 정보 라우트 반영은 #10에서(본 이슈는 title/description만)
- 기술 페이지의 "테스트 13종" 문구는 스위트 확장 시 갱신 필요(현재 14종 — 문서에 반영함)
- 정보 페이지 인쇄 스타일은 미조정(@media print는 데모 카드 기준) — 필요 시 QA #12 후 판단

## 관련 커밋·PR

- 커밋: `1b6e1da` feat: public information architecture for About/Guide/Pipeline/Technology (#9)
- PR: https://github.com/forblune/gap-proof-mvp/pull/22 (Closes #9)
