import { readServerEnv } from "../../lib/server-env";

// 카카오 JavaScript 키는 공개 성격의 클라이언트 키이지만 저장소에는 기록하지 않고
// 환경변수(KAKAO_JS_KEY)로만 주입한다. 키가 없으면 카카오 공유 버튼은 표시되지 않는다.
export async function GET() {
  const kakaoJsKey = (await readServerEnv("KAKAO_JS_KEY")) ?? null;
  return new Response(JSON.stringify({ kakaoJsKey }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
