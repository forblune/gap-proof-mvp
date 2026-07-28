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
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return SAFE_REDIRECT_FALLBACK;
  }
}
