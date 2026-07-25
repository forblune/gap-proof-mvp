# MindHub 패턴 채택 판정표 (Gate 0 · 읽기 전용 감사, 2026-07-25)

조사 대상: `/Users/gh/mindhub-mvp`(환자용 마음기록 — 정적 JS+Express+Supabase), `/Users/gh/mindhub-psych-emr`(의료진 EMR — React18+Vite+Supabase, 최신), `/Users/gh/psych-emr`(EMR 구버전 — 계보 확인용). 실데이터·.env·secret 미열람. **의료·진단·치료 용어와 환자 데이터 구조는 이식하지 않는다.**

변환 원칙: MindHub의 "기록 → 구조화 → 요약 → 진료 활용"을 GapProof의 "삶의 경험 → 사실·행동 구조화 → 근거·역량 요약 → 직업 가설·작은 검증 행동"으로 치환한다.

| MindHub 패턴 | 원래 목적 | GapProof 적용 가능성 | 판정 | 적용 대상 | 위험 | 관련 Issue |
|---|---|---|---|---|---|---|
| LLM 추출+서버 검증+규칙 폴백 이중화 (`mindhub-mvp backend/server.js /extract`) | 대화문에서 수면·기분 신호 JSON 추출, 범위 검증, 실패 시 규칙 폴백 | GapProof analyze가 이미 동형(인용 검증+샘플 폴백). V2에서 **스키마 확장 방식** 참고 | **수정 채택** | Gate 4 엔진 V2 응답 스키마·검증 | 의료 신호 필드명 이식 금지 — 스키마는 GapProof 용어로 재정의 | #40 |
| data-access seam (`mindhub-psych-emr src/data/api.js` — Supabase↔mock 자동 분기, row→UI shape 매핑 통일) | 컴포넌트가 데이터 출처를 모르게 하고 mock 모드로 E2E 가능 | 회원·이용량 도입 시 그대로 유효. 현 RC에서도 draft 저장소(localStorage)·샘플 fixture 접근을 seam으로 감싸면 테스트 용이 | **그대로 채택**(구조), 구현은 TS로 재작성 | Gate 1 draft 계층, Gate 7 데이터 계층 | 없음(구조 패턴) | #35 #43 |
| security-definer RLS 헬퍼 (`0002_auth_rls.sql` — app_role()/owns_patient() 함수 기반 정책) | 의사=담당 환자만, 역할별 접근 격리 | 회원 도입 시 auth.uid() 격리·초대 코드 감사에 동일 구조 적용 | **수정 채택**(역할 모델을 사용자/심사위원으로 치환) | Gate 7 migration·RLS | 운영 Supabase 반영은 Hard Stop — 로컬·파일까지만 | #43 |
| 공유 마스킹 RPC (`get_patient_report_entries` — 비공개 필드 NULL 마스킹) | 환자가 공유 선택한 항목만 의사에게 | Gap Brief 기관 공유 범위(익명 통계 동의)와 동형 — 서버 저장 도입 시 적용 | **수정 채택**(Phase: 회원 도입 후) | Gate 7 이후 | 현 RC는 서버 무저장이라 즉시 적용 없음 | #43(후속) |
| 표준 3-상태 게이트 loading/error/data + 재시도 카드 (`App.jsx`) | 데이터 로딩 UX 표준화 | GapProof 분석 로딩·오류 notice에 이미 부분 존재 — **재시도 버튼 표준화**만 차용 | **수정 채택** | Gate 3·4 오류 상태, Gate 9 문구 | 없음 | #39 #45 |
| mock 기반 Playwright E2E 40+ 케이스, console error 0 단언 (`tests/e2e.spec.js`) | 실행환경 없이 전체 여정 검증 | GapProof QA에 이미 유사 하니스 — **fixture/mock 모드 분리와 console 0 단언 관행** 차용 | **그대로 채택**(관행) | Gate 4 fixture 13종, Gate 10 QA | 없음 | #40 #46 |
| 인라인 편집→낙관적 갱신+감사로그 (`NotesTab.jsx`+handleUpdate*) | 기록 수정 이력 보존 | 역량 표현 수정은 이미 존재. **감사로그 개념은 초대 코드·동의 버전 기록**에 적용 | **수정 채택** | Gate 7 audit_logs | 의료 기록 감사 요건을 그대로 복제하지 않기 | #43 |
| 상태 구분 모델 (공유/비공개, urgent/caution/steady, 미평가) | 신호 트리아지 | V2의 **사실 상태(확인됨/부분 확인/계획·관심)·근거 강도·과장 위험** 라벨 체계의 참조 구조 | **수정 채택**(라벨은 진로 용어로 전면 교체) | Gate 4 상태 모델 | 의료 트리아지 용어(urgent 등) 이식 금지 | #40 |
| 모바일 16px 승격·드로어·1열 축소 (`app.html` 미디어쿼리) | 모바일 줌 방지·밀도 조정 | GapProof #4에서 이미 유사 적용 — 드로어형 모바일 메뉴는 Gate 2 탐색 구조에 참고 | **수정 채택** | Gate 2a 모바일 메뉴 | 없음 | #36 |
| textarea auto-grow + 서버·클라 이중 길이 상한 (3,000/12,000자) | 긴 입력 UX | Gate 3의 10,000자 확장과 동형 — auto-grow·카운터 관행 차용 | **그대로 채택**(관행) | Gate 3 입력 | 없음 | #39 |
| AuthContext/onAuthStateChange + authed 게이트 (`AuthContext.jsx`) | 로그인 전 데이터 미조회 | 회원 도입 시 표준 구조 | **그대로 채택**(도입 시) | Gate 7 | 운영 반영 Hard Stop | #43 |
| `window.confirm` 파괴적 작업 확인 | 삭제 확인 | GapProof는 이미 **커스텀 confirm-bar(alertdialog)** 로 상위 구현 — MindHub 방식이 열등 | **제외** | — | — | — |
| 타임라인/리포트 인라인 HTML 문자열 생성 | 빠른 MVP 렌더 | 컴포넌트화 안 된 구조 — 차용할 것 없음 | **제외** | — | 유지보수성 저하 | — |
| 의료 위험 감지·안전 트리아지 흐름 | 자살위험 등 안전 대응 | 진로 서비스에 그대로 적용 금지(오탐·과잉 개입 위험). 민감 경험 안내 문구만 별도 설계 | **제외** | Gate 3 민감 경험 안내(신규 설계) | 의료 안전 흐름 이식 금지 원칙 | #39 |

## 요약

- **그대로 채택(구조·관행)**: data-access seam, mock E2E+console 0, auto-grow 입력, AuthContext(도입 시)
- **수정 채택**: 추출 검증+폴백(스키마 재정의), RLS 헬퍼(역할 치환), 공유 마스킹 RPC(후속), 3-상태 재시도, 감사로그(동의·초대), 상태 라벨(진로 용어), 모바일 드로어
- **제외**: window.confirm, 인라인 HTML 렌더, 의료 안전 트리아지·진단 용어 전부
