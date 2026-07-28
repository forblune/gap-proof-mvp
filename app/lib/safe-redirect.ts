// 로그인 후 돌아갈 경로 검증 — 열린 리다이렉트(CWE-601) 방지.
// 의존성이 없는 순수 함수로 둔다(테스트에서 서버 모듈을 끌어오지 않기 위해서다).
//
// 주의: WHATWG URL은 http/https에서 역슬래시를 슬래시와 동일하게 취급한다.
// 그래서 "/\evil.com" 은 https://evil.com/ 으로 해석된다 — 슬래시만 검사하면 뚫린다.
// (1) 역슬래시를 아예 거부하고 (2) 해석 결과의 origin이 우리와 같은지 다시 확인한다.
export const SAFE_REDIRECT_FALLBACK = "/profile";

export function safeNext(raw: string | null | undefined, origin: string): string {
  if (!raw) return SAFE_REDIRECT_FALLBACK;
  if (raw.includes("\\")) return SAFE_REDIRECT_FALLBACK;
  if (!raw.startsWith("/") || raw.startsWith("//")) return SAFE_REDIRECT_FALLBACK;
  try {
    const resolved = new URL(raw, origin);
    if (resolved.origin !== new URL(origin).origin) return SAFE_REDIRECT_FALLBACK;

    const path = resolved.pathname + resolved.search + resolved.hash;

    // 반환값이 한 번 더 해석된다는 점이 함정이다.
    // "/..//evil.com" 은 여기서 origin 검사를 통과하지만 pathname 이 "//evil.com" 이 되고,
    // 호출부가 그 문자열을 다시 new URL(path, origin) 으로 해석하면 프로토콜 상대 URL이 되어
    // https://evil.com 으로 나간다. 그래서 결과 자체가 안전한 형태인지 마지막에 다시 본다.
    if (!path.startsWith("/") || path.startsWith("//")) return SAFE_REDIRECT_FALLBACK;
    if (new URL(path, origin).origin !== new URL(origin).origin) return SAFE_REDIRECT_FALLBACK;

    return path;
  } catch {
    return SAFE_REDIRECT_FALLBACK;
  }
}
