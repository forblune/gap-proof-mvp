import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  title: "이용 가이드 | GapProof",
  description: "GapProof 데모 5단계 사용 순서와 각 단계가 필요한 이유",
};

const STEPS = [
  {
    name: "1 · 시작",
    action: "접근 코드를 입력하고, 분석 동의 범위를 선택해요.",
    why: "데모 남용을 막고, 무엇에 동의하는지 먼저 확인하기 위해서예요.",
    time: "약 30초",
  },
  {
    name: "2 · 경험",
    action: "전공·학습·프로젝트·일 경험을 자유롭게 적어요. (20자~3,000자)",
    why: "흩어진 경험이 분석의 유일한 재료예요. 완벽히 정리하지 않아도 괜찮아요.",
    time: "약 2분",
  },
  {
    name: "3 · 역량 확인",
    action: "Solar가 찾은 역량 후보를 보고 맞아요/표현 수정/거절을 선택하고, 근거 링크를 붙여요.",
    why: "AI 제안보다 사용자의 확인이 먼저라는 원칙 때문이에요. 거절한 항목은 결과에서 빠져요.",
    time: "약 1분",
  },
  {
    name: "4 · 격차·행동",
    action: "목표 직무를 고르고 우선 격차를 확인한 뒤, 이번 주 행동 1개를 선택해요. 원하면 30초 학습확인도 볼 수 있어요.",
    why: "미래 전체가 아니라 이번 주 한 걸음에 집중하기 위해서예요.",
    time: "약 1분",
  },
  {
    name: "5 · GapProof",
    action: "개인용 증거 카드와 상담사용 Gap Brief를 확인하고, 필요하면 인쇄(PDF 저장)해요.",
    why: "혼자 시작할 수도 있고, 상담사·기관 검토로 이어갈 수도 있게 하기 위해서예요.",
    time: "약 30초",
  },
];

export default function GuidePage() {
  return (
    <InfoShell
      active="/guide"
      eyebrow="Guide"
      title="3분이면 전체 흐름을 볼 수 있어요."
      lead="다섯 단계를 순서대로 지나며, 각 단계는 이전 단계에서 사용자가 확인한 것만 사용합니다."
    >
      <section className="info-section">
        <h2>사용 순서</h2>
        <div className="table-scroll">
          <table className="info-table">
            <thead>
              <tr><th>단계</th><th>할 일</th><th>왜 필요한가요?</th><th>예상 시간</th></tr>
            </thead>
            <tbody>
              {STEPS.map((step) => (
                <tr key={step.name}>
                  <td><b>{step.name}</b></td>
                  <td>{step.action}</td>
                  <td>{step.why}</td>
                  <td>{step.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-section">
        <h2>입력하지 않아도 되는 정보</h2>
        <ul>
          <li>본인·가족의 실명, 연락처, 의료 정보는 적지 않아도 돼요.</li>
          <li>이메일·전화번호·주민등록번호로 보이는 표현이 있으면 분석 전에 자동으로 가려요.</li>
          <li>경험 원문은 서버에 저장하지 않아요.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>오류가 나면 이렇게 하세요</h2>
        <ul>
          <li>화면 위 알림이 <b>이유와 다음 행동</b>을 알려줘요(예: "경험을 20자 이상 적어 주세요").</li>
          <li>Solar 연결이 어려우면 입력 원문 기반의 <b>샘플 결과</b>로 자동 전환되고, 화면에 샘플임을 표시해요.</li>
          <li>요청이 너무 잦으면 1분 뒤에 다시 시도해 달라고 안내해요.</li>
          <li>세션이 만료되면 접근 코드 화면으로 돌아가요 — 입력한 내용은 그대로 남아 있어요.</li>
          <li>문제가 계속되면 새로고침 후 접근 코드를 다시 입력해 주세요.</li>
        </ul>
      </section>
    </InfoShell>
  );
}
