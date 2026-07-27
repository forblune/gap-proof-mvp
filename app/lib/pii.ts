// 입력 개인정보 최소화 (#7): Solar로 전송하기 전에 뚜렷한 PII 패턴을 가린다.
// 마스킹된 텍스트가 이후 분석·인용 검증의 기준 텍스트가 되므로
// `experience.includes(quote)` 원문 일치 검증과 충돌하지 않는다.
// 패턴은 오탐(일반 숫자·연도)을 피하도록 보수적으로 유지한다.

const PATTERNS: Array<{ kind: string; regex: RegExp; replacement: string }> = [
  { kind: "이메일", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: "[이메일]" },
  { kind: "주민등록번호", regex: /\b\d{6}[-\s]?[1-4]\d{6}\b/g, replacement: "[주민등록번호]" },
  { kind: "전화번호", regex: /\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, replacement: "[전화번호]" },
];

export function maskPII(text: string): { text: string; maskedKinds: string[] } {
  let masked = text;
  const kinds: string[] = [];
  for (const { kind, regex, replacement } of PATTERNS) {
    if (regex.test(masked)) {
      kinds.push(kind);
      masked = masked.replace(regex, replacement);
    }
    regex.lastIndex = 0;
  }
  return { text: masked, maskedKinds: kinds };
}

export function maskedNoticeSuffix(maskedKinds: string[]): string {
  return maskedKinds.length
    ? ` ${maskedKinds.join("·")}(으)로 보이는 정보는 가리고 분석했습니다.`
    : "";
}
