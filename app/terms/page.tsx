// Gate 8(#44): 이용약관 — 데모 서비스 성격과 실제 기능 범위에 맞춘 초안.
// 원칙: 법률 준수 보장 표현 금지 · 전문가 검토 전 명시 · 실제 동작과 일치.
import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";

export const metadata: Metadata = {
  title: "이용약관 | GapProof",
  description: "GapProof 데모 서비스의 이용 조건과 AI 산출물의 한계 안내",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoShell
      active={null}
      eyebrow="Terms"
      title="이용약관"
      lead="데모 서비스의 성격, 이용 조건, AI 산출물의 한계를 적었습니다. (버전 v0.1 · 2026-07-25)"
    >
      <section className="info-section">
        <h2>문서의 상태</h2>
        <p>이 약관은 <b>전문가(법률) 검토 전의 초안</b>이며, 서비스 변경 시 버전을 기록하고 개정합니다.</p>
      </section>

      <section className="info-section">
        <h2>1. 서비스의 성격</h2>
        <ul>
          <li>GapProof는 경험을 역량 증거와 다음 행동으로 정리하는 <b>진로 탐색 지원 프로토타입(데모)</b>입니다.</li>
          <li>취업 가능성·적성·합격 여부를 판정하지 않으며, 상담·의료·법률 등 전문 서비스가 아닙니다.</li>
          <li>현재 버전은 심사·멘토링 공유를 위한 제한 운영 상태로, 데모 코드로 입장합니다. 샘플 체험은 코드 없이 이용할 수 있습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>2. 이용 조건</h2>
        <ul>
          <li>안내받은 데모 코드는 공유 목적 범위에서 사용해 주세요.</li>
          <li>서비스에 과도한 자동화 요청을 보내는 행위, 취약점을 악용하는 행위는 금지됩니다(요청 한도가 적용됩니다).</li>
          <li>타인의 개인정보나 권리를 침해하는 내용을 입력하지 마세요.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>3. AI 산출물의 한계</h2>
        <ul>
          <li>분석 결과는 AI의 제안(초안)이며 정확성이 보장되지 않습니다. 이용자가 확인한 항목만 결과에 사용됩니다.</li>
          <li>직업 관련 표현은 항상 &ldquo;가설&rdquo;이며, 진로 결정의 근거 판단과 책임은 이용자에게 있습니다.</li>
          <li>실제 Solar 연결과 샘플 결과는 화면에 구분 표시됩니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>4. 데이터와 기록</h2>
        <p>
          입력·결과의 처리 방식은 <a href="/privacy">개인정보 처리방침</a>을 따릅니다. 현재 버전은
          입력 원문과 결과를 서버에 저장하지 않으며, 작성 중 내용은 이용자 기기에만 임시 보관됩니다.
        </p>
      </section>

      <section className="info-section">
        <h2>5. 서비스 변경·중단</h2>
        <p>
          프로토타입 특성상 기능이 예고 없이 변경되거나 일시 중단될 수 있습니다. 중요한 변경은
          홈페이지와 이 문서의 버전 기록으로 알립니다.
        </p>
      </section>

      <section className="info-section">
        <h2>6. 문의</h2>
        <p>저장소 이슈 또는 안내받은 채널로 문의할 수 있습니다.</p>
      </section>

      <section className="info-section">
        <h2>변경 기록</h2>
        <ul>
          <li>v0.1 (2026-07-25) — 최초 작성(데모 운영 기준).</li>
        </ul>
      </section>
    </InfoShell>
  );
}
