# Issue #24 — 최종 브랜드 자산 제작·교체 (A1 Broken G Bridge)

- Issue: https://github.com/forblune/gap-proof-mvp/issues/24
- 브랜치: `design/24-final-brand-assets` (기준 커밋 `62f3449` = main, 콘셉트 PR #28 병합 직후)
- 작업일: 2026-07-25
- 선행: 사용자 승인 — 콘셉트 **A1 Broken G Bridge** (PR #28, squash `62f3449`)

## A1 최종 보정 (의미·실루엣 유지, 지정 10항목 반영)

| 요구 | 적용 |
|---|---|
| 개구부·간극 명확 | 입 90°(±45°)로 유지, 브리지가 간극을 세로로 가로지름 |
| 숫자 1·체크·일시정지 오인 방지 | 브리지가 G 상단 터미널을 지나 **위로 돌출 + 아래로 암(가로획)에 연결** — 독립 막대가 아닌 '꿰매는' 구조. 대각선 없음(체크 아님), 세로 1개+가로 암(일시정지 아님) |
| 16px 뭉개짐 방지 | 브리지 폭 11/64(16px에서 ≈2.75px) 실측 확인(`renders/sizes-sheet.png` 16px ×6) |
| 단색에서 구조 구분 | 단색판에 **캡슐 창(음각)** 적용 — 브리지가 윤곽으로 분리(32px부터 창 식별, 실루엣은 16px 유지) |
| 안전 여백 | 마크 외곽 5.5/64, 브리지 상단 7/64 — viewBox 잘림 없음 |
| 35px 중앙 정렬 | 타일 내 마크 74% 중앙 배치, 35px 렌더에서 치우침 없음 확인 |
| 토큰 우선 | `--ink`/`--yellow`/`--paper`/`--ivory`만 사용 |
| 그라데이션·그림자 금지 | 플랫 벡터만 |
| 워드마크 폰트 체계 유지 | 시스템 스택(콘셉트와 동일), 새 유료 폰트 없음 |
| 외부 복사 금지 | 전부 좌표 기반 자체 제작 |

수정 중 발견·해결: 아크 플래그 오류(`large=1, sweep=0` → 중심이 현 반대편으로 해석돼 반전 렌더) → `sweep=1`로 수정. OG 한글이 headless에서 붓글씨 폴백으로 렌더 → `Apple SD Gothic Neo` 명시 폴백.

## 제작·교체 내역

- **교체**: `favicon.svg`(잉크 타일+마크), `icon-512.png`, `apple-touch-icon.png`(180), `og.png`(1200×630)
- **신규**: `favicon.ico`(16/32/48 내장), `icon-192.png`, `icon-512-maskable.png`, `app/manifest.ts`(PWA 아이콘을 실제 참조시키는 최소 매니페스트 — `/manifest.webmanifest` 200 실측), `app/components/brand-mark.tsx`
- **헤더 마크**: 텍스트 "G" 4곳(메인 헤더·게이트 카드·증거카드·정보 페이지) → A1 인라인 SVG. 본체 `currentColor`라 #26 인쇄 반전이 그대로 적용되고, 브리지는 인쇄에서 잉크로 반전(1줄 추가)
- **등록용(등록은 미실행)**: `kakao-app-icon-512.png`, `naver-logo-512.png` — evidence assets 폴더 보관
- **임시 문구**: 활성 문서·코드에 임시 자산 안내 없음 확인(#10 워크로그의 기록은 이력 보존). OG의 "시안" 라벨 제거됨. 상세 적용 위치·라이선스: `docs/evidence/issue-24/final/applied-locations.md`
- **OG 문구**: 기존 히어로/설명 문구만 사용("공백을 지우지 않고, 증거로 바꿉니다." + 사이트 description + 도메인) — 새 마케팅 주장·판정성 표현 없음, 안전 여백 80px

## 검증 (증거: `docs/evidence/issue-24/final/`)

- **크기**: 16/32/35/64/180/192/512 × 밝은/어두운/단색 흑·백/흑백 근사 — `renders/sizes-sheet.png` (16px에서 G 실루엣·브리지 유지, 잘림·비정상 투명 여백 없음)
- **브라우저 탭**: 밝은/어두운 테마 목업 — `renders/tab-mock.png`
- **홈 화면**: apple-touch 180 목업 — `renders/homescreen-mock.png`
- **카카오·네이버**: 96/44/35px·120/64/35px 목업 — `renders/platform-mock.png`
- **maskable**: 원형/스쿼클 마스크 + 내접 80% 안전영역 가이드 — `renders/maskable-check.png`
- **OG**: 전체 + 1:1 크롭 + 1.91:1 소형 + 150px 썸네일 — `renders/og-crops.png` (텍스트 잘림 없음 · 한계: 1:1 중앙 크롭에서 좌상단 로고 부분 잘림, 소형 카드·썸네일에서는 브랜드명 식별)
- **헤더 Before/After**: `before/`↔`after/` (gate·360/768/1280·증거카드) — 회귀 없음
- **인쇄(#26)**: chromium 배경 OFF에서 identity 잉크색(`rgb(23,36,61)`)·카드 표시·크롬 숨김·PDF 2p 동일, 마크는 흰 배경+잉크 반전 — `after/print/`
- **5뷰포트**: 360/390/768/1024/1440 — overflow 0 · console error 0 (`after/viewports/metrics.json`)
- **명령**: `npm test` 15/15 · `npm run build` 성공 · `npx tsc --noEmit` 레거시 2건만(worker Cloudflare 타입) · `git diff --check` 통과
- **lint**: 4건 — main(62f3449)에도 동일 존재하는 레거시로 확인(임시 워크트리 대조), 브랜드 교체와 무관 → 범위 제한상 미수정 기록
- 실 유료 Solar 호출 0건 · 배포 미실행 · 외부 콘솔 등록 미실행

## 외부 플랫폼 후속 체크리스트 (이번 PR에서 등록 금지 — 배포 승인 후)

1. Kakao Developers 앱 아이콘을 `assets/kakao-app-icon-512.png`로 교체
2. 카카오 비즈 앱 전환 상태 재확인
3. 카카오 이메일 권한 신청 조건 재확인
4. Naver Developers 앱 로고를 `assets/naver-logo-512.png`로 교체
5. Google OAuth 동의 화면 로고 필요 시 동일 자산 적용
6. favicon·PWA·OG·카카오·네이버 동일 브랜드 계열 확인(등록 후 실물 대조)
7. 자산 자체 제작·라이선스 상태: `applied-locations.md`에 기록 완료

## 관련 커밋·PR

- 커밋: `32d5b13` design: apply final A1 brand assets across site (#24)
- PR: https://github.com/forblune/gap-proof-mvp/pull/29 (Closes #24)
