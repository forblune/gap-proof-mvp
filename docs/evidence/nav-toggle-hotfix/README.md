# nav-toggle 햄버거 아이콘 렌더링 Hotfix 증거 (2026-07-26)

운영 배포(Worker `2ee6102c`) 직후 사용자 실기기(iPhone Safari)에서 발견된 결함.

## 원인

`app/globals.css`의 `.nav-toggle`이 모바일 미디어쿼리에서 `display: inline-flex`로 전환되지만
`flex-direction`을 지정하지 않아 기본값 `row`가 적용됨 — 3개의 `span`(각 20×2px 막대)이
세로로 쌓이지 않고 가로로 나란히 배치되며 `margin-top`만 어긋나 "☰" 대신 "—‗‗" 형태로 깨져 보임.

## 증거

- `before-prod-iphone-broken.png` — 운영 스크린샷에서 크롭·3배 확대: 막대 3개가 가로로 흩어짐(x 좌표가 서로 다름)
- `after-hamburger-icon.png` — `flex-direction: column` 추가 후 로컬 빌드: 정상 "☰" 렌더링

## 검증

`tests/e2e/drawer-verify.cjs`에 회귀 방지 검사 추가 — `.nav-toggle span` 3개의 x좌표가 동일하고
y좌표가 순차적으로 증가(세로 스택)하는지 기하학적으로 확인. 이전에는 `display`·크기(44px)만
검사해 이 버그를 놓쳤음(기능은 정상 동작해 클릭·aria-expanded 등은 전부 통과했었음).

drawer-verify·home-collision-verify·actions-menu-verify(Chromium/WebKit/Firefox) 전부 PASS.
