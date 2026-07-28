# GapProof 트러블슈팅 사례

**작성일**: 2026-07-28(2026-07-28 PR #78 병합 반영으로 갱신). 모든 사례는 실제 커밋·devlog에 근거한 실제 발생 문제다. 지어낸 사례 없음. 사례 2~5는 `docs/devlog/2026-07-28-lighthouse-90.md`에 근거했다 — 최초 작성 시점에는 PR #78이 아직 main에 병합되지 않아 이 파일이 이 브랜치의 작업 트리에 없었고 `git show perf/lighthouse-90:...`로 직접 읽어 확인했으나, PR #78이 2026-07-28 main에 병합·배포된 이후로는 이 브랜치에도 `docs/devlog/2026-07-28-lighthouse-90.md`가 그대로 존재한다. 사례 1은 `wrangler.jsonc`의 `compatibility_date` 커밋 이력·주석에 근거했다.

---

## 사례 1 — 로컬 dev 서버가 기동하지 않음: `compatibility_date`와 잠금파일 `workerd` 버전 불일치

**문제**: `npm run dev`(`vinext dev`, 내부적으로 `wrangler` 사용)가 기동하지 않음.

**원인**: `wrangler.jsonc`의 `compatibility_date`가 프로젝트 스캐폴드 생성일(2026-07-23)로 그대로 설정되어 있었으나, 로컬 `package-lock.json`에 고정된 `workerd` 버전(`1.20260515.1`)이 지원하는 최대 호환 날짜가 그보다 이전이었다. Cloudflare Workers 런타임은 `compatibility_date`가 로컬 `workerd`의 지원 범위를 벗어나면 기동을 거부한다.

**해결**: 처음에는 "최신 `miniflare`로 업그레이드하면 되지 않을까"라는 가설을 세웠으나, 최신 `miniflare`(`4.20260722.0`)도 2026-07-23을 지원하지 않아 업그레이드로는 해결되지 않음을 확인했다. 실제 해결책은 `compatibility_date`를 로컬 고정 `workerd`가 실제로 지원하는 날짜(`2026-05-22`)로 낮추는 것이었다. 이 값은 빌드 산출물(`dist/server/wrangler.json`)에도 그대로 상속되므로 로컬 dev와 실제 배포 의미가 일치한다.

**검증**: `npm run dev` 정상 기동 확인.

**배운 점**: "패키지를 최신으로 올리면 해결될 것"이라는 직관적 가설을 먼저 검증 없이 실행하지 않고, 실제로 `miniflare` 최신 버전의 지원 날짜를 확인한 뒤 반증했다 — 근거 없는 가설을 코드에 반영하지 않는 습관이 잘못된 방향의 작업을 막았다.

---

## 사례 2 — Lighthouse Performance 84~90점(목표 미달)의 진짜 원인은 코드가 아니라 측정 서버였다

**문제**: PR #78 목표(모바일 Lighthouse Performance ≥90)를 검증하던 중, `npm run build && npm start`(`vinext start`) 기준 측정에서 `/`=89, `/demo?sample=1`=84로 목표 미달.

**원인 조사**: 추측으로 코드를 손대지 않고 먼저 `curl -D-`로 응답 헤더를 확인했다. CSS(63KB)·JS 번들(프레임워크 190KB + 인덱스 81KB)이 `Content-Encoding` 헤더 없이 **무압축**으로 서빙되고 있었다(HTML 문서만 brotli 압축). Lighthouse 감사 결과(`unused-css-rules`, `unused-javascript`, `total-byte-weight` 351~421KB)와 FCP≈LCP≈Speed Index(≈2.9초)인데 TBT는 21~36ms로 매우 낮다는 패턴을 근거로, 병목이 CPU 연산이 아니라 **스로틀링된 네트워크에서 내려받아야 할 바이트 총량**임을 추정했다.

`vinext start`는 vinext 자체의 범용 Vite 프리뷰 서버로, 실제 배포 대상인 Cloudflare Workers(`wrangler.jsonc`의 Assets 바인딩, 표준적으로 정적 자산을 자동 압축)와 무관하다는 것을 확인했다.

**해결**: 측정 서버를 `npx wrangler dev`(실제 `workerd` 런타임을 로컬에서 그대로 구동, 같은 빌드 산출물 사용)로 교체.

**검증**: `curl -D-`로 `wrangler dev`가 서빙하는 자산에 `Content-Encoding: gzip` + `Cache-Control: public, max-age=31536000, immutable` + `ETag`가 실제로 붙는지 먼저 확인한 뒤, Lighthouse를 재측정했다. 결과: `/`=99, `/demo?sample=1`=98, `/how-it-works`=99, `/technology`=99 — 애플리케이션 코드는 한 줄도 바꾸지 않은 상태에서 전부 목표를 초과 달성했다.

**배운 점**: 성능 문제처럼 보이는 것이 실제로는 "무엇을 측정하고 있는가"의 문제일 수 있다. 로컬 프리뷰 서버가 실제 배포 환경(Cloudflare Workers Assets 압축 동작)을 재현하지 않는다는 사실을 놓쳤다면, 실제로는 존재하지 않는 성능 문제를 고치려고 불필요한 코드 변경을 시도했을 것이다. 이후 로컬 성능 측정에는 `wrangler dev`만 공식 기준으로 채택했다.

---

## 사례 3 — SEO 개선 시도(noindex 추가)가 오히려 SEO 점수를 100→66으로 떨어뜨림

**문제**: 팀 검토(SEO Specialist 역할) 중 `/demo`가 클라이언트 컴포넌트(`"use client"`)라 자체 `metadata`를 export할 수 없어 루트 layout의 `canonical: "/"`를 그대로 물려받는 실제 버그를 발견했다(Lighthouse SEO 점수는 canonical의 "존재"만 확인하고 "적절성"은 확인하지 않아 100점 뒤에 가려져 있었다).

**첫 시도**: `app/demo/layout.tsx`(신규 서버 컴포넌트)를 추가해 `canonical: "/demo"`를 바로잡으면서, SEO 팀원의 부가 제안대로 `robots: { index: false, follow: false }`도 함께 넣었다("데모 페이지는 검색엔진에 노출될 필요 없다"는 합리적으로 보이는 판단).

**결과 확인(변경마다 반드시 재측정)**: 재빌드 후 Lighthouse를 다시 돌리자 `/demo?sample=1`의 SEO 점수가 100→**66**으로 떨어졌다. 원인은 Lighthouse의 `is-crawlable` 감사가 `noindex` 페이지를 자동으로 감점 처리하기 때문이었다(원본 JSON 결과를 `demo-after-fix-check.json`로 보존해 근거로 남겼다). `/demo?sample=1`은 이번 목표가 명시적으로 요구하는 SEO≥95 측정 대상 페이지였다.

**해결**: robots 지시자만 되돌리고 canonical 수정은 유지했다. 인덱싱을 막고 싶다면 Lighthouse 감점 없이 `robots.txt`의 `Disallow`로 대응하는 대안이 있다는 것을 후속 메모로 남겼다(이번 PR 범위 밖).

**검증**: `curl`로 `<link rel="canonical" href=".../demo">` 확인, `<meta name="robots">` 태그가 어디에도 없음(되돌림 확인) — SEO 점수 100 유지 확인.

**배운 점**: "합리적으로 보이는 개선"도 코드를 바꾼 뒤에는 반드시 재측정해서 회귀를 확인해야 한다. 이 프로젝트 전체에서 지킨 원칙 — "변경마다 재측정하여 회귀하면 즉시 되돌린다" — 을 실제로 적용해 사용자에게 보이지 않는 곳에서 조용히 점수가 떨어지는 것을 막은 사례다.

---

## 사례 4 — 접근성 자동 테스트의 구조적 사각지대: STEP0 상태가 한 번도 스캔되지 않았다

**문제**: 위 사례 3을 조사하던 Accessibility Auditor가 `/demo?sample=1`의 Accessibility 점수(96, 다른 페이지는 100)를 추적하다가, 원인(`.check-row.optional { opacity: .82; }`, 명도 대비 4.44:1로 기준 4.5:1에 0.06 미달)과 별개로 **기존 axe-core 테스트 스위트 자체의 사각지대**를 발견했다.

**원인**: `tests/e2e/accessibility.spec.ts`는 `/demo`(게이트 화면, STEP0)만 스캔하고, 다른 e2e 파일들은 전부 `reachLookIntoStep()` 같은 헬퍼로 STEP0을 건너뛴 뒤에만 axe를 실행하고 있었다. 그 결과 STEP0에만 존재하는 요소(선택 동의 체크박스의 안내 문구)의 명도 대비 위반이 한 번도 자동 검사에 걸린 적이 없었다.

**해결**: `app/globals.css`의 `.check-row.optional` opacity 값을 `.82`→`.92`로 조정해 명도 대비를 통과시키고, `tests/e2e/accessibility.spec.ts`의 `PATHS` 배열에 `"/demo?sample=1"`을 추가해 STEP0 이후 상태도 axe 스캔 대상에 포함시켰다.

**검증**: 재측정에서 `/demo?sample=1` Accessibility 96→100 확인, 신규 axe 케이스 2/2(light/dark) 통과 확인.

**배운 점**: "테스트가 다 통과한다"는 사실이 "모든 화면 상태가 검사됐다"를 의미하지 않는다. 이번 사례는 성능 조사 과정에서 우연히 발견됐는데, 만약 발견하지 못했다면 이 사각지대는 계속 남아 있었을 것이다.

---

## 사례 5 — Firefox 테스트 1건의 간헐적 실패: 코드 결함인지 환경 문제인지 추측하지 않고 재현으로 확인

**문제**: PR #78 최종 검증 중 `npx playwright test`(189개, chromium+firefox+webkit) 1차 실행에서 Firefox 프로젝트의 한 테스트(`role-personalization.spec.ts`)가 1건 실패했다.

**조사**: 실패 시점에 Lighthouse(헤드리스 Chrome 다수 프로세스)가 동시 실행 중이었다는 것을 로그로 확인하고, "리소스 경합"을 가설로 세웠다.

**검증(추측에 머무르지 않음)**: 다른 프로세스 없이 해당 파일만 격리해 5회 반복 실행(`--project=firefox tests/e2e/role-personalization.spec.ts --repeat-each=5`)했고, **5/5 전부 통과**했다. 이는 완전한 증명은 아니지만("반증하지 못했다"는 정도의 증거), 코드 회귀가 아니라 동시 실행 환경 문제일 가능성이 높다는 판단을 뒷받침했다.

**결론**: 코드 회귀로 단정하지도, 우연이라고 무시하지도 않고 "리소스 경합 가설이 반증되지 않았다"는 정직한 수준으로 기록했다. 이후 검증 절차에서 Lighthouse와 Playwright를 동시 실행하지 않는 규칙을 명문화했다.

**배운 점**: 간헐적 실패를 "다시 돌리니 통과했다"로 넘기지 않고, 격리된 조건에서 반복 재현해 최소한의 근거를 남기는 것이 "추측이 아니라 실측"이라는 이 프로젝트의 검증 원칙에 부합한다.
