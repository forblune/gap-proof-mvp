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
        <h2>어떻게 작동하나요?</h2>
        <p>실제 화면은 다섯 단계로 이어집니다.</p>
        <ul>
          <li>경험을 자유 문장으로 입력합니다(이메일·전화번호는 자동으로 가려집니다).</li>
          <li>Solar가 제안한 역량 후보를 원문 인용과 함께 확인하고, 사용자가 직접 맞다/아니다를 정합니다.</li>
          <li>가장 우선순위가 높은 격차 후보와 연결된 학습·제도 자료를 미리 살펴봅니다(건너뛸 수 있습니다).</li>
          <li>목표 직무와 비교해 무엇이 비어 있는지, 이번 주에 할 수 있는 행동은 무엇인지 확인합니다.</li>
          <li>증거카드와 상담용 Gap Brief로 결과를 받습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>만든 기술</h2>
        <p>
          Next.js 16과 React 19로 화면을 만들고, Cloudflare Workers에 배포합니다. 정적 자산은
          Cloudflare Assets 바인딩이 압축해 서빙하고, 경험 분석은 <b>Upstage Solar</b>가 맡습니다.
          스타일은 Tailwind CSS, 언어는 TypeScript(strict)입니다. 서버는 경험 원문을 저장하지 않으며,
          개인 데이터를 외부로 전송하는 코드 경로 자체가 없습니다.
        </p>
      </section>

      <section className="info-section">
        <h2>겪은 문제와 해결</h2>
        <p>
          한 가지만 소개하면 — 로컬에서 성능을 측정했을 때 목표(90점)에 못 미치는 결과가 나온 적이
          있습니다. 원인을 코드가 아니라 <b>측정에 쓴 로컬 서버</b>에서 찾았습니다. 실제 배포 환경인
          Cloudflare Workers는 정적 파일을 압축해서 보내는데, 로컬 미리보기 서버는 압축하지 않고
          보내고 있었던 것입니다. 측정 방법을 실제 배포 환경과 같은 도구로 바꾸자, 코드는 한 줄도
          바꾸지 않은 채로 점수가 정상 범위에 들어왔습니다. 자세한 개발 기록은 개발일지에 남겨
          두었습니다.
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
        <h2>지금의 한계와 다음 계획</h2>
        <p>지금 되는 것과, 다음에 할 일을 구분해 정직하게 남깁니다.</p>
        <h3>지금 되는 것</h3>
        <ul>
          <li>원문에 없는 인용은 사용하지 않는 검증</li>
          <li>사용자가 확인해야만 다음 단계로 진행되는 흐름</li>
          <li>확인된 증거와 목표 직무 격차·이번 주 행동 연결</li>
          <li>증거카드와 Gap Brief 결과 생성</li>
        </ul>
        <h3>다음에 할 일(예정)</h3>
        <ul>
          <li>학습확인(퀴즈)만 통과해도 증거등급이 실제 수행처럼 올라가는 계산 로직을 바로잡는 작업(예정, 우선순위 높음)</li>
          <li>확인된 증거가 하나도 없어도 학습확인만으로 다음 단계까지 진행되는 예외 경로를 막는 작업(예정, 우선순위 높음)</li>
          <li>학습 자료를 보여주는 화면 순서를, 격차를 먼저 확인한 다음으로 조정하는 작업(예정)</li>
          <li>실제로 만든 결과물이나 수행 링크를 증거로 남기는 기능(예정, 아직 없음)</li>
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
