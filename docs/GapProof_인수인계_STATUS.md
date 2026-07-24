# GapProof — 프로젝트 인수인계 / STATUS

> 새 세션·새 계정으로 이어갈 때 **이 문서 하나만 읽으면** 바로 이어서 작업 가능하도록 정리.
> (대화 기억은 계정/세션을 넘어가지 않음. 로컬 파일 + 이 문서가 연속성의 핵심.)
> 최종 갱신: 2026-07-24

## ⚠️ 최우선 읽기 — 소스 복구 상황 (2026-07-24)

**문제:** 최신 깨끗한 소스가 디스크에서 사라짐. 라이브(gapproof.forblune.com)엔 최신이 배포돼 있으나 **컴파일 번들**이라 소스 복원엔 부적합.

**발견된 코드 사본 (전수 조사 결과):**
- `/Users/gh/gap-proof-mvp` — **유일하게 쓸 만한 소스. GitHub 클론 = 초기 MVP만.** git 4커밋(최신 `d3c87ce "GapProof MVP + nodejs_compat 중복 수정"`, 7-23 12:09), `--yellow:#f4c84a`(원래 노랑), 브랜치 `fix/1-mobile-header-progress` 체크아웃 상태. → **재구성의 base.**
- `/Users/gh/.gemini/tmp|history/gap-proof-mvp` — Gemini CLI 메타데이터(소스 아님). `.project_root`→`/Users/gh/gap-proof-mvp`.
- `.chatgpt-projects/.g-p-…-previous-e37c9642…/gap-proof-mvp` — 빈 스텁.
- `.chatgpt-projects/g-p-…938e9/`(현재 프로젝트 폴더) — 코드 없음(문서만). 마지막 배포는 여기 있던 gap-proof-mvp에서 나왔으나 폴더 리셋으로 소실.

**GitHub에 아직 없는 것 = 재구성해야 할 최신 기능:**
- 접근 코드 게이트(1234) — `page.tsx` + `api/analyze/route.ts`
- `GPT_PROMPT` — **새 역할로**(참고: `deliverables/GapProof_GPT프롬프트_경험정리.md`)
- `app/api/resources/route.ts`(온통청년 + YouTube, env 게이트, 폴백)
- `engine.ts` 확장(ROLES 3직무×5역량, 격차/증거등급/퀴즈/getResources)
- `page.tsx` STEP 확장(퀴즈·리소스 스트립·자립 카피)
- `analyze/route.ts` 보안(maskPII·passcode·rate limit)
- 디자인 **방향 1 신뢰형**(딥틸 `#127c6b`·네이비·둥근·체크 로고) — :root + "Direction 1" 블록 + 로고 data-URI. ※라이브엔 이전 단계(Swiss 레드)까지만 반영.

**복구 계획 (다음 세션에서 실행):**
1. `/Users/gh/gap-proof-mvp` 폴더 연결.
2. `main`에 위 기능 재구현 (내가 아는 내용 + 필요시 **라이브 번들/CSS에서 정확 문구 추출**). 우선순위: 게이트 → analyze 보안 → resources → engine → page STEP → 디자인 1번 → 새 GPT_PROMPT.
3. `npx tsc --noEmit` + `npx eslint app` 검증(빌드는 사용자 Mac).
4. **`git commit` + `git push origin main`** (다신 안 잃게 백업!).
5. `npx vinext deploy` → 라이브 확인.
6. 이후 작업은 **항상 `/Users/gh/gap-proof-mvp`에서** 하고 자주 커밋·푸시.

---

## 한 줄 요약
Solar(Upstage) 기반 AI 진로·역량 분석 플랫폼. "공백을 지우지 않고 증거로 바꾼다". 2026 리부트 AI 활용대회 출품작. 자립형(상담사 없이 추천) + 선택적 상담사·기관 검토·K-MOOC/직업훈련 연계.

## 라이브 / 접속
- 사이트: **gapproof.forblune.com** (Cloudflare Workers)
- GitHub: **github.com/forblune/gap-proof-mvp**
- 접근 코드(게이트): **1234**
- Solar 모델: **solar-pro3** (Chat Completions, json_object)

## 배포 방법
```
cd ~/gap-proof-mvp   # ← 안정 위치(=GitHub 클론). 앞으로 여기서 작업.
npx vinext deploy
```
- API 키는 채팅에 붙이지 말 것. `npx wrangler secret put UPSTAGE_API_KEY` 로 등록.

## 핵심 코드 경로 (gap-proof-mvp/)
- `app/page.tsx` — 5스텝 UI, 게이트, `GPT_PROMPT`, 퀴즈, 리소스 스트립
- `app/api/analyze/route.ts` — Solar 분석 + PII 마스킹 + 게이트 + 레이트리밋
- `app/api/resources/route.ts` — 온통청년 + YouTube (env 게이트, 커스텀 폴백)
- `app/lib/engine.ts` — 역량/격차/증거등급/행동추천/퀴즈 엔진
- `app/globals.css` — 디자인 토큰(:root) + 스킨
- `GapProof_prototype.html` — 브라우저 단독 프로토타입(코드 미러)

## 디자인
- **확정: 방향 1 "신뢰형"** — 딥틸(#127c6b) + 네이비 잉크(#16232e) + 쿨 화이트(#f2f5f7) + 둥근 모서리 + **체크 원형 로고**.
- 적용 위치: `globals.css`의 `:root` + 하단 "Direction 1" 블록, 프로토타입도 동일.
- ⚠️ **검증 필요**: 2026-07-24 세션에서 이 편집을 했으나, 해당 세션에 코드 폴더가 마운트되지 않아 실제 파일 저장 여부 미확인. 다음 세션에서 `globals.css`에 `--yellow: #127c6b`, `data:image/svg`(체크 로고) 존재 여부 확인 후 없으면 재적용.

## 지금 열려있는 TODO
1. **`GPT_PROMPT` 교체** — 역할을 "GPT가 사이트에 넣을 경험 정리글 생성"으로.
   내용: `deliverables/GapProof_GPT프롬프트_경험정리.md` 참고. 복사 알림/안내 카피도 같이 교체.
2. **디자인 1번 저장 확인/재적용** (위 ⚠️).
3. **온통청년 청년정책 API** — 키 발급되면 `wrangler secret put YOUTH_API_KEY` + `resources/route.ts` 응답 파싱 확정(실제 응답 샘플로).
4. (선택) frontend-design / security-review 스킬로 마감 점검, 발표 방어 스크립트(차별성·증거등급 신뢰성·임팩트).

## 검증 방법(빌드 불가 환경일 때)
- `npx tsc --noEmit` (app/ 클린; cloudflare worker 타입 에러는 알려진 무해),
- `npx eslint app`, 프로토타입은 jsdom 테스트(직전 11/11),
- 문자열 보존 grep. 실제 빌드/배포는 사용자 Mac에서.

## 보안·역할 경계 (지킬 것)
- API 키를 채팅에 붙이지 않음 → `.env.local` 또는 `wrangler secret put`.
- 계정 로그인 / 약관 동의 / 정부포털(data.go.kr·온통청년) 신청서 제출 = **사용자 본인이** 수행. (에이전트가 대신 못 함)
- 개인 서사(가족·재수 등)는 발표 공개 범위를 본인이 결정 — 강제로 넣지 않음.

## 설치한 플러그인 (2026-07-24 기준)

계정·컴퓨터가 바뀌면 재설치 필요할 수 있음. 설치: `/plugin marketplace add <저장소>` → `/plugin install <이름>@<마켓플레이스>`.

**GapProof 작업 중 추가(핵심):**
- `frontend-design` — UI 디자인 가이드 (claude-plugins-official)
- `superpowers` 묶음 (superpowers-marketplace): superpowers, superpowers-dev, superpowers-lab, superpowers-chrome, claude-session-driver, elements-of-style, double-shot-latte
- `episodic-memory` (superpowers-marketplace) — 대화 기억(= "claude-mem" 역할)
- 보안 리뷰: `42crunch-api-security-testing`, `aikido` (claude-plugins-official) + 내장 `/security-review` 커맨드
- 코드 리뷰: `engineering:code-review` 스킬 + `/review`·`/code-review` 커맨드
- ⚠️ `gstack` (garrytan/gstack, Gary Tan "stack") — `/plugin marketplace add garrytan/gstack`로 시도했으나 **현재 설치 목록엔 안 보임**(Bun 설치 이슈). 필요하면 재확인.

**Cowork 기본 세트 (knowledge-work-plugins):** `design`, `engineering`, `data`, `pdf-viewer`, `legal`

**마켓플레이스:** knowledge-work-plugins(기본) · superpowers-marketplace · claude-plugins-official · (시도) garrytan/gstack

## 계정 전환 체크리스트 (부드러운 이어가기)
- [ ] 중요한 산출물은 이 폴더에 파일로 저장돼 있는지 확인(로컬은 계정 무관 유지)
- [ ] 새 계정/세션에서 **이 프로젝트 폴더 + gap-proof-mvp 코드 폴더** 다시 연결
- [ ] 커넥터(MCP) 재인증, 필요한 플러그인 재설치
- [ ] 이 문서(STATUS) 먼저 읽고 TODO부터 이어가기
