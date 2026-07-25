import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/how-it-works" },
  title: "작동 원리 | GapProof",
  description: "경험 입력부터 카드 생성·삭제까지 GapProof 파이프라인과 증거등급 기준",
};

const PIPELINE = [
  { name: "접근 확인", detail: "심사·공유용 데모 코드를 서버가 검증하고, 서명된 세션 쿠키를 발급해요. 코드 없이 분석 API는 열리지 않아요." },
  { name: "동의", detail: "분석 사용 범위와 익명 통계 공유(선택)를 먼저 확인해요." },
  { name: "경험 입력·검증", detail: "20자~10,000자 조건을 화면과 서버가 각각 검사해요. 넘치면 자동으로 자르지 않고 알려줘요." },
  { name: "개인정보 가리기", detail: "이메일·전화번호·주민등록번호로 보이는 표현을 분석 전에 가려요. 가린 사실은 화면에 알려줘요." },
  { name: "Solar 구조화", detail: "선택한 Solar 모델(허용 목록 내)이 경험에서 역량 후보·원문 근거·추가 질문을 JSON으로 만들어요." },
  { name: "원문 인용 검증", detail: "모델이 만든 인용이 입력 문장에 실제로 없으면 그 후보를 폐기해요(환각 방지). 연결이 어려우면 규칙 기반 샘플로 전환하고 샘플임을 표시해요." },
  { name: "사용자 확인", detail: "맞아요/표현 수정/거절 — 확인된 항목만 다음 단계로 넘어가요. 인용문 자체는 수정할 수 없어요." },
  { name: "증거등급", detail: "아래 표의 기준으로 Lv.0~3을 부여해요. AI 제안만으로는 등급이 올라가지 않아요." },
  { name: "격차 계산", detail: "격차 점수 = 목표 직무의 중요도 × (필요 수준 − 현재 수준). 큰 격차부터 보여줘요." },
  { name: "행동 추천", detail: "학습 1 · 강의 연계 1 · 미니프로젝트 1 중에서 이번 주 행동 하나를 고르게 해요." },
  { name: "카드·Gap Brief", detail: "확인된 역량만으로 개인용 증거 카드와 상담사용 1쪽 요약을 만들어요. 생성 날짜가 함께 기록돼요." },
  { name: "삭제", detail: "기록 삭제를 확인하면 입력·후보·선택·결과가 화면에서 모두 지워져요. 서버에는 애초에 원문을 저장하지 않아요." },
];

const TIERS = [
  { level: "Lv.0", name: "자기기록", condition: "서술만 있고 연결 자료·평가가 없는 상태 (모든 후보의 시작점)" },
  { level: "Lv.1", name: "근거 연결", condition: "노트·저장소·수료증 등 링크가 연결된 상태" },
  { level: "Lv.2", name: "수행 확인", condition: "학습확인(2문항, 최대 3회) 통과 등 수행이 확인된 상태" },
  { level: "Lv.3", name: "기관 확인", condition: "학교·교육기관·상담사 등 지정 주체가 확인한 상태 (이번 데모 범위 밖)" },
];

export default function HowItWorksPage() {
  return (
    <InfoShell
      active="/how-it-works"
      eyebrow="How it works"
      title="근거 없는 역량은 만들지 않습니다."
      lead="입력부터 삭제까지 모든 단계가 '원문 근거 + 사용자 확인'이라는 한 가지 규칙을 지키도록 설계했습니다."
    >
      <section className="info-section">
        <h2>파이프라인</h2>
        <ol className="info-pipeline">
          {PIPELINE.map((stage) => (
            <li key={stage.name}>
              <b>{stage.name}</b>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="info-section">
        <h2>증거등급 기준</h2>
        <div className="table-scroll">
          <table className="info-table">
            <thead>
              <tr><th>등급</th><th>이름</th><th>최소 조건</th></tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => (
                <tr key={tier.level}>
                  <td><b>{tier.level}</b></td>
                  <td>{tier.name}</td>
                  <td>{tier.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-section">
        <h2>실패에 대비한 폴백</h2>
        <ul>
          <li>Solar 키가 없거나 12초 안에 응답하지 않으면 입력 원문 기반의 규칙 샘플로 전환해요.</li>
          <li>응답 JSON이 잘못됐거나 원문과 일치하는 인용이 없어도 샘플로 전환해요.</li>
          <li>어느 경우든 화면 배지와 안내문이 <b>실제 Solar 연결인지 샘플인지</b> 구분해서 보여줘요.</li>
        </ul>
      </section>
    </InfoShell>
  );
}
