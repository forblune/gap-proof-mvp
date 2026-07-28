// 테스트가 실제 데이터를 만들어야 할 때 쓰는 격리 헬퍼.
//
// 현재 이 저장소의 E2E는 DB 행·인증 세션·Storage 객체를 하나도 만들지 않는다
// (피드백 테스트는 비로그인 요청이라 서버가 저장 전에 막는다). 그래서 지금은 충돌할 공유
// 데이터가 없다. 다만 앞으로 로그인 사용자 시나리오를 추가하면 즉시 필요해지므로,
// 규칙을 먼저 만들어 둔다.
//
// 규칙:
//  1. 모든 테스트 데이터 이름에 RUN_ID를 넣는다 — 같은 시각에 두 실행이 겹쳐도 서로를 건드리지 않는다.
//  2. 정리는 자기가 만든 것만 지운다. 접두사가 다른 행·파일은 절대 건드리지 않는다.
//  3. "테이블 전체 비우기" 류의 정리는 금지한다 — 다른 실행의 데이터를 지운다.

// 한 번의 테스트 실행 전체에서 공유되는 식별자.
// 환경변수로 넘기면 CI가 실행마다 다른 값을 줄 수 있고, 없으면 프로세스마다 새로 만든다.
export const RUN_ID =
  process.env.GAPPROOF_TEST_RUN_ID ?? `run${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** 이 실행에서만 쓰는 이메일. 다른 실행과 절대 겹치지 않는다. */
export function testEmail(label: string): string {
  return `gp-${RUN_ID}-${label}@example.invalid`;
}

/** 이 실행이 만든 것인지 판별한다. 정리할 때 반드시 이 검사를 통과한 것만 지운다. */
export function isOwnedByThisRun(value: string): boolean {
  return value.includes(RUN_ID);
}

/** Storage 경로 접두사. 정리는 이 경로 아래만 대상으로 한다. */
export function testStoragePrefix(userId: string): string {
  return `${userId}/${RUN_ID}`;
}
