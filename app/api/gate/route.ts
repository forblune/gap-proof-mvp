import { createGateCookie, verifyAccessCode, verifyGateSession } from "../../lib/gate-session";

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

// 세션 상태 조회 (쿠키는 HttpOnly라 클라이언트가 직접 읽을 수 없음)
export async function GET(request: Request) {
  return json({ authorized: await verifyGateSession(request) });
}

// 접근 코드 검증 → 서명된 HttpOnly 세션 쿠키 발급
export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = (await request.json()) as { code?: unknown };
  } catch {
    return json({ error: "invalid_json", message: "요청 형식을 확인해 주세요." }, 400);
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return json({ error: "code_required", message: "접근 코드를 입력해 주세요." }, 400);
  }
  if (code.length > 64) {
    return json({ error: "invalid_code", message: "접근 코드가 올바르지 않아요. 다시 확인해 주세요." }, 401);
  }

  const result = await verifyAccessCode(code);
  if (result === "unconfigured") {
    // fail-closed: 게이트 환경변수가 없으면 데모를 열지 않는다
    return json({ error: "gate_not_configured", message: "데모 접근이 아직 준비되지 않았어요. 운영자에게 문의해 주세요." }, 503);
  }
  if (result === "invalid") {
    return json({ error: "invalid_code", message: "접근 코드가 올바르지 않아요. 다시 확인해 주세요." }, 401);
  }

  const cookie = await createGateCookie();
  if (!cookie) {
    return json({ error: "gate_not_configured", message: "데모 접근이 아직 준비되지 않았어요. 운영자에게 문의해 주세요." }, 503);
  }
  return json({ authorized: true }, 200, { "set-cookie": cookie });
}
