import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/guide" },
  title: "이용 가이드 | GapProof",
  description: "GapProof 데모 6단계 사용 순서와 각 단계가 필요한 이유",
};

const STEPS = [
  {
    name: "시작",
    action: "데모 코드를 입력하고, 분석 동의 범위를 선택합니다.",
    why: "데모 남용을 막고, 무엇에 동의하는지 먼저 확인하기 위해서입니다.",
    time: "약 30초",
  },
  {
    name: "경험",
    action: "전공·학습·프로젝트·일·돌봄 경험을 자유롭게 적습니다. (20자~10,000자)",
    why: "흩어진 경험이 분석의 유일한 재료입니다. 완벽히 정리하지 않아도 괜찮습니다.",
    time: "약 2분",
  },
  {
    name: "역량 확인",
    action: "Solar가 찾은 역량 후보를 보고 맞습니다·표현 수정·거절을 선택하고, 근거 링크를 붙입니다.",
    why: "AI 제안보다 사용자의 확인이 먼저라는 원칙 때문입니다. 거절한 항목은 결과에서 빠집니다.",
    time: "약 1분",
  },
  {
    name: "먼저 알아보기",
    action: "목표 직무를 고르고, 학습 자료·공공 제도 검색 출발점을 직접 열어 봅니다.",
    why: "AI가 고른 것을 그대로 받지 않고, 실제로 있는지·지금 나에게 맞는지를 사용자가 먼저 판단하게 하기 위해서입니다.",
    time: "약 1분",
  },
  {
    name: "격차·행동",
    action: "목표 직무를 고르고 우선 격차를 확인한 뒤, 이번 주 행동 1개를 선택합니다. 원하면 30초 학습확인도 볼 수 있습니다.",
    why: "미래 전체가 아니라 이번 주 한 걸음에 집중하기 위해서입니다.",
    time: "약 1분",
  },
  {
    name: "GapProof",
    action: "개인용 증거 카드와 상담사용 Gap Brief를 확인하고, 필요하면 인쇄(PDF 저장)합니다.",
    why: "혼자 시작할 수도 있고, 상담사·기관 검토로 이어갈 수도 있게 하기 위해서입니다.",
    time: "약 30초",
  },
];

export default function GuidePage() {
  return (
    <InfoShell
      active="/guide"
      eyebrow="Guide"
      title="3분이면 전체 흐름을 볼 수 있습니다."
      lead="여섯 단계를 순서대로 지나며, 각 단계는 이전 단계에서 사용자가 확인한 것만 사용합니다."
    >
      <section className="info-section">
        <h2>사용 순서</h2>
        <ol className="info-pipeline">
          {STEPS.map((step) => (
            <li key={step.name}>
              <b>{step.name}</b>
              <dl className="step-fields">
                <div><dt>할 일</dt><dd>{step.action}</dd></div>
                <div><dt>왜 필요합니까?</dt><dd>{step.why}</dd></div>
                <div><dt>예상 시간</dt><dd>{step.time}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="info-section">
        <h2>입력하지 않아도 되는 정보</h2>
        <ul>
          <li>본인·가족의 실명, 연락처, 의료 정보는 적지 않아도 됩니다.</li>
          <li>이메일·전화번호·주민등록번호로 보이는 표현이 있으면 분석 전에 자동으로 가립니다.</li>
          <li>경험 원문은 서버에 저장하지 않습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>오류가 나면 이렇게 대처합니다</h2>
        <ul>
          <li>화면 위 알림이 <b>이유와 다음 행동</b>을 알려줍니다(예: "경험을 20자 이상 적어 주십시오").</li>
          <li>Solar 연결이 어려우면 입력 원문 기반의 <b>샘플 결과</b>로 자동 전환되고, 화면에 샘플임을 표시합니다.</li>
          <li>요청이 너무 잦으면 1분 뒤에 다시 시도해 달라고 안내합니다.</li>
          <li>세션이 만료되면 데모 코드 화면으로 돌아갑니다 — 입력한 내용은 그대로 남아 있습니다.</li>
          <li>문제가 계속되면 새로고침 후 데모 코드를 다시 입력해 주십시오.</li>
        </ul>
      </section>
    </InfoShell>
  );
}
