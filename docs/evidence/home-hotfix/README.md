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
