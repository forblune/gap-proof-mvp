# 테스트 실행 규칙

전체 E2E를 여러 곳에서 동시에 돌려 결과가 오염된 적이 있다. 원인과 규칙을 남긴다.

## 무슨 일이 있었나

동일한 `npx playwright test` 두 개가 겹쳐 돌았다. `playwright.config.ts`의 webServer는
`url: http://localhost:3000` + `reuseExistingServer: true`이므로, 두 실행이 **같은 dev 서버 하나를**
공유했다. 한쪽이 끝나며 서버를 정리하는 동안 다른 쪽이 계속 요청을 보내 webkit 테스트가 무더기로 실패했다.

이건 애플리케이션 결함이 아니라 **실행 방식의 결함**이다. 프로세스를 모두 정리하고 단독으로 한 번
돌렸을 때 288/288이 통과했다.

## 규칙

### 1. 전체 E2E 실행자는 한 번에 하나

- 전체 스위트(`npx playwright test`)는 **한 주체만** 실행한다.
- 독립 리뷰 에이전트는 코드·결과를 검토하되 **전체 테스트 명령을 동시에 실행하지 않는다.**
  결과가 필요하면 이미 나온 실행 결과를 읽는다.
- 특정 스펙만 확인할 때도, 전체 실행이 돌고 있으면 끝날 때까지 기다린다.

### 2. 실행 전 확인

```bash
pgrep -f "playwright test" | wc -l   # 0 이어야 한다
pgrep -f "vinext dev"     | wc -l    # 0 이어야 한다
lsof -ti:3000             | wc -l    # 0 이어야 한다
```

0이 아니면 정리한 뒤 시작한다.

```bash
pkill -f "playwright test"; pkill -f "vinext dev"
```

### 3. dev 서버는 하나만

`playwright.config.ts`가 포트 3000에 dev 서버를 띄우고 `reuseExistingServer`로 재사용한다.
서버를 수동으로 미리 띄우지 않는다 — Playwright가 직접 관리하게 둔다.
다른 포트가 필요하면 `PLAYWRIGHT_BASE_URL`로 지정하고, 그 서버는 본인이 정리한다.

### 4. 테스트 데이터 격리

현재 E2E는 **DB 행·인증 세션·Storage 객체를 하나도 만들지 않는다**
(피드백 테스트는 비로그인 요청이라 서버가 저장 전에 막는다). 그래서 지금은 충돌할 공유 데이터가 없다.

로그인 사용자 시나리오를 추가할 때는 `tests/e2e/run-id.ts`를 쓴다.

- 모든 테스트 데이터 이름에 `RUN_ID`를 넣는다.
- 정리는 **자기가 만든 것만** 지운다(`isOwnedByThisRun`으로 확인).
- 테이블 전체 비우기 류의 정리는 금지한다 — 다른 실행의 데이터를 지운다.

### 5. 결과를 기다리는 방법

무한 polling 쉘을 남기지 않는다. 종료 조건과 timeout을 함께 준다.

```bash
# 좋음: 조건과 상한이 함께 있다
timeout 900 bash -c 'until grep -qE "[0-9]+ (passed|failed)" out.txt; do sleep 20; done'

# 나쁨: 끝나지 않을 수 있다
while true; do tail out.txt; sleep 5; done
```

### 6. 실행 후 확인

```bash
pgrep -f "playwright test" | wc -l   # 0
pgrep -f "vinext dev"     | wc -l    # 0
```

DB·Storage 잔여물은 Supabase에서 확인한다(현재 E2E는 아무것도 만들지 않으므로 항상 0이어야 한다).

## 중복 실행 결과는 근거로 쓰지 않는다

겹쳐 돈 실행에서 나온 실패는 제품 결함의 근거가 아니다. 반대로 **통과도 근거가 되지 않는다.**
판정은 프로세스를 정리한 뒤의 단독 실행 결과로만 한다.
