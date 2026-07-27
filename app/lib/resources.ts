// GapProof "먼저 알아보기" (Learn Before Check Phase 1) — 공식 검색 링크만 구성한다.
// React 비의존 순수 함수: 실제 API 호출 없음, 특정 영상·강좌·정책이 존재한다고 주장하지 않는다.
// 검색어는 앱 자체 역량 카탈로그(competencyLabel)만 사용한다 — 사용자 원문(경험 텍스트·claim.quote)은
// 이 모듈에 절대 전달하지 않는다(호출부 app/demo/page.tsx가 role.competencies[].label만 넘긴다).

import type { ActionTemplate } from "./engine";

export type ResourceCard = {
  id: string;
  platform: string;
  title: string;
  href: string;
  ariaLabel: string;
  linkLabel: string;
  reason: string;
  hypothesis: string;
  time: string;
  difficulty: string;
  free: string;
  verify: string;
  // GET 검색 딥링크가 없는 공식 사이트(고용24·온통청년)에서 사용자가 직접 입력할 검색어 안내
  searchHint?: string;
};

export type ProjectCard = {
  title: string;
  time: string;
  rule: string;
  hypothesis: string;
};

function buildYoutubeUrl(keyword: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;
}

// www.kmooc.kr 실제 페이지에서 확인된 검색 경로 패턴(/view/search/<검색어>)을 그대로 사용한다.
function buildKmoocUrl(keyword: string): string {
  return `https://www.kmooc.kr/view/search/${encodeURIComponent(keyword)}`;
}

// 고용24(HRD-Net)·온통청년은 확인 결과 GET 검색 딥링크가 없는 JS/POST 기반 페이지라,
// 공식 진입 페이지로 연결하고 검색어는 화면 문구로 안내한다(링크 자체를 지어내지 않는다).
export const WORK24_TRAINING_URL = "https://hrd.work24.go.kr/";
export const YOUTH_CENTER_SEARCH_URL = "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch";

function hypothesisBadge(hypothesis: string): string {
  return `직업 가설: ${hypothesis}`;
}

export function buildLearnResources(competencyLabel: string, hypothesis: string): ResourceCard[] {
  const hypothesisBadgeText = hypothesisBadge(hypothesis);
  return [
    {
      id: "youtube",
      platform: "YouTube",
      title: `YouTube에서 "${competencyLabel}" 검색해보기`,
      href: buildYoutubeUrl(competencyLabel),
      ariaLabel: `YouTube에서 ${competencyLabel} 검색하기 (새 창에서 열림)`,
      linkLabel: "YouTube에서 검색해보기",
      reason: "이 역량과 관련된 영상을 검색으로 가장 빠르게 둘러볼 수 있습니다.",
      hypothesis: hypothesisBadgeText,
      time: "예상 시간: 검색 결과를 훑어보는 데 보통 10~20분",
      difficulty: "난이도(예상): 입문~중급 영상이 섞여 있음",
      free: "무료 여부(예상): 대부분 무료 · 일부 유료 강의 포함 가능",
      verify: "실제로 존재하는 영상인지, 업로드 날짜와 조회수를 보고 지금도 유효한 내용인지 직접 확인하십시오.",
    },
    {
      id: "kmooc",
      platform: "K-MOOC",
      title: `K-MOOC에서 "${competencyLabel}" 검색해보기`,
      href: buildKmoocUrl(competencyLabel),
      ariaLabel: `K-MOOC에서 ${competencyLabel} 검색하기 (새 창에서 열림)`,
      linkLabel: "K-MOOC에서 검색해보기",
      reason: "대학·기관이 만든 정규 온라인 강좌를 국가 MOOC 플랫폼에서 검색할 수 있습니다.",
      hypothesis: hypothesisBadgeText,
      time: "예상 시간: 강좌 목록을 훑어보는 데 보통 10~15분",
      difficulty: "난이도(예상): 입문~중급 강좌가 섞여 있음",
      free: "무료 여부(예상): 대부분 무료(국가 운영 MOOC)",
      verify: "지금 개설·수강 신청 중인 강좌인지 직접 확인하십시오.",
    },
  ];
}

export function buildInstitutionalResources(competencyLabel: string, hypothesis: string): ResourceCard[] {
  const hypothesisBadgeText = hypothesisBadge(hypothesis);
  return [
    {
      id: "work24",
      platform: "고용24(HRD-Net)",
      title: "고용24에서 직업훈련 검색해보기",
      href: WORK24_TRAINING_URL,
      ariaLabel: `고용24 직업훈련포털 — ${competencyLabel} 관련 훈련 검색 (새 창에서 열림)`,
      linkLabel: "고용24 열어보기",
      reason: `"${competencyLabel}" 관련 국비·정부지원 직업훈련 과정을 검색으로 찾을 수 있습니다.`,
      hypothesis: hypothesisBadgeText,
      time: "예상 시간: 훈련과정을 훑어보는 데 보통 15~20분",
      difficulty: "난이도(예상): 신청 자격·과정 난이도는 훈련마다 다름",
      free: "무료 여부(예상): 국민내일배움카드 등으로 무료·저비용인 경우가 많음(과정마다 다름)",
      verify: "지역·자격 조건이 나에게 맞는지, 실제 채용과 연계되는지 직접 확인하십시오.",
      searchHint: `이 페이지에서 "${competencyLabel}"으로 직접 검색해 보십시오.`,
    },
    {
      id: "youthcenter",
      platform: "온통청년",
      title: "온통청년에서 청년정책 검색해보기",
      href: YOUTH_CENTER_SEARCH_URL,
      ariaLabel: `온통청년 청년정책 통합검색 — ${competencyLabel} 관련 정책 검색 (새 창에서 열림)`,
      linkLabel: "온통청년 열어보기",
      reason: `"${competencyLabel}" 역량과 관련된 취업·훈련 지원 정책을 검색으로 찾을 수 있습니다.`,
      hypothesis: hypothesisBadgeText,
      time: "예상 시간: 정책 목록을 훑어보는 데 보통 10~15분",
      difficulty: "난이도(예상): 신청 자격은 정책마다 다름",
      free: "무료 여부(예상): 정부 정책이라 신청 자체는 대부분 무료",
      verify: "거주 지역·연령·소득 등 신청 조건이 나에게 맞는지 직접 확인하십시오.",
      searchHint: `이 페이지에서 "${competencyLabel} 취업 지원"으로 직접 검색해 보십시오.`,
    },
  ];
}

export function buildProjectCard(project: ActionTemplate, hypothesis: string): ProjectCard {
  return {
    title: project.title,
    time: project.time,
    rule: project.rule,
    hypothesis: `직업 가설: ${hypothesis} · 검색 없이 지금 바로 시작할 수 있습니다.`,
  };
}

export function buildLookIntoItResources(
  competencyLabel: string,
  hypothesis: string,
  project: ActionTemplate,
): { learn: ResourceCard[]; institutional: ResourceCard[]; project: ProjectCard } {
  return {
    learn: buildLearnResources(competencyLabel, hypothesis),
    institutional: buildInstitutionalResources(competencyLabel, hypothesis),
    project: buildProjectCard(project, hypothesis),
  };
}
