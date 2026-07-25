// Gate 8(#44): 개인정보 처리방침 — 현행 구현(무저장 데모)과 1:1 일치하도록 관리한다.
// 원칙: 법률 준수를 보장한다고 표현하지 않는다. 전문가 검토 전임을 명시한다.
import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | GapProof",
  description: "GapProof 데모의 개인정보 처리 원칙 — 서버 무저장, 전송 전 마스킹, 기기 내 임시 보관",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoShell
      active={null}
      eyebrow="Privacy"
      title="개인정보 처리방침"
      lead="현재 데모 버전이 실제로 무엇을 수집하고 무엇을 수집하지 않는지를 그대로 적었습니다. (버전 v0.1 · 2026-07-25)"
    >
      <section className="info-section">
        <h2>문서의 상태</h2>
        <p>
          이 문서는 <b>전문가(법률) 검토 전의 초안</b>이며, 저장소의 실제 구현과 일치하도록 함께
          관리됩니다. 회원 기능 도입 등 데이터 흐름이 바뀌면 이 문서를 먼저 개정하고 버전을
          기록한 뒤 적용합니다.
        </p>
      </section>

      <section className="info-section">
        <h2>수집·저장하지 않는 것 (현재 버전)</h2>
        <ul>
          <li>회원가입이 없으며 이름·이메일·전화번호 등 <b>계정 정보를 수집하지 않습니다</b>.</li>
          <li>경험 입력 원문을 <b>서버에 저장하지 않습니다</b>. 분석 요청 처리에만 사용합니다.</li>
          <li>첨부한 TXT·MD 파일은 브라우저 안에서 텍스트로만 읽으며 <b>서버로 업로드하지 않습니다</b>.</li>
          <li>공유 링크에는 서비스 소개만 담기며 <b>개인의 입력·결과가 포함되지 않습니다</b>.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>처리 항목과 목적</h2>
        <ul>
          <li><b>경험 입력 텍스트(일시 처리)</b> — 역량 후보 분석을 위해 Solar API에 전달합니다. 전달 전에 이메일·전화번호·주민등록번호로 보이는 표현을 자동으로 가립니다(형식이 없는 이름·주소는 자동으로 가려지지 않을 수 있어 입력 안내가 1차 방어입니다).</li>
          <li><b>데모 세션 쿠키(gp_gate) 1종</b> — 데모 코드 확인 후 발급되는 서명 쿠키로, 입장 상태 유지에만 쓰입니다. 유효기간 12시간, 개인 식별 정보가 들어 있지 않습니다.</li>
          <li><b>작성 중 내용(draft)</b> — 이용자의 기기(브라우저 localStorage)에만 임시 보관되어 재접속 시 이어쓰기에 쓰입니다. 서버로 전송되지 않으며 &ldquo;기록 삭제&rdquo;·&ldquo;데모 잠금&rdquo; 시 삭제됩니다.</li>
          <li><b>요청 한도 처리</b> — 과다 요청 방지를 위해 요청 단위의 IP 기반 카운터를 사용합니다. 원본 IP·세션 값을 로그나 키에 그대로 저장하지 않습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>처리 위탁·외부 서비스</h2>
        <ul>
          <li><b>Cloudflare Workers</b> — 서비스 실행·전송(엣지 인프라). 전 세계 엣지에서 실행되므로 <b>요청 처리 과정에서 국외 서버를 경유할 수 있습니다</b>(저장은 하지 않습니다).</li>
          <li><b>Upstage Solar API</b> — 마스킹된 입력 텍스트의 분석 처리.</li>
          <li>카카오톡 공유 SDK는 결과 화면에서 공유 기능이 구성된 경우에만 로드됩니다.</li>
        </ul>
        <p className="info-note">각 위탁사의 구체적 처리 위치·보관 정책은 회원 기능 도입 전 재조사하여 이 문서에 반영할 예정입니다.</p>
      </section>

      <section className="info-section">
        <h2>보유 기간</h2>
        <ul>
          <li>서버: 입력 원문·결과를 저장하지 않으므로 보유 기간이 없습니다.</li>
          <li>세션 쿠키: 최대 12시간(데모 잠금 시 즉시 만료).</li>
          <li>기기 내 draft: 이용자가 삭제하기 전까지 — &ldquo;기록 삭제&rdquo;·&ldquo;데모 잠금&rdquo;으로 즉시 삭제할 수 있습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>이용자의 권리</h2>
        <ul>
          <li>입력·결과는 화면의 &ldquo;기록 삭제&rdquo;로 언제든 지울 수 있습니다(서버에는 애초에 저장되지 않습니다).</li>
          <li>선택 동의(익명 통계 참여)는 체크하지 않아도 핵심 기능을 모두 이용할 수 있습니다.</li>
          <li>문의는 저장소 이슈 또는 안내받은 채널로 할 수 있습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>AI 분석에 대한 안내</h2>
        <ul>
          <li>분석 결과는 AI의 <b>제안(초안)</b>이며, 이용자가 확인한 항목만 결과에 사용됩니다.</li>
          <li>GapProof는 취업 가능성·적성을 판정하지 않으며, 그런 판정 결과를 생성하지 않습니다.</li>
          <li>건강·가족 상황 같은 민감할 수 있는 경험은 <b>질환·상태가 아니라 이용자가 한 행동</b> 중심으로 다루며, 구체적 의료 정보는 적지 않기를 권장합니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>만 14세 미만 이용</h2>
        <p>
          현재 버전은 계정·개인정보를 수집하지 않는 데모입니다. 회원 기능 도입 시에는 가입
          단계에서 만 14세 이상 확인을 거치도록 설계할 예정이며, 만 14세 미만의 가입은 받지
          않을 계획입니다.
        </p>
      </section>

      <section className="info-section">
        <h2>변경 기록</h2>
        <ul>
          <li>v0.1 (2026-07-25) — 최초 작성(무저장 데모 기준). 이후 변경은 버전과 날짜를 남깁니다.</li>
        </ul>
      </section>
    </InfoShell>
  );
}
