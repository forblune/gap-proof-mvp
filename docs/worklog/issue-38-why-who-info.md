# Issue #38 — Gate 2c: /why·/who 신설과 정보 페이지 개편

- Issue: #38 · 브랜치 `feat/38-why-who-info`(base rc `0d66514`) · 작업일 2026-07-25

## 구현

- **/why 신설**(L 지시 전 항목): 경력 언어 문제 → 학력·직장 관점 한계 → 돌봄·게임·SNS·휴식기 분석 이유 → 행동 증거 원칙 → 과장 없는 구조 → 작은 검증 행동 → 하지 않는 것(판정·결정·경력 생성 금지)
- **/who 신설**(M 지시): "GapProof는 이런 분을 위해 만들었습니다." — 6대상 × (문제/돕는 방식/기대 결과/**대신 결정하지 않는 것**) 카드. AI 대화 가져오기는 "다음 단계" 정직 표기
- **역할 분리**: /why=문제·철학, /about=프로젝트·제작 배경 — about의 문제/대상 섹션 제거 후 안내문으로 대체(중복 0)
- **내비 통합**: InfoShell·홈·게이트 링크·푸터에 왜/누구 추가(7항목 데스크톱, aria-current 유지), InfoShell CTA에 무코드 샘플 링크 추가, 푸터 내비 신설
- sitemap에 /why /who 추가

## 검증

- `npm test` 21/21(공개 페이지 테스트에 /why·/who 문구·sitemap 계약 추가) · lint 레거시 4 외 0 · tsc 레거시 2 외 0 · diff OK
- /why·/who 360/1440 overflow 0 · about 중복 제거·포인터 확인 · aria-current 동작 (`docs/evidence/issue-38/`)

## 알려진 한계

- /guide·/how-it-works·/technology 본문의 V2·10,000자 반영은 해당 기능 Gate(3·4) 완료 후 일괄 갱신(현 내용은 현행 기능과 일치 상태 유지)
