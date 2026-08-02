# GapProof Site Freeze — 2026-08-02

영상 제출 전날 화면 동결 기록. **내일 녹화 전까지 코드 변경을 하지 않습니다.**

---

## 1. 동결 대상

| 항목 | 값 |
| --- | --- |
| 저장소 | `forblune/gap-proof-mvp` |
| 브랜치 | `main` |
| 동결 커밋 | `200958d` (`fix(a11y): 분석 진행 화면의 대기 단계가 WCAG AA 아래로 떨어지던 문제 + 사각지대 테스트`) |
| 프로덕션 URL | https://gapproof.forblune.com |
| **활성 Worker 버전** | **`fdcb493a-a11f-4f6d-b95a-dfcd792f2e02`** (2026-08-02T01:58:38Z) |
| 롤백 목표 (오늘 이전) | `a60275e6-8776-4b11-8820-d5d7d13fd416` (2026-07-30T06:30Z) |
| 오늘 중간 버전 | `40feb941-…` (00:45Z) · `368e4d29-…` (00:53Z) |

---

## 2. 오늘 들어간 변경 (커밋 9개)

| 커밋 | 내용 |
| --- | --- |
| `6ae662a` | main 에 남아 있던 `tsc --noEmit` 2건·`lint` 4건 실패 정리 |
| `4df300e` | 분석 진행 화면 신설 + 샘플 모드가 사실과 다르게 말하던 문구 정정 |
| `cb3dc71` | 죽은 CSS 셀렉터·사라진 글머리 기호·카드 바닥 빈 공간 등 시각 결함 6건 |
| `edcb07d` | 녹화 Runbook·Shot List·Canonical Demo fixture 문서 |
| `19744ae` | 홈 시각 회귀 기준 이미지 갱신 (firefox) |
| `14de604` | 분석 진행 화면이 스크롤 아래에서 시작하던 문제 |
| `b652bcd` | 긴 예시 라벨 글자 수를 실제 값으로 정정 (실제의 약 1.8배로 적혀 있었음) |
| `b6ce349` | 768~1050px 에서 제목·버튼·푸터의 한국어 어절 끊김 |
| `200958d` | 진행 화면 대기 단계의 대비 위반(2.45:1) 수정 + 그 화면을 검사하는 axe 테스트 추가 |

기능 추가·리팩터링·Supabase·인증·DB migration·외부 API 추가는 **없습니다.**

---

## 3. 동결 시점 검증 결과

### 로컬

| 검사 | 결과 |
| --- | --- |
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS (동결 전 main 에서는 FAIL 이었음) |
| `npm run lint` | PASS (동결 전 main 에서는 FAIL 이었음) |
| `npm test` (단위·통합) | PASS |
| Playwright 전체 (chromium·firefox·webkit, 462건) | 460 PASS / 2 FAIL — 아래 설명 |

**실패 2건은 같은 테스트입니다** — `auth-configured › 브라우저가 Supabase 인증 엔드포인트로
실제 요청을 보낸다` (chromium·webkit). 이 테스트는 일부러 틀린 비밀번호로 **운영 Supabase
인증 엔드포인트에 실제 요청**을 보냅니다. 오늘 밤 전체 스위트를 4회 돌리며 로그인 실패 요청이
누적돼 Supabase 쪽 한도에 걸린 것으로 보입니다.

코드 회귀가 아니라고 판단한 근거:

- 같은 실행에서 **firefox 는 381ms 에 통과**했습니다.
- 직전 두 번의 전체 실행(`e2e2`·`e2e4`)에서는 **3개 브라우저 모두 통과**했습니다.
- 실패 직후 **단독 실행하면 906ms 에 통과**합니다.
- 오늘 변경분에는 인증 관련 코드가 **한 줄도 없습니다**
  (`app/demo/page.tsx`·`app/globals.css`·`app/lib/samples.ts`·`app/guide/page.tsx`·
  `eslint.config.mjs`·`app/types/cloudflare-workers.d.ts`·`tests/e2e/accessibility.spec.ts`).

> 앞선 실행에서 `[firefox] screenshots 홈페이지` 도 한 번 실패했는데, 홈 화면을 의도적으로
> 바꾼 결과였습니다. 차이 이미지를 확인해 변경이 의도한 두 가지(헤더 CTA 외곽선·목록 글머리
> 기호)뿐임을 확인하고 기준 이미지를 갱신했습니다(`19744ae`).

> 테스트 총계가 456 → 462 로 늘어난 것은 분석 진행 화면 접근성 검사 6건
> (3 브라우저 × 2 테마)을 새로 넣었기 때문입니다.

### 프로덕션 (동결 버전 기준)

| 검사 | 결과 |
| --- | --- |
| 라우트 14종 (`/` `/demo` `/demo?sample=1` `/technology` `/how-it-works` `/guide` `/why` `/who` `/about` `/privacy` `/terms` `manifest` `robots` `sitemap`) | 전부 200 |
| 보안 헤더 5종 | 전부 존재 (CSP frame-ancestors·Permissions-Policy·Referrer-Policy·X-Content-Type-Options·X-Frame-Options) |
| 데모 흐름 3회 반복 | 3회 모두 동일 결과 |
| 콘솔 오류 | 0 |
| 실패한 네트워크 요청 | 0 |
| 가로 넘침 (390·768·1024·1440) | 0 |

#### 3회 반복 실측값 (프로덕션)

| 항목 | take1 | take2 | take3 |
| --- | --- | --- | --- |
| 분석 진행 소요 | 2891ms | 2947ms | 2871ms |
| 진행 단계 수 | 3 | 3 | 3 |
| 진행 화면 스크롤 위치 | 0 | 0 | 0 |
| 역량 카드 수 | 3 | 3 | 3 |
| 목표직무 | AI 서비스 기획자 | 〃 | 〃 |
| 이번 주 행동 | 5명 인터뷰 후 인사이트 정리 | 〃 | 〃 |
| Gap Brief 바닥 여백 | 1px | 1px | 1px |

Gap Brief 바닥 여백은 동결 전 약 166px 였습니다(잘린 카드처럼 보이던 문제).

---

## 4. 롤백

즉시 롤백 조건: 홈·데모 5xx, 게이트 인증 불가, 자산 대량 404, PII 노출, 분석 흐름 차단.

```bash
npx wrangler rollback            # 직전 버전으로 복귀
# 또는 대시보드 → Workers & Pages → gapproof-mvp → Deployments → 버전 선택 → Rollback
```

오늘 이전 상태로 되돌리려면 `a60275e6-8776-4b11-8820-d5d7d13fd416` 을 고릅니다.
롤백 후 `/` 200 과 `/demo?sample=1` 진입을 다시 확인하십시오.

커밋 단위 되돌리기도 가능합니다 — 9개 커밋이 서로 독립적이라
`git revert <커밋>` 로 한 건씩 되돌릴 수 있습니다.

---

## 5. 동결 해제 조건

내일 녹화 중 **촬영을 진행할 수 없는 결함**이 나왔을 때만 해제합니다.
그 경우에도:

1. 무엇이 촬영을 막는지 먼저 기록하고
2. 가장 작은 수정만 하고
3. `npm run build` · `tsc` · `lint` · `npm test` · 핵심 E2E 를 다시 돌리고
4. 배포 후 `/demo?sample=1` 3회 반복 확인

을 거칩니다.

미관상 아쉬운 점, 개선하면 좋을 점은 **해제 사유가 아닙니다.**

---

## 6. 녹화 문서

- `docs/presentation/GAPPROOF_RECORDING_RUNBOOK.md` — 접속·설정·조작 순서·문제 대처
- `docs/presentation/GAPPROOF_RECORDING_SHOT_LIST.md` — 9 Shot (+선택 2)
- `docs/presentation/GAPPROOF_CANONICAL_DEMO.md` — fixture 내용과 고정값
