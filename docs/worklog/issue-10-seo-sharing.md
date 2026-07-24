# Issue #10 — SEO·Open Graph·Web Share·카카오톡 공유 구현

- Issue: https://github.com/forblune/gap-proof-mvp/issues/10
- 브랜치: `feat/10-seo-sharing` (기준 커밋 `0ab6c08` = main)
- 작업일: 2026-07-25

## 설계 결정

1. **메타데이터**: `layout.tsx`에 metadataBase(https://gapproof.forblune.com)·canonical·Open Graph 전체(ko_KR·1200×630 이미지)·Twitter summary_large_image·아이콘 3종. 정보 페이지 4종에 각자 canonical. vinext가 전부 SSR 방출함을 실측·테스트로 검증.
2. **robots/sitemap**: App Router 규약(`app/robots.ts`·`app/sitemap.ts`) 사용 — worker가 서빙하므로 테스트 가능(정적 public 파일 대비 장점). `/api/` Disallow, sitemap에 홈+정보 라우트 4종 절대 URL.
3. **브랜드 에셋**: 템플릿 파란 favicon.svg를 브랜드 G 마크 SVG로 교체, `og.png`(1200×630)·`icon-512.png`·`apple-touch-icon.png`는 Playwright 렌더로 생성(외부 요청 없음). PNG 치수는 테스트가 IHDR로 검증.
4. **공유 페이로드 원칙**: 문구는 `SHARE_TEXT` 상수로 고정 — **사용자 경험 원문·분석 결과를 절대 포함하지 않음**(소스 계약 테스트 + E2E 클립보드 검증 + 화면 안내 카피).
5. **Web Share/복사**: STEP4에 "링크 복사"(clipboard API, 성공/권한오류 notice)와 "공유하기"(`navigator.share` → 미지원 시 복사 폴백+안내). 인쇄에서 share-note 숨김.
6. **카카오톡 공유**: JS 키는 저장소에 두지 않고 `GET /api/share-config`가 `KAKAO_JS_KEY` env를 런타임 제공. 키가 있을 때만 STEP4에서 SDK(2.7.4) 지연 로드·init 후 버튼 표시(키 없으면 미표시 — E2E 확인). 피드 페이로드는 제목·소개·og.png·링크만. CSP는 frame-ancestors만이라 SDK 로드와 충돌 없음.

## 변경 파일

- 신규: `app/robots.ts`, `app/sitemap.ts`, `app/api/share-config/route.ts`, `public/og.png`·`icon-512.png`·`apple-touch-icon.png`, `docs/evidence/issue-10/`
- 수정: `app/layout.tsx`(전체 메타), 정보 페이지 4종(canonical), `app/page.tsx`(공유 버튼·Kakao 로더·share-note), `app/globals.css`, `public/favicon.svg`(브랜드 교체), `.dev.vars.example`(KAKAO_JS_KEY 이름), `tests/rendered-html.test.mjs`

## 검증 결과

- `npm test` **15/15 PASS** — 신규: SSR head(og 10항목·twitter·canonical·아이콘)·robots 200(Disallow /api/·Sitemap URL)·sitemap 200(4라우트)·og.png 1200×630 IHDR·about canonical·공유 소스 계약(SHARE_TEXT 상수·experience 미포함·안내 카피). 조정 2건: og:image:alt에서 히어로 문구 제거(비인증 비노출 어서션과 충돌 방지), layout 상수화 반영
- E2E: 버튼 표시·**카카오 버튼 키 없음 시 미표시**·클립보드=origin(사용자 입력 미포함 false 확인)·성공 notice·share 폴백 notice, 페이지 오류 0 (`seo-share-verification.txt`, `share-buttons-step4.png`)
- 5뷰포트 데모 스윕 overflow 0·console error 0 · lint·diff-check 통과 · tsc 레거시 2건만 · 실 유료 Solar 호출 0건

## 남은 제한사항

- **카카오톡 실공유·미리보기 실측은 사용자 Kakao Developers 앱·도메인 설정 완료 후**(QA #12) — 키 등록 전에는 버튼이 표시되지 않는 안전 기본값
- OG 미리보기(카카오 디버거·실 메신저)는 배포된 도메인 필요 — 배포 승인 후 확인 항목
- 프로덕션 `KAKAO_JS_KEY`는 `wrangler secret put`(값은 채팅·저장소 기록 금지)

## 관련 커밋·PR

- 커밋: (커밋 후 기입)
- PR: (생성 후 기입 — Closes #10)
