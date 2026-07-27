# final-audit 보고 (2026-07-27)

**대상**: `design/professor-feedback-hybrid` 브랜치, design-loop 11~12(시도 후 되돌림) 종료 시점(HEAD `912ec2c`, working tree clean 상태에서 검증)
**직전 독립 평가 점수**: 73.5/100 (세부 평균 6.91/10) — 지속형 개선 루프는 연속 두 루프(11, 12)의 실질(persisted) 총점 상승폭이 각각 0점(둘 다 되돌림)이라 중단됨.
**배포 여부**: 이 보고서는 배포 가능 여부만 판단한다. 실제 배포(프로덕션 발행, `wrangler deploy` 등)는 수행하지 않았다.

---

### 기능
- `npm run build`: ✅ 성공 (모든 라우트 컴파일 완료, `/`, `/about`, `/api/*`, `/demo`, `/guide`, `/how-it-works`, `/privacy`, `/technology`, `/terms`, `/who`, `/why`).
- `npm test` (node:test, 37개 — draft 저장/복원, V2 발견 엔진, 파일 가져오기, 게이트 인증·서명 쿠키·요청 한도·모델 allowlist·PII 마스킹 등): ✅ **37/37 통과**, 0 실패.
- `tests/e2e/user-flow.spec.ts`(샘플 여정 완주 — 동의 체크→경험 입력→역량 확인(맞아요 클릭)→격차·행동→GapProof 결과 / 여정 나가기→게이트 복귀→draft 오염 없음): ✅ 3개 브라우저 전부 통과.
- `tests/e2e/gate.spec.ts`(잘못된 코드, 샘플 우회, `?sample=1` 직접 접근): ✅ 3개 브라우저 전부 통과.
- `tests/e2e/home.spec.ts`(홈 로드, 데모 진입 링크, 콘솔 오류 0건, 실패한 네트워크 요청 0건 — `/`, `/demo`, `/why`, `/how-it-works`): ✅ 3개 브라우저 전부 통과.
- 결론: 기능 회귀 없음.

### 반응형
- `tests/e2e/responsive.spec.ts`: 390/768/1024/1440px × `/`, `/demo`, `/why` — 가로 오버플로 **0건**, 3개 브라우저 전부 통과(12개 케이스 × 3브라우저 = 36/36).
- 수동 확인(Playwright chromium 직접 launch, 라이트+다크 × 1440px 데스크톱 + 390px 모바일): 홈, 데모 게이트, 데모 STEP0~STEP4 전체 샘플 여정, `/technology`, 모바일 드로어 메뉴(390px) — 레이아웃 붕괴·콘텐츠 잘림 없음. 스크린샷은 `docs/quality-loop/screenshots/final/{light,dark}/`에 보관.
- **예외(권고 아님, 기존 미해결 결함 재확인)**: 390px `/demo?sample=1` STEP4(최종 결과 화면)의 `.final-actions .primary` 버튼("체험 처음부터 시작하기 ↻")이 flex 잔여폭(실측 74.75px, 컨테이너 354px 대비)에 끼여 5줄로 쪼개진다. `scrollWidth>clientWidth` 기반 자동 오버플로 검사(위 반응형 스위트)로는 이 결함이 잡히지 않는다 — 세로로 줄바꿈될 뿐 가로 오버플로는 발생하지 않기 때문. design-loop-11·12에서 각각 수정을 시도했으나(`.final-actions .primary { flex: 1 1 100%; }`) 다른 변경과 함께 묶여 있어 되돌려졌고, 이 결함 자체는 현재 코드에 그대로 남아 있다(직접 재현·측정으로 확인).

### 브라우저별 결과
| 브라우저 | 통과 | 실패 | 비고 |
|---|---|---|---|
| chromium | 38/38 | 0 | — |
| firefox | 38/38 | 0 | — |
| webkit | 38/38 | 0 | — |

전체 `npx playwright test` (accessibility/gate/home/responsive/screenshots/user-flow 6개 spec 전체, 3브라우저): **114/114 통과**.

### 접근성
- `tests/e2e/accessibility.spec.ts`(axe-core, wcag2a/wcag2aa, 라이트+다크 × `/`, `/demo`, `/why`, `/how-it-works`): **serious/critical 위반 0건**, 3개 브라우저 전부 통과(8케이스 × 3브라우저 = 24/24).
- 추가 수동 axe-core 점검(이번 감사에서 별도 실행, 트래킹 스위트 외): `/technology`, `/guide`, `/about`, `/who` × 라이트/다크(8케이스) + `/demo?sample=1` STEP4 최종 결과 화면(1케이스) = 9케이스 전부 **serious/critical 위반 0건**.
- Lighthouse Accessibility 점수: `/` 100/100, `/demo`(게이트 상태) 100/100.
- 키보드만으로 홈페이지 조작 가능 여부 직접 검증(Playwright, Tab/Enter): 로고 → 상단 내비게이션 링크 6개(`/why`,`/who`,`/guide`,`/how-it-works`,`/technology`,`/about`) → 테마 토글 버튼 → 헤더 CTA(`데모 열기`) → 히어로 CTA 순서로 포커스가 논리적으로 이동하며, 포커스 트랩·건너뜀 없음. 테마 토글에서 Enter를 누르면 `data-theme`가 `light→dark`로 실제 전환됨을 확인. 이어서 Tab 1회 후 Enter로 헤더 CTA를 눌러 `/demo`로 정상 이동함을 확인 — 키보드만으로 "홈 내비게이션 → 테마 토글 → 데모 진입"까지 전부 가능.
- 결론: serious/critical 접근성 위반 0건(배포 차단 사유 없음).

### 성능 (Lighthouse, 프로덕션 빌드 `npm run build && npm start` 기준, `localhost:3000`)
| 페이지 | Performance | Accessibility | Best Practices | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | 90 | 100 | 96 | 100 | 2.9s | 2.9s | 60ms | 0 |
| `/demo`(게이트 상태) | 84 | 100 | 96 | 100 | 3.4s | 3.2s | 90ms | 0 |

- Performance 84~90점(양호~우수 경계), Accessibility·SEO는 두 페이지 모두 만점.
- Best Practices 96점(양쪽 동일) 감점 사유: `errors-in-console` 감사 1건 — `app/manifest.ts`의 `manifest.webmanifest` 절대경로가 운영 도메인(`gapproof.forblune.com`)으로 하드코딩돼 있어 `localhost:3000`에서 CORS 오류(`net::ERR_FAILED`)가 콘솔에 남는다. **이번 design-loop 11~12 및 그 이전 루프들과 무관하게 이전부터 존재하던 이슈**이며, 실제 운영 도메인에서는 origin이 일치해 재현되지 않을 가능성이 높다 — 다만 로컬 개발·스테이징 환경에서는 매번 콘솔 오류가 남는다는 사실은 그대로 기록한다.

### 문체와 콘텐츠 (professor-review 갱신)
가장 최근 독립 재채점(design-loop-11/12 되돌림 이후, 즉 현재 코드 상태와 동일한 시점) 기준.

| 항목 | 배점 | 점수 |
|---|---|---|
| 1. 교수님 피드백 반영 | 30 | 21 |
| 2. 첫인상과 시각적 위계 | 20 | 15 |
| 3. 타이포그래피와 가독성 | 15 | 11.5 |
| 4. 반응형과 사용 편의성 | 15 | 11.5 |
| 5. 기술 적용과 성과 설명 | 10 | 7.5 |
| 6. 기능·접근성·성능 품질 | 10 | 7 |
| **총점** | **100** | **73.5** |

세부 11항목 평균 6.91/10 — 최저점: 콘텐츠 밀도(5/10). 자세한 세부 표와 변화 추이는 `docs/quality-loop/FINAL_PROFESSOR_REVIEW.md` 참고.

**직접 재확인한 남은 저점 사유(스크린샷·실측 기준)**:
1. **콘텐츠 밀도(5/10, 최저)**: `/how-it-works` 12단계 파이프라인 전체 나열, `/demo` STEP2 카드 1개당 7개 이상 하위 블록(인용문·근거링크·근거뱃지·과장주의·직업가설·이번주실험 등) — design-loop-11/12가 각각 완화를 시도했으나 정보 손실 위험·핵심 액션 카피 기본 숨김 트레이드오프로 되돌려져 현재도 그대로 남아 있음(직접 재현 확인).
2. **모바일 STEP4 CTA 줄바꿈**: 위 "반응형" 절 참고. 직접 재현·측정으로 확인(주 버튼 폭 74.75px vs 컨테이너 354px).
3. **리터럴 엔티티 노출**: `/technology`, `/how-it-works`의 문자열 배열(JSX 텍스트 노드가 아님) 안에 적힌 `&ldquo;`/`&rdquo;`가 디코드되지 않고 화면에 그대로 노출됨 — 이번 감사에서 `/technology` 페이지 텍스트를 `page.evaluate(() => document.body.innerText)`로 직접 추출해 `&ldquo;새 분석 시작하기&rdquo;` 문자열이 실제로 존재함을 재확인(라이트/다크 동일).

---

### 미해결 문제

- **[권고]** 콘텐츠 밀도 과잉 — `/how-it-works` 12단계 전체 나열, `/demo` STEP2 카드의 부가 설명 상시 노출. design-loop-11·12에서 완화를 시도했으나 "핵심 액션 제안(이번 주 작은 실험 등)을 기본 숨김 처리하는 트레이드오프"와 "부분 적용(홈·모바일에는 미적용)"이라는 이유로 두 번 다 되돌려짐 — 사람의 우선순위 판단이 필요한 사안으로 재확인.
- **[권고]** 390px `/demo?sample=1` STEP4 최종 CTA 버튼("체험 처음부터 시작하기 ↻")이 좁은 flex 잔여폭에 끼여 5줄로 쪼개지는 결함 — 자동 오버플로 검사로는 잡히지 않는 유형이며, 이번 감사에서 픽셀 실측(74.75px vs 354px)으로 재확인. 수정 코드 자체(`flex: 1 1 100%`)는 design-loop-11/12 양쪽에서 이미 검증됐으나 콘텐츠 재구조화와 한 커밋으로 묶여 함께 되돌려졌다 — 단독 재적용을 권장.
- **[권고]** `&ldquo;/&rdquo;` 리터럴 엔티티가 `/technology`·`/how-it-works` 화면에 디코드되지 않은 채 노출 — 위와 동일하게 수정 코드는 검증됐으나 되돌림 커밋에 함께 묶여 재발. 두 파일 각 1줄 교체로 해결 가능한 명확한 버그.
- **[권고]** 1440px 데스크톱 콘텐츠 폭 980px cap(좌우 여백 약 230px) — `REFERENCE_STYLE_ANALYSIS.md`가 "권장"(필수 아님)으로 분류. 3개 루프(10·11·12) 연속 미해결이나 배포를 막을 결함은 아님.
- **[사소]** Lighthouse Best Practices 96/100 — `manifest.webmanifest` 절대경로 하드코딩으로 인한 로컬 콘솔 CORS 오류. design-loop 이전부터 존재, 이번 변경과 무관, 실제 운영 도메인에서는 재현 안 될 가능성 높음.
- **[사소]** Lighthouse Performance 84~90점 — "우수"(90+) 경계. 시각 디자인 루프의 대상이 아니었으며 배포 차단 사유 아님.
- **[사소]** `npm run lint` 기존 4건(신규 0건, 이번 감사에서 재확인) — `info-shell.tsx`·`page.tsx`의 `<a>` 대신 `next/link` 미사용 2건, `guide/page.tsx`의 미이스케이프 따옴표 2건. 여러 루프에 걸쳐 "기존 이슈, 신규 아님"으로 반복 확인된 항목이며 기능에 영향 없음.

### 결론
**배포 가능** (프로덕션 배포·main 병합은 사람의 승인이 필요 — 이 스킬은 판단만 하며 실행하지 않는다).

근거: 배포 차단 사유(기능 회귀·5xx/네트워크 실패·serious/critical 접근성 위반·브라우저별 핵심 플로우 실패) **0건**. `npm test` 37/37, `npx playwright test` 114/114(3브라우저 전체), axe-core serious/critical 위반 0건(트래킹 스위트 24케이스 + 추가 점검 9케이스 = 33케이스 전부), Lighthouse Accessibility 100/100(양쪽 페이지), 콘솔 오류·네트워크 실패 0건, 키보드만으로 주요 내비게이션·테마 토글·데모 진입 전부 조작 가능. 남은 문제(콘텐츠 밀도·모바일 STEP4 버튼 줄바꿈·리터럴 엔티티 노출·980px 콘텐츠 폭)는 전부 권고/사소 수준이며 사용자 경험을 해치지만 기능을 막지는 않는다. 다만 세 가지 권고 항목(콘텐츠 밀도·모바일 CTA 줄바꿈·리터럴 엔티티)은 이미 두 차례(design-loop-11, 12) 수정 코드가 작성·검증됐다가 다른 변경과 함께 되돌려진 이력이 있으므로, 다음 작업에서는 **리터럴 엔티티 수정과 모바일 CTA flex-basis 수정만 별도로 분리해 재적용**하는 것을 우선 권장한다(콘텐츠 밀도 완화는 정보 노출 트레이드오프가 있어 사람의 판단이 필요).
