# Issue #24 최종 자산 — 파일별 적용 위치 표 · 라이선스 확인

작성일: 2026-07-25 · 브랜치 `design/24-final-brand-assets` · 선택 콘셉트 **A1 Broken G Bridge**

## 사이트가 실제 참조하는 파일 (public/)

| 파일 | 상태 | 참조 위치 | 용도 |
|---|---|---|---|
| `public/favicon.svg` | **교체** | `app/layout.tsx` `icons.icon` | 브라우저 탭(벡터, 잉크 타일+마크) |
| `public/favicon.ico` | **신규** | `app/layout.tsx` `icons.shortcut` + 루트 자동 요청 | 레거시 브라우저·크롤러 (16/32/48 PNG 내장) |
| `public/icon-192.png` | **신규** | `app/layout.tsx` `icons.icon` + `app/manifest.ts` | PWA/안드로이드 |
| `public/icon-512.png` | **교체** | `app/layout.tsx` `icons.icon` + `app/manifest.ts` | PWA/대형 아이콘 |
| `public/icon-512-maskable.png` | **신규** | `app/manifest.ts` (`purpose: maskable`) | 안드로이드 마스크형(안전영역 80% 검증: `renders/maskable-check.png`) |
| `public/apple-touch-icon.png` | **교체** (180×180) | `app/layout.tsx` `icons.apple` | iOS 홈 화면 |
| `public/og.png` | **교체** (1200×630) | `app/layout.tsx` `openGraph.images` + `twitter.images` | 공유 카드(안전 여백 80px, 기존 제품 문구만 사용) |

## 코드 변경

| 파일 | 변경 |
|---|---|
| `app/components/brand-mark.tsx` | **신규** — A1 심볼 인라인 SVG(`BrandGlyph`). 본체 `currentColor`, 브리지 `.mark-bridge`(CSS) |
| `app/page.tsx` | 헤더·게이트 카드·증거카드의 텍스트 "G" 3곳 → `<BrandGlyph />` |
| `app/components/info-shell.tsx` | 정보 페이지 헤더 마크 1곳 → `<BrandGlyph />` |
| `app/globals.css` | `.brand-mark` 텍스트용 속성 정리(color→`--paper`), `svg`/`.mark-bridge` 규칙 추가, `@media print`에 브리지 잉크 반전 1줄(#26 유지) |
| `app/layout.tsx` | `icons`에 `icon-192`·`shortcut(favicon.ico)` 추가 |
| `app/manifest.ts` | **신규** — 최소 매니페스트(이름·`start_url`·토큰 색·아이콘 3종). `/manifest.webmanifest` 200 + `<link rel="manifest">` 자동 주입 실측 |

## 등록·원본용 자산 (사이트 미참조 — 이 폴더 보관)

| 파일 | 용도 |
|---|---|
| `assets/symbol.svg` / `symbol-on-dark.svg` | 심볼 원본(밝은/어두운 배경) |
| `assets/mono-black.svg` / `mono-white.svg` | 단색판 — 브리지 캡슐 창(음각)으로 단색에서도 연결 구조 구분 |
| `assets/logo-horizontal.svg` / `-on-dark.svg` | 기본 가로형 로고(워드마크 락업) |
| `assets/kakao-app-icon-512.png` | Kakao Developers 앱 아이콘 등록용(풀블리드 — 라운딩은 카카오 적용) — **이번 PR에서 등록 안 함** |
| `assets/naver-logo-512.png` | Naver Developers 검수용 로고(흰 배경) — **이번 PR에서 등록 안 함** |

## 라이선스·자체 제작 확인

- 모든 SVG/PNG는 이 저장소 작업에서 **좌표 기반으로 직접 제작**(외부 로고·아이콘·스톡·생성 이미지 복사 없음)
- 색: 기존 디자인 토큰만 — `--ink #17243d`, `--yellow #f4c84a`, `--paper #fffdf7`, `--ivory #f7f3e9`, 그린 `#1f705f`(사이트 기존 값). 그라데이션·그림자 없음
- 워드마크·OG 텍스트: 시스템 폰트 스택(-apple-system/Helvetica Neue/Apple SD Gothic Neo, Georgia는 기존 프로젝트 체계) — **새 유료 폰트·라이선스 불명 폰트 없음**, 폰트 파일 임베드 없음
- 유사성: 원형 G 레터마크 계열은 선례가 많아(콘셉트 평가 CAUTION #13) 세로 노란 브리지를 고유 요소로 유지 — 상표 출원 전에는 전문 검색 권장(현 단계 대회 제출용으로는 자체 제작 기록으로 충분)

## 알려진 한계(정직 기록)

- OG **1:1 중앙 크롭**(일부 카카오 리스트형)에서는 좌상단 로고가 부분적으로 잘려 헤드라인 중심으로 보임 — 1.91:1 카드·150px 썸네일에서는 브랜드명 식별 가능(`renders/og-crops.png`)
- `npm run lint` 4건은 main(62f3449)에도 동일 존재하는 레거시(info-shell `<a href="/">` 2건, guide 따옴표 2건)로 브랜드 교체와 무관 — 이 브랜치에서 수정하지 않음(범위 제한)
- 실기기 브라우저 탭·홈 화면·카카오톡 실공유 확인은 배포 후 #12 Phase B
