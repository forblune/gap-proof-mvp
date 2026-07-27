import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "소개 | GapProof",
  description: "공백·전환 경험을 역량 증거와 다음 행동으로 바꾸는 GapProof의 문제의식과 원칙",
};

export default function AboutPage() {
  return (
    <InfoShell
      active="/about"
      eyebrow="About · Why"
      title="공백을 지우지 않고, 증거로 바꿉니다."
      lead="GapProof는 학적·전공 밖의 경험을 근거 있는 역량과 이번 주 행동으로 연결하는 Solar 기반 진로 탐색 데모입니다."
    >
      <p className="info-note">
        문제의식과 원칙은 <a href="/why">왜 GapProof인가</a>, 대상별 안내는 <a href="/who">누구를 위한가</a>로
        옮겨 정리했습니다. 이 페이지는 프로젝트와 제작 배경을 다룹니다.
      </p>

      <section className="info-section">
        <h2>만든 계기</h2>
        <p>
          만든 사람 스스로 항공물류를 전공하면서 AI 수학과 웹을 따로 공부했고, Solar API를 연결한
          한국어 상담 MVP(MindHub)를 만들어 본 경험이 있습니다. 배우지 않은 것이 아니라, 전공 밖에서
          배운 것을 <b>어떤 직무 역량으로 설명해야 하는지</b>가 늘 애매했습니다. 그 경험이 이 데모의
          출발점입니다.
        </p>
      </section>

      <section className="info-section">
        <h2>기존 서비스와 무엇이 다른가요?</h2>
        <p>
          강의를 추천하는 데서 시작하지 않습니다. 먼저 지금 가진 경험에서 <b>원문 근거가 있는 역량
          후보</b>를 만들고, 사용자가 직접 확인·수정·거절한 것만 결과에 사용합니다. 그다음에야 목표
          직무와의 격차와 이번 주 행동으로 연결합니다. 학습 뒤에는 학습확인을 거쳐 수행 증거로
          돌아오는 닫힌 흐름을 지향합니다.
        </p>
      </section>

      <section className="info-section">
        <h2>하지 않는 판단</h2>
        <ul>
          <li>취업 가능성이나 적성을 판정하지 않습니다.</li>
          <li>AI 제안만으로 역량을 인정하지 않습니다 — 원문 근거와 사용자 확인이 있어야 합니다.</li>
          <li>원문에 없는 인용은 사용하지 않습니다(환각 방지 검증).</li>
          <li>진로를 대신 정해 주지 않습니다 — 이번 주에 실행할 한 걸음을 제안할 뿐입니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>개인정보 원칙</h2>
        <ul>
          <li>현재 버전은 서버에 경험 원문을 저장하지 않습니다.</li>
          <li>이메일·전화번호·주민등록번호로 보이는 표현은 분석 전에 가립니다.</li>
          <li>&ldquo;새 분석 시작하기&rdquo; 버튼으로 화면의 입력·결과를 한 번에 지울 수 있습니다.</li>
          <li>자세한 보호 장치는 <a href="/technology">기술과 검증</a>에서 확인할 수 있습니다.</li>
        </ul>
      </section>
    </InfoShell>
  );
}
