# 게이트 → 회원 체계 전환 계획 (Gate 7 #43 · ADR-0001 이행)

상태: **로컬 설계·검증 완료 / 운영 반영·UI 공개는 Hard Stop(사용자 승인 필요)**. 부분 공개 금지 원칙에 따라 아래 세트가 전부 준비되기 전에는 어떤 회원 기능도 운영에 노출하지 않는다.

## 1. 검증된 기반 (이 저장소)

- `supabase/migrations/0001_rc_auth_foundation.sql` — 7테이블(profiles·consent_records·usage_entitlements·usage_ledger·invite_codes·invite_redemptions·audit_logs) + RLS + security-definer 3함수(redeem_invite/record_usage/delete_account)
- 검증: 로컬 Postgres 16(auth 스텁 `tests/sql/auth-stub.sql`)에서 `tests/sql/validate-rls.sql` **PASS** — 사용자 격리(A/B/anon), 초대 코드 **평문 무저장(sha256)**·만료·총사용·계정당 제한·회수 상태, ledger 직접 조작 차단(정책 부재로 함수만 허용), audit 사용자 비가시, 탈퇴 시 개인 데이터 즉시 삭제+마커
- 재현: `initdb`+`pg_ctl`(스크래치) → stub → migration → grants → validate (Docker·supabase CLI 불필요)

## 2. 사용자 흐름 설계

### 일반 사용자
공개 페이지 열람(현행) → 이메일 가입(만 14세 확인 체크+생년, privacy/terms **버전 동의 기록**) → 이메일 인증(미인증 시 분석 불가) → 로그인 → 무료 이용 횟수(free_quota, 기본 3회)·남은 횟수·다음 충전 시점 표시 → 분석 시 `record_usage` 차감 → 기록(회원 저장은 후속 Phase — 초기엔 현행 기기 draft 유지) → 계정 화면(탈퇴 = `delete_account`: 데이터 즉시 삭제)

### 교수님·심사위원·멘토
일반 로그인 → **초대 코드 입력**(`redeem_invite`) → extra_quota 부여·만료일·사용 내역 표시. 코드는 발급 시 1회만 평문 노출, 저장은 해시.

### 인증 세부 정책
- 자동 로그인: Supabase 세션 갱신(refresh) 기반 — 별도 장기 토큰 자체 저장 금지
- 이메일 기억하기: 이메일 문자열만 localStorage(선택) — **비밀번호 저장 금지**(브라우저 관리자에 위임)
- 비밀번호 재설정: Supabase 표준 메일 플로우
- **계정 열거 방지**: 가입·재설정·아이디 찾기 응답을 존재 여부와 무관하게 동일 문구로("입력한 주소로 안내를 보냈어요 — 계정이 있다면 몇 분 안에 도착해요"). 휴대전화 본인확인 도입 전에는 "가입 이메일 찾기"를 제공하지 않는다(과장 금지)
- 카카오 로그인: **최소 수집** — 계정 생성에 필요한 식별자(+이메일은 실제 필요 시에만 동의 요청), 프로필 사진·닉네임 미요청(#13 지시 연계)
- 세션 만료: 현행 draft 보존(#35)과 결합해 재로그인 후 이어서 진행
- 무차별 대입: 초대 코드 시도는 audit_logs 기록 기반 횟수 제한 + 기존 엣지 rate limit 병행
- **운영 적용 시 보강(독립 리뷰 발견)**: `redeem_invite`의 count-then-insert는 동시 요청에서 max_uses를 초과할 수 있다 — 운영 적용 전 advisory lock(`pg_advisory_xact_lock(hashtext(invite_id::text))`) 또는 사용 횟수 컬럼+체크 제약으로 원자화한다

## 3. 운영 전환 절차 (전부 Hard Stop 뒤)

1. [사용자 승인] 운영 Supabase 프로젝트 생성 → migration 적용 → 스모크(validate 스크립트의 운영판)
2. [사용자 승인] 메일 발송 도메인·템플릿 구성(인증·재설정)
3. [사용자 승인] 카카오 콘솔 설정(최소 동의 항목)
4. /privacy·/terms를 회원 데이터 흐름 기준으로 개정(버전 상향) → 가입 화면에 동의 버전 기록 연결
5. UI 공개(가입~탈퇴 전체 세트 동시) → 게이트 코드는 심사 전환 기간만 병행 후 제거
6. 롤백: UI 플래그로 회원 진입 차단 + 게이트 복귀(스키마는 유지)

## 4. RC에서 하지 않는 것

운영 Supabase 반영 · 메일 인프라 · 카카오/네이버/구글 콘솔 변경 · 회원 UI 노출(부분 공개 금지) · 실제 개인정보 테스트
