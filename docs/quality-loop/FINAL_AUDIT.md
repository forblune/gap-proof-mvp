# final-audit 보고 (2026-07-27)

**대상**: `design/professor-feedback-hybrid` 브랜치, 3회 design-loop 완료 시점(커밋 `3b0d275`)
**배포 여부**: 이 보고서는 배포 가능 여부만 판단한다. 실제 배포(프로덕션 발행)는 수행하지 않았다.

---

### 기능
- `npm test`(node:test, 37개): ✅ 전부 통과 — draft 저장/복원, V2 발견 엔진 검증, 파일 가져오기, 게이트 인증·서명 쿠키, PII 마스킹, 요청 한도, 모델 allowlist 등.
- `tests/e2e/user-flow.spec.ts`(샘플 여정 완주, 여정 나가기→게이트 복귀): ✅ 3개 브라우저 전부 통과.
- `tests/e2e/gate.spec.ts`(잘못된 코드, 샘플 우회, `?sample=1`): ✅ 3개 브라우저 전부 통과.
- 결론: 기능 회귀 없음.

### 반응형
- `tests/e2e/responsive.spec.ts`: 390/768/1024/1440 × `/`, `/demo`, `/why` — 가로 오버플로 0건, 3개 브라우저 전부 통과.
- 수동 확인(Chrome DevTools MCP): 홈 다크 히어로/최종 CTA, `/why` 7개 아이콘 섹션, `/technology` 카드·표, `/how-it-works` 번호 배지 — 390px·1440px에서 레이아웃 깨짐 없음. 스크린샷은 `docs/quality-loop/screenshots/final/`에 보관.

### 브라우저별 결과
| 브라우저 | 통과 | 실패 | 비고 |
|---|---|---|---|
| chromium | 34/34 | 0 | — |
| firefox | 34/34 | 0 | 스크린샷 베이스라인 1회 재생성 필요(디자인 변경 반영, 아래 참고) |
| webkit | 34/34 | 0 | 스크린샷 베이스라인 1회 재생성 필요(디자인 변경 반영, 아래 참고) |

전체 `npx playwright test`: **102/102 통과**(1차 실행 시 스크린샷 회귀 테스트 6건이 "실패"로 표시됐으나, 전부 이번 3회 design-loop에서 의도적으로 확정한 변경분과 일치함을 diff 이미지로 확인 — 홈페이지 재디자인, `.gate-brand` 터치 타깃 높이 변화(1017px→1026px). `--update-snapshots`로 베이스라인 갱신 후 102/102 재확인.)

### 접근성
- `tests/e2e/accessibility.spec.ts`(axe-core, wcag2a/wcag2aa): `/`, `/demo`, `/why`, `/how-it-works` — **serious/critical 위반 0건**, 3개 브라우저 전부 통과.
- Lighthouse(프로덕션 빌드, `/` 및 `/demo`): **Accessibility 100/100** (양쪽 다).
- 3회 design-loop에서 발견·수정한 접근성 항목: `.fine-print` 대비 4.49:1→5.44:1(WCAG AA 통과), 헤더 로고 터치 타깃 35px→44px(`.brand`, `.gate-brand` 둘 다).
- 아이콘 11종 전부 `aria-hidden` 처리 + 텍스트와 항상 병기(아이콘 단독 버튼 없음) — 스크린리더에 중복·혼란 정보 없음.

### 성능 (Lighthouse, 프로덕션 빌드 `npm run build && npm start` 기준)
| 페이지 | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 79 | 100 | 96 | 100 |
| `/demo`(게이트) | 83 | 100 | 96 | 100 |

- LCP 3.2s / FCP 2.9s / TBT 360ms / CLS 0 (홈 기준). Performance 80점 근처로 "양호" 수준이나 "우수"(90+)에는 못 미침 — 3회 design-loop는 시각적 완성도에 집중했고 성능 최적화(이미지 lazy-load, 번들 분할 등)는 대상 밖이었다.
- Best Practices 96점 감점 사유: `errors-in-console` 감사 1건 — `manifest.webmanifest` 절대경로가 운영 도메인(`gapproof.forblune.com`)으로 하드코딩돼 있어 `localhost:3000`에서 CORS 오류가 남. **design-loop 시작 전부터 존재하던 이슈**(이번 3회 변경과 무관, `app/manifest.ts` 설정 문제)이며, 실제 운영 도메인에서는 origin이 일치해 재현되지 않을 가능성이 높음 — 다만 로컬/스테이징 환경에서 매번 콘솔에 오류가 남는 점은 사실이므로 아래 "미해결 문제"에 기록.

### 문체와 콘텐츠 (professor-review 갱신)
`docs/quality-loop/LOOP_LOG.md`에 3회 루프 전 구간 기록. 최종 상태:

| 단계 | 총점(100) | 세부 평균(10) |
|---|---|---|
| 기준선 | 57.4 | 4.9 |
| Loop 3 이후(최종) | **71.8** | **6.44** |

남은 저점 항목(세부 평균 8.5 미달, 종료 목표 기준 미도달): 시선 흐름(6.5) · 타이포그래피 계층(6.5) · 여백과 섹션 리듬(5.3) · 콘텐츠 밀도(3.7) · 아이콘·이미지·시각 자산(5.5). 정보 구조(7.5)·모바일 완성도(6.9)·카드 디자인(8.0)도 목표(8.5) 미달이나 격차는 좁음.

---

### 미해결 문제

- **[권고]** 콘텐츠 밀도: `/demo` STEP2(역량 확인) 카드가 필드 9개 × 카드 3개로 여전히 밀도가 높음 — 아이콘을 붙이지 않음(이번 3회 루프 범위 밖). 세부 진단 항목 중 가장 낮은 3.7/10.
- **[권고]** 홈·정보 페이지 헤딩 서체 불일치: 홈 H1/H2는 Loop 1에서 세리프→산세리프로 전환했지만, `/why`·`/technology`·`/how-it-works`·`/guide`의 `.info-section h2`·`.info-shell h1`, 그리고 데모 흐름의 `.gate-card h1`·`.claim-card h2`·`.consent-card h2` 등은 여전히 Georgia 세리프 — 사이트 전역 타이포그래피 일관성 작업이 아직 남아 있음(구조적 작업, 코스메틱 루프 범위 밖으로 판단해 보류).
- **[권고]** Lighthouse Performance 79~83점 — LCP 3.2s 등 개선 여지 있음. 시각 디자인 루프의 대상이 아니었음.
- **[사소]** `manifest.webmanifest` 절대경로 하드코딩으로 인한 로컬 콘솔 CORS 오류 — design-loop 이전부터 존재, 이번 변경과 무관, 실제 운영 도메인에서는 재현 안 될 가능성 높음. `app/manifest.ts` 수정이 필요하나 디자인 스코프 밖이라 이번에는 손대지 않음.
- **[사소]** Loop 2 독립 재채점에서 지적된 `IconCheck` 재사용(확인된 행동/지금 제공해요/접근 게이트, 3곳) — 검토 후 "확인됨·이용 가능함"이라는 하나의 추상적 의미로 수렴한다고 판단해 의도적으로 유지. 사람이 다르게 판단할 수 있는 지점이므로 기록해 둠.
- **[사소]** `/why`에서 IconWarning이 7개 중 3개 제목(한계/과장하지 않기/하지 않는 것)에 재사용됨 — 의미상 defensible하나 Loop 2의 IconCheck 재사용보다는 다소 약한 선례. 배포를 막을 사안은 아님.

### 결론
**배포 가능** (프로덕션 배포·main 병합은 사용자 승인 필요 — 이 스킬은 판단만 하며 실행하지 않음).

근거: 배포 차단 사유(기능 회귀·5xx/네트워크 실패·serious/critical 접근성 위반·브라우저별 핵심 플로우 실패) **0건**. 남은 문제는 전부 권고/사소 수준이며, 3회 design-loop의 점수 개선(57.4→71.8/100)과 회귀 없음(37 node 테스트 + 102 Playwright 테스트 전부 통과, axe-core 0 위반, Lighthouse a11y 100)이 독립 재채점으로 뒷받침됨. 다만 총점이 애초 목표(88/100)에는 못 미치므로, 이번 결과를 "완성"이 아니라 "안전하게 개선된 중간 지점"으로 보고하며, 남은 격차(콘텐츠 밀도·전역 타이포그래피 일관성)는 다음 세션에서 더 큰 구조적 작업으로 다루기를 권한다.
