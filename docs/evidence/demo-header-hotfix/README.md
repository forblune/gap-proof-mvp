# #69 데모 헤더 모바일 액션 메뉴 Hotfix 증거 (2026-07-26)

실기기 iPhone Safari에서 보고된 `/demo` 헤더 모바일 액션 행("Solar Pro 3" 모델 요약, "새 분석 시작하기") 줄바꿈 결함의 수정 전/후 증거.

## before (사용자 실기기 신고, iPhone Safari, 운영)

- `before-prod-iphone-IMG_7702.png` — "Solar Pro\n3 · 기본" 모델 요약이 줄바꿈, "새 분석 시\n작하기" 버튼이 단어 내부에서 잘림, 모델 변경 버튼과 서로 침범
- `before-prod-iphone-IMG_7703.png` — 동일 화면 STEP1 입력 카드 노출 상태에서도 헤더 결함 지속

## after (로컬 하네스, `fix/demo-header-mobile-actions` 빌드)

- `after-open-{375,390,430}-webkit.png` — "⋯" 액션 메뉴를 우상단 팝오버로 대체: Solar 연결 배지·모델 요약·모델 변경 버튼이 여유 있는 세로 배치로 줄바꿈 없이 표시
- `desktop-1440-webkit-regression.png` — 데스크톱 1440px 무변화(기존 인라인 행 그대로 유지)

측정: `tests/e2e/actions-menu-verify.cjs` — 360~430px × Chromium/WebKit에서 모델 요약·배지 텍스트 클리핑(`scrollWidth > clientWidth`) 0, 헤더 단일 행(닫힌 상태 `.top-actions` 완전 숨김), 열기/닫기 4종 트리거(햄버거·바깥 클릭·닫기 버튼·뒤로가기), focus trap·복귀, body 스크롤 잠금, 44px 터치 목표, "모델 변경" 연동, 데스크톱 1440 회귀 0 — 전부 PASS.

## 부가 확인 — `/about` 등 정보 페이지 헤더 겹침

전체 라우트 모바일 스윕(운영 실측)에서 `/about` 헤더 내비 항목 간 실측 교차(약 1512px², 360·390px)를 추가 확인. 원인은 #67/#68과 동일(`InfoShell` 공용 헤더의 `.info-nav` 랩)이며, PR #68(모바일 햄버거+드로어)이 병합·배포되면 모든 정보 페이지(`/why` `/who` `/guide` `/how-it-works` `/technology` `/about` `/privacy` `/terms`)에 동일하게 자동 적용되어 추가 작업 없이 해결됨.
