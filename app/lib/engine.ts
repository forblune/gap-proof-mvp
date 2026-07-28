// GapProof 역량·격차 엔진 (React 비의존 순수 로직)
// PBL 4·5단계의 규칙을 코드로 옮긴 것:
//  - 확인된(=사용자가 맞다고 한) 역량만 현재 역량으로 인정
//  - 증거등급은 실제 증거를 넘지 못함 (텍스트만=Lv.0 자기기록, 링크 연결=Lv.1)
//  - 격차점수 = 목표 중요도 × (필요수준 - 현재수준)
//  - 격차가 큰 순서로 학습 1 · 미니프로젝트 1 · 상담 1을 제시

export type ActionTemplate = { title: string; time: string; rule: string };

export type Competency = {
  id: string;
  label: string;
  required: number; // 필요 수준 (1~3)
  importance: number; // 중요도 (1~3)
  proof: string; // 이 역량을 증명하는 근거 형태
  keywords: string[]; // 확인 역량 텍스트에서 이 역량으로 매핑하는 단서
  learn: ActionTemplate;
  project: ActionTemplate;
};

export type Role = {
  id: string;
  label: string;
  blurb: string;
  competencies: Competency[];
};

// 격차 계산에 필요한 최소 입력 (page.tsx의 Claim에서 이 모양으로 넘긴다)
export type EvidenceInput = { skill: string; quote: string; tier: number };

export type GapItem = {
  id: string;
  label: string;
  required: number;
  current: number;
  importance: number;
  score: number; // 중요도 가중 격차점수
  percent: number; // 남은 격차 비율(0~100), 막대 표시용
  proof: string;
};

export type ActionRec = {
  id: "learn" | "course" | "project";
  type: string;
  title: string;
  time: string;
  rule: string;
};

// 텍스트만 입력된 근거는 Lv.0(자기기록), 링크가 붙으면 Lv.1(근거 연결).
// 수행 확인(Lv.2)·기관 확인(Lv.3)은 MVP 범위 밖이므로 임의로 올리지 않는다.
export function tierFromLink(link: string | undefined | null): number {
  return typeof link === "string" && link.trim().length > 0 ? 1 : 0;
}

// 학습확인(퀴즈)을 통과한 역량 id 집합. 퀴즈는 이해도 점검일 뿐, 그 자체로는
// 증거가 아니다 — 이 역량에 실제 경험과 연결된 사용자 확인 증거가 이미 있을 때만
// 수행 확인(강도 3)의 하한으로 반영한다(아래 competencyStrength 참고).
export type PassedChecks = Record<string, boolean>;

// 확인된 증거(원문) 중 이 역량(keywords)과 매칭되는 것이 있는지 — 학습확인(퀴즈) 통과가
// 수행 확인(Lv.2)으로 이어지기 위한 전제 조건. competencyStrength와 화면 표시(page.tsx의
// STEP4·STEP5 "수행 확인" 배지) 양쪽에서 같은 판정 기준을 쓰기 위해 별도로 내보낸다.
export function hasConfirmedEvidenceFor(comp: Competency, confirmed: EvidenceInput[]): boolean {
  return confirmed.some((claim) => {
    const text = `${claim.skill} ${claim.quote}`;
    return comp.keywords.some((keyword) => text.includes(keyword));
  });
}

// 확인 역량들이 특정 역량(competency)을 얼마나 뒷받침하는지 = 증거 강도.
// 매칭되는 확인 역량이 없으면 0, 있으면 (증거등급+1) 중 최댓값을 필요수준으로 상한.
// 학습확인(퀴즈) 통과는 이 역량에 매칭되는 확인 증거가 최소 1개 있을 때만
// 수행 확인(강도 3)을 하한으로 반영한다 — 퀴즈 단독으로는 증거를 만들지 않는다.
export function competencyStrength(
  comp: Competency,
  confirmed: EvidenceInput[],
  passed: PassedChecks = {},
): number {
  let best = 0;
  let hasMatchingConfirmedEvidence = false;
  for (const claim of confirmed) {
    const text = `${claim.skill} ${claim.quote}`;
    if (comp.keywords.some((keyword) => text.includes(keyword))) {
      best = Math.max(best, claim.tier + 1);
      hasMatchingConfirmedEvidence = true;
    }
  }
  // 수행 확인(Lv.2): 퀴즈 통과 + 이 역량에 연결된 사용자 확인 증거가 최소 1개.
  if (passed[comp.id] && hasMatchingConfirmedEvidence) best = Math.max(best, 3);
  return Math.min(comp.required, best);
}

// 목표직무 역량표와 확인 역량을 비교해 격차 지도를 만든다 (격차 큰 순).
export function computeGapMap(
  confirmed: EvidenceInput[],
  role: Role,
  passed: PassedChecks = {},
): GapItem[] {
  return role.competencies
    .map((comp) => {
      const current = competencyStrength(comp, confirmed, passed);
      const score = Math.max(0, comp.importance * (comp.required - current));
      const percent = Math.round(((comp.required - current) / comp.required) * 100);
      return {
        id: comp.id,
        label: comp.label,
        required: comp.required,
        current,
        importance: comp.importance,
        score,
        percent,
        proof: comp.proof,
      };
    })
    .filter((gap) => gap.score > 0)
    .sort((a, b) => b.score - a.score);
}

// 확인 역량이 커버하는(격차 0) 강점 역량 라벨 목록.
export function coveredStrengths(confirmed: EvidenceInput[], role: Role): string[] {
  return role.competencies
    .filter((comp) => competencyStrength(comp, confirmed) >= comp.required)
    .map((comp) => comp.label);
}

// 상위 격차에서 이번 주 행동 3개(학습·미니프로젝트·상담)를 고른다.
export function recommendNextActions(gaps: GapItem[], role: Role): ActionRec[] {
  const byId = (id: string) => role.competencies.find((comp) => comp.id === id);
  const learnComp = (gaps[0] && byId(gaps[0].id)) || role.competencies[0];
  const projectComp = (gaps[1] && byId(gaps[1].id)) || (gaps[0] && byId(gaps[0].id)) || role.competencies[0];
  const topLabel = gaps[0]?.label ?? role.label;

  return [
    { id: "learn", type: "학습", ...learnComp.learn },
    {
      id: "course",
      type: "강의 연계",
      title: `‘${topLabel}’ 강의 연계 (K-MOOC·직업훈련)`,
      time: "주 2~3시간",
      rule: "추천 온라인 강의 1개를 골라 첫 주차 수강",
    },
    { id: "project", type: "미니프로젝트", ...projectComp.project },
  ];
}

export const ROLES: Role[] = [
  {
    id: "ai_service_planner",
    label: "AI 서비스 기획자",
    blurb: "항공물류의 도메인 경험과 AI 독학을 서비스 문제 해결로 연결하는 전환 경로",
    competencies: [
      {
        id: "problem_framing",
        label: "문제 정의·도메인 연결",
        required: 3,
        importance: 3,
        proof: "문제 정의 문서·도메인 사례",
        keywords: ["문제", "전공", "도메인", "물류", "기획", "정의", "연결", "분야"],
        learn: { title: "사용자 문제정의 프레임 익히기", time: "40분", rule: "실제 문제 1개를 5문장으로 정의" },
        project: { title: "내 경험으로 문제정의 1장 쓰기", time: "90분", rule: "대상·문제·근거·가설 포함" },
      },
      {
        id: "prototyping",
        label: "AI·API 프로토타이핑",
        required: 3,
        importance: 3,
        proof: "작동 링크·저장소",
        keywords: ["API", "프로토타입", "만들", "개발", "웹", "앱", "Solar", "MVP", "아두이노", "코드"],
        learn: { title: "Solar API 호출 흐름 정리", time: "40분", rule: "요청·응답 예시 1개 작성" },
        project: { title: "작동하는 최소 화면 1개 배포", time: "3시간", rule: "입력→출력이 도는 링크 제출" },
      },
      {
        id: "user_validation",
        label: "사용자 검증",
        required: 3,
        importance: 3,
        proof: "인터뷰·테스트 기록",
        keywords: ["사용자", "인터뷰", "테스트", "검증", "피드백", "설문"],
        learn: { title: "사용자 인터뷰 질문 설계", time: "40분", rule: "질문 5개를 내 주제로 작성" },
        project: { title: "5명 인터뷰 후 인사이트 정리", time: "2시간", rule: "인터뷰 5건·수정 3개 기록" },
      },
      {
        id: "data_metrics",
        label: "데이터·성과지표",
        required: 2,
        importance: 2,
        proof: "지표 정의·이벤트 설계",
        keywords: ["데이터", "지표", "KPI", "분석", "측정", "성과"],
        learn: { title: "핵심지표(KPI) 3개 정의", time: "30분", rule: "서비스 목표를 지표로 환산" },
        project: { title: "이벤트 로그 표 설계", time: "90분", rule: "측정 항목·정의·주기 표 작성" },
      },
      {
        id: "privacy_safety",
        label: "개인정보·AI 안전",
        required: 2,
        importance: 2,
        proof: "동의·삭제·감사 설계",
        keywords: ["개인정보", "동의", "삭제", "보안", "안전", "윤리", "감사"],
        learn: { title: "개인정보 최소수집 원칙 정리", time: "30분", rule: "수집 항목·목적 표 작성" },
        project: { title: "동의·삭제 흐름 화면 설계", time: "90분", rule: "동의문·삭제 시나리오 1개" },
      },
    ],
  },
  {
    id: "data_analyst",
    label: "데이터 분석가",
    blurb: "흩어진 학습·업무 경험을 데이터로 묻고 답하는 직무로 연결하는 경로",
    competencies: [
      {
        id: "data_wrangling",
        label: "데이터 수집·정제",
        required: 3,
        importance: 3,
        proof: "정제 전후 데이터·코드",
        keywords: ["데이터", "엑셀", "SQL", "수집", "정제", "크롤", "전처리"],
        learn: { title: "엑셀·SQL 기초 정제 익히기", time: "40분", rule: "표 1개를 정제 규칙 3개로 정리" },
        project: { title: "공개 데이터 1개 정제 노트", time: "2시간", rule: "전처리 단계·결과 표 기록" },
      },
      {
        id: "statistics",
        label: "통계·분석",
        required: 3,
        importance: 2,
        proof: "분석 결과·해석",
        keywords: ["통계", "분석", "회귀", "평균", "비교", "측정", "지표"],
        learn: { title: "기술통계·비교 개념 정리", time: "40분", rule: "평균·분포·비교 예시 작성" },
        project: { title: "질문→분석→결론 1건", time: "2시간", rule: "가설·표·결론 1장 정리" },
      },
      {
        id: "visualization",
        label: "시각화·리포팅",
        required: 2,
        importance: 2,
        proof: "차트·리포트",
        keywords: ["시각화", "차트", "그래프", "리포트", "대시보드"],
        learn: { title: "목적별 차트 선택 익히기", time: "30분", rule: "지표 3개에 맞는 차트 고르기" },
        project: { title: "미니 대시보드 1장", time: "90분", rule: "핵심지표 3개 차트로 정리" },
      },
      {
        id: "programming",
        label: "파이썬·도구",
        required: 2,
        importance: 3,
        proof: "실행 코드·노트북",
        keywords: ["파이썬", "python", "코드", "프로그래밍", "판다스", "자동화"],
        learn: { title: "파이썬 데이터 기초", time: "40분", rule: "불러오기·집계 코드 실행" },
        project: { title: "데이터 요약 스크립트", time: "2시간", rule: "입력→요약표 나오는 코드 제출" },
      },
      {
        id: "domain_framing",
        label: "문제 정의·도메인",
        required: 2,
        importance: 2,
        proof: "질문 정의 문서",
        keywords: ["문제", "전공", "도메인", "물류", "기획", "질문", "정의"],
        learn: { title: "분석 질문 좁히기", time: "30분", rule: "막연한 질문을 측정가능하게 1개" },
        project: { title: "도메인 질문 3개 정의", time: "60분", rule: "답 가능한 질문·필요 데이터 표" },
      },
    ],
  },
  {
    id: "smart_logistics",
    label: "스마트물류 서비스 기획",
    blurb: "항공물류 도메인에 디지털·데이터·자동화를 결합하는 융합 직무 경로",
    competencies: [
      {
        id: "logistics_domain",
        label: "물류 도메인 이해",
        required: 3,
        importance: 3,
        proof: "현장 사례·전공 근거",
        keywords: ["물류", "항공", "운송", "창고", "재고", "공급망", "배송"],
        learn: { title: "물류 프로세스 흐름 정리", time: "40분", rule: "입고→출고 단계 지도 그리기" },
        project: { title: "한 흐름의 병목 1개 분석", time: "2시간", rule: "병목·원인·개선안 1장" },
      },
      {
        id: "digital_tools",
        label: "디지털·자동화 도구",
        required: 3,
        importance: 3,
        proof: "작동 데모·회로/코드",
        keywords: ["웹", "앱", "API", "자동화", "아두이노", "센서", "IoT", "라즈베리", "코드"],
        learn: { title: "센서·API 연동 개념 정리", time: "40분", rule: "데이터 흐름 1개 도식화" },
        project: { title: "간단한 자동화 데모 1개", time: "3시간", rule: "입력→동작 링크·영상 제출" },
      },
      {
        id: "logi_data_metrics",
        label: "데이터·운영지표",
        required: 2,
        importance: 3,
        proof: "지표·수요예측 근거",
        keywords: ["데이터", "지표", "분석", "수요", "예측", "측정"],
        learn: { title: "운영지표 정의 익히기", time: "30분", rule: "리드타임 등 지표 3개 정의" },
        project: { title: "운영 데이터 요약 1장", time: "90분", rule: "지표 3개 표·해석" },
      },
      {
        id: "field_validation",
        label: "현장 검증",
        required: 2,
        importance: 2,
        proof: "현장·사용자 확인",
        keywords: ["사용자", "현장", "인터뷰", "테스트", "검증", "담당자"],
        learn: { title: "현장 인터뷰 질문 설계", time: "30분", rule: "현장 질문 5개 작성" },
        project: { title: "현장 담당자 2명 인터뷰", time: "2시간", rule: "니즈·제약 각 3개 기록" },
      },
      {
        id: "service_planning",
        label: "서비스 기획",
        required: 2,
        importance: 2,
        proof: "기획 1장",
        keywords: ["기획", "서비스", "문제", "정의", "아이디어"],
        learn: { title: "서비스 한 장 기획 익히기", time: "30분", rule: "문제·대상·해결 3문장" },
        project: { title: "스마트물류 서비스 1장", time: "90분", rule: "문제·기능·기대효과 정리" },
      },
    ],
  },
];

export function findRole(roleId: string): Role {
  return ROLES.find((role) => role.id === roleId) ?? ROLES[0];
}

// 각 역량의 "가장 먼저 잡아야 할 핵심" 한 줄 (학습확인 퀴즈 정답 생성용)
export const CONCEPTS: Record<string, string> = {
  problem_framing: "사용자·문제·근거를 한 문장으로 좁히기",
  prototyping: "입력→출력이 도는 최소 화면부터 만들기",
  user_validation: "추측 대신 실제 사용자에게 직접 묻기",
  data_metrics: "성공을 숫자 지표로 먼저 정의하기",
  privacy_safety: "필요한 정보만 최소 수집하고 삭제 가능하게",
  data_wrangling: "분석 전에 데이터 정제 규칙부터 세우기",
  statistics: "평균·분포·비교로 먼저 살펴보기",
  visualization: "목적에 맞는 차트를 고르기",
  programming: "불러오기→집계를 코드로 반복 자동화",
  domain_framing: "답할 수 있는 질문으로 좁히기",
  logistics_domain: "입고→출고 흐름과 병목 찾기",
  digital_tools: "센서·API로 데이터 흐름을 잇기",
  logi_data_metrics: "리드타임 등 운영지표 정의하기",
  field_validation: "현장 담당자에게 직접 확인하기",
  service_planning: "문제·대상·해결을 한 장으로 정리",
};

export type CheckQuestion = { q: string; options: string[]; answer: number };
export type Check = { compId: string; questions: CheckQuestion[] };

// 특정 역량의 이해도를 확인하는 2문항 MCQ 생성 (정답 위치는 결정적).
export function makeCheck(comp: Competency, role: Role): Check {
  const others = role.competencies.filter((c) => c.id !== comp.id);
  const pos = role.competencies.findIndex((c) => c.id === comp.id) % 3;
  const place = (correct: string, d0: string, d1: string) => {
    const arr = [d0, d1];
    arr.splice(pos, 0, correct);
    return arr;
  };
  return {
    compId: comp.id,
    questions: [
      {
        q: `‘${comp.label}’ 학습에서 가장 먼저 잡아야 할 것은?`,
        options: place(CONCEPTS[comp.id] ?? comp.label, CONCEPTS[others[0].id] ?? others[0].label, CONCEPTS[others[1].id] ?? others[1].label),
        answer: pos,
      },
      {
        q: `‘${comp.label}’의 강한 증거로 가장 적절한 것은?`,
        options: place(comp.proof, others[0].proof, others[1].proof),
        answer: pos,
      },
    ],
  };
}
