// 정보 유형 아이콘 세트 — 장식이 아니라 의미 구분용(design-loop-02).
// 하나의 아이콘 라이브러리가 설치돼 있지 않아 직접 제작한 최소 SVG로 통일했다.
// 공통 토큰: viewBox 24x24 · stroke currentColor · strokeWidth 1.75 · round cap/join · fill 없음.
// 텍스트와 항상 함께 쓰며(아이콘 단독 버튼 없음) 모두 aria-hidden — 의미는 옆의 라벨 텍스트가 전달한다.

const base = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// 확인된 행동 — 이미 확인된 사실
export function IconCheck() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.5" />
    </svg>
  );
}

// 역량 후보 — 발견·가능성
export function IconSpark() {
  return (
    <svg {...base}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5L9 15M15 9l2.5-2.5" />
    </svg>
  );
}

// 더 확인할 것 — 질문·탐색
export function IconQuestion() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2 1-1.2 2" />
      <path d="M12 16.6h.01" />
    </svg>
  );
}

// 과장하지 않기 — 주의·검증
export function IconWarning() {
  return (
    <svg {...base}>
      <path d="M12 3.3 21.5 20H2.5Z" />
      <path d="M12 9.6v4.4M12 17.2h.01" />
    </svg>
  );
}

// 직업 가설 — 방향
export function IconCompass() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11z" />
    </svg>
  );
}

// 이번 주 작은 실험 — 실행·체크리스트
export function IconChecklist() {
  return (
    <svg {...base}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2.6h6v2.8H9z" fill="currentColor" stroke="none" />
      <path d="M7.6 11l1.6 1.6L12 9.2M7.6 16l1.6 1.6L12 14.2" />
    </svg>
  );
}

// 무저장 원칙 · API 키 보호 — 잠금
export function IconLock() {
  return (
    <svg {...base}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// 개인정보 가리기 — 가림
export function IconEyeOff() {
  return (
    <svg {...base}>
      <path d="M3 12s3.6-6.5 9-6.5 9 6.5 9 6.5-3.6 6.5-9 6.5S3 12 3 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

// 원문 인용 검증 — 인용
export function IconQuote() {
  return (
    <svg {...base}>
      <path d="M7 8.5H5.2A1.2 1.2 0 0 0 4 9.7v2.6a1.2 1.2 0 0 0 1.2 1.2H7v1.4c0 1.3-.8 2.2-2 2.6" />
      <path d="M15.6 8.5h-1.8a1.2 1.2 0 0 0-1.2 1.2v2.6a1.2 1.2 0 0 0 1.2 1.2h1.8v1.4c0 1.3-.8 2.2-2 2.6" />
    </svg>
  );
}

// 모델 허용 목록 — 목록
export function IconList() {
  return (
    <svg {...base}>
      <path d="M9 6.5h10M9 12h10M9 17.5h10" />
      <path d="M5 6.5h.01M5 12h.01M5 17.5h.01" strokeWidth={2.6} />
    </svg>
  );
}

// 준비 중 상태 — 시간
export function IconClock() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
