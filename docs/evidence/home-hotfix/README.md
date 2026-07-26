# #67 모바일 홈 헤더·Hero 겹침 Hotfix 증거 (2026-07-26)

실기기 iPhone Safari 검증(세트 1-1)에서 보고된 공개 홈 첫 화면 레이아웃 충돌의 수정 전/후 증거.

## before (운영 https://gapproof.forblune.com, 수정 전)

- `before-prod-390-webkit.png` — WebKit 390px: 내비 둘째 줄이 Hero 과정 문구·제목 위에 겹치고 "데모 열기"가 제목을 침범, h1 "생각하지"가 단어 내에서 잘림
- `before-prod-collision.json` — 360·375·390·393·430 × Chromium/WebKit × 확대 근사 전 케이스에서 교차 검출(내비×eyebrow 최대 1,383px², 내비 스필 69px, 확대 근사 시 146px)

## after (로컬 하네스, `fix/mobile-safari-home-overlap` 빌드)

- `after-local-{375,390,430}-webkit.png` — 헤더가 문서 흐름으로 자라 겹침 0, h1 단어 경계 줄바꿈
- `after-local-1440-webkit.png` — 데스크톱 무변화(스티키 1줄 헤더 유지)
- `after-local-collision.json` — `tests/e2e/home-collision-verify.cjs` 26케이스(7뷰포트 × 2엔진 × 확대 모드) 전부 교차 0·스필 0·클리핑 0

측정 방법: `getBoundingClientRect` 교차 면적(1px 초과를 겹침으로 판정). 기존 qa-sweep의 overflow-x 검사는 세로 스필 겹침을 검출하지 못해 이 검사를 e2e로 영구 추가함.

## 2차 수정 — 햄버거 + 왼쪽 드로어 (2026-07-26)

여러 줄로 랩되는 내비 대신 모바일에서 로고+햄버거 한 줄만 남기고, 6개 메뉴+"데모 열기"를 왼쪽 슬라이드 드로어로 이동.

- `drawer/open-{375,390,430}-webkit.png` — 드로어 열림 상태(배경 딤·닫기 버튼·6개 메뉴+CTA 세로 배치)
- `drawer/desktop-1440-webkit-regression.png` — 데스크톱 1440px 무변화 확인(스티키 내비 그대로)

검증: `tests/e2e/drawer-verify.cjs`(신규) — 320~430px × Chromium/WebKit에서 닫힌 상태 교차 0, 열기/닫기 5종 트리거(햄버거·배경 클릭·닫기 버튼·메뉴 링크·브라우저 뒤로가기), focus trap 순환·복귀, body 스크롤 잠금, 44px 터치 목표, 텍스트 확대 시 클리핑 0, 데스크톱 1440 회귀 0 — 전부 PASS. `home-collision-verify.cjs`도 갱신(모바일에서 숨겨진 `.info-nav` 대신 실제 렌더되는 요소만 터치 목표 검사) 후 26/26 PASS.

기술 노트: `.topbar`의 `backdrop-filter`가 `position:fixed` 자손의 containing block을 헤더 박스로 축소시키는 브라우저 표준 동작이 있어, 드로어를 `createPortal`로 `document.body`에 렌더링해 우회함.

