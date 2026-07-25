// Gate 2c(#38): /who — 대상별 문제·돕는 방식·기대 결과·대신 결정하지 않는 것.
import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  title: "누구를 위한가 | GapProof",
  description: "경력이 없다고 느끼는 분, 공백기·전환기의 분, 비공식 경험이 많은 분을 위한 GapProof",
  alternates: { canonical: "/who" },
};

const AUDIENCES = [
  {
    id: "no-career",
    title: "경력이 없다고 느끼는 분",
    problem: "이력서에 쓸 줄이 없다고 생각해 지원 자체를 미루게 돼요.",
    help: "학교·일 밖의 경험에서도 실제 행동을 찾아 원문 근거와 함께 역량 후보로 보여줘요.",
    outcome: "“한 게 없다” 대신, 확인된 행동 목록과 첫 증거카드가 생겨요.",
    not: "그 역량으로 취업이 가능하다는 판정은 하지 않아요.",
  },
  {
    id: "gap",
    title: "공백기·휴학·진로 전환 중인 분",
    problem: "쉬었던 시간을 어떻게 설명해야 할지 몰라 면접·상담이 두려워요.",
    help: "공백기의 돌봄·독학·시도까지 분석 대상으로 삼고, 목표 직무와의 격차를 구체 항목으로 바꿔요.",
    outcome: "공백을 지우는 대신, 그 시간에 한 일을 증거로 설명할 언어가 생겨요.",
    not: "공백이 문제인지 아닌지 평가하지 않아요 — 평가가 아니라 정리를 도와요.",
  },
  {
    id: "informal",
    title: "비공식 경험(돌봄·커뮤니티·취미)이 많은 분",
    problem: "열심히 했지만 “공식 경력”이 아니라서 어디에도 쓰지 못했어요.",
    help: "반복·책임·문제 해결·몰입의 흔적을 행동 단위로 추출하고 확인 질문을 붙여요.",
    outcome: "비공식 경험이 직무 언어의 역량 후보로 번역돼요.",
    not: "경험을 부풀리지 않아요 — 근거가 약하면 약하다고 표시해요.",
  },
  {
    id: "scattered",
    title: "관심사가 흩어져 정리가 안 되는 분",
    problem: "이것저것 해 봤는데 연결이 안 되고, 무엇부터 할지 모르겠어요.",
    help: "흩어진 경험을 한 번에 넣으면 공통 행동과 관심 신호를 묶어 직업 가설로 연결해요.",
    outcome: "우선순위가 있는 격차 목록과 이번 주 실험 하나가 남아요.",
    not: "하나의 길을 정해 주지 않아요 — 가설과 다음 실험까지만 제안해요.",
  },
  {
    id: "ai-chat",
    title: "AI와의 대화에 경험이 쌓여 있는 분",
    problem: "ChatGPT·Claude에 이미 내 얘기를 많이 했는데, 그 기록이 흩어져 있어요.",
    help: "쓰던 AI(ChatGPT·Claude·Gemini)용 정리 프롬프트를 제공해요. 받은 답을 입력창에 붙여넣으면 그대로 분석을 시작할 수 있어요.",
    outcome: "산발적인 대화 기록이 하나의 증거 흐름으로 모여요.",
    not: "외부 AI의 답변을 확정된 사실로 취급하지 않아요 — 확인은 언제나 본인이 해요.",
  },
  {
    id: "counsel",
    title: "진로상담 전에 경험을 정리하고 싶은 분",
    problem: "상담 시간의 절반이 “무엇을 했는지” 설명으로 끝나 버려요.",
    help: "상담사·기관 검증용 한 장(Gap Brief)을 만들어, 상담을 다음 행동 합의에서 시작하게 해요.",
    outcome: "상담 시간이 과거 설명이 아니라 다음 단계 논의에 쓰여요.",
    not: "상담을 대체하지 않아요 — 상담 보조자료이며 자동판정이 아니에요.",
  },
] as const;

export default function WhoPage() {
  return (
    <InfoShell
      active="/who"
      eyebrow="Who"
      title="GapProof는 이런 분을 위해 만들었습니다."
      lead="대상마다 겪는 문제, GapProof가 돕는 방식, 기대할 수 있는 결과, 그리고 대신 결정하지 않는 것을 함께 적었습니다."
    >
      <div className="who-grid">
        {AUDIENCES.map((a) => (
          <article className="who-card" key={a.id} aria-label={a.title}>
            <h2>{a.title}</h2>
            <dl>
              <dt>지금 겪는 문제</dt>
              <dd>{a.problem}</dd>
              <dt>GapProof가 돕는 방식</dt>
              <dd>{a.help}</dd>
              <dt>기대할 수 있는 결과</dt>
              <dd>{a.outcome}</dd>
              <dt>대신 결정하지 않는 것</dt>
              <dd>{a.not}</dd>
            </dl>
          </article>
        ))}
      </div>
      <p className="info-note">왜 이렇게 만들었는지는 <a href="/why">왜 GapProof인가</a>에서 볼 수 있어요.</p>
    </InfoShell>
  );
}
