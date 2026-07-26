// Gate 2c(#38): /why — 문제와 철학. (/about은 프로젝트·제작 배경 담당 — 중복 금지)
import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";
import { IconQuestion, IconWarning, IconSpark, IconCheck, IconChecklist } from "../components/fact-icons";

export const metadata: Metadata = {
  title: "왜 GapProof인가 | GapProof",
  description: "경험이 없는 게 아니라 경력의 언어로 옮기지 못했을 뿐 — 행동 증거로 진로 탐색을 시작하는 이유",
  alternates: { canonical: "/why" },
};

export default function WhyPage() {
  return (
    <InfoShell
      active="/why"
      eyebrow="Why"
      title="경험이 없는 게 아니라, 경력의 언어로 옮기지 못했을 뿐입니다."
      lead="GapProof는 판정 대신 증거에서 시작합니다. 왜 그렇게 만들었는지를 설명합니다."
    >
      <section className="info-section">
        <h2><IconQuestion />문제: 이력서 밖의 시간</h2>
        <p>
          많은 사람이 &ldquo;저는 한 게 없어요&rdquo;라고 말합니다. 하지만 대화를 나눠 보면 돌봄, 아르바이트,
          커뮤니티 운영, 독학처럼 <b>실제로 한 행동</b>이 잔뜩 나옵니다. 문제는 경험의 부재가 아니라,
          그 경험을 직무의 언어로 옮겨 본 적이 없다는 것입니다.
        </p>
      </section>

      <section className="info-section">
        <h2><IconWarning />학력·직장 중심 경력 관점의 한계</h2>
        <p>
          기존 이력 체계는 소속과 기간을 묻습니다. 소속이 없던 시간 — 휴학, 공백기, 가족 돌봄,
          쉬었던 시기 — 는 설명할 칸이 없습니다. 그래서 그 시간에 있었던 판단·조율·기록·학습 같은
          행동이 통째로 사라집니다.
        </p>
      </section>

      <section className="info-section">
        <h2><IconSpark />돌봄·육아·게임·SNS·취미·휴식기도 분석하는 이유</h2>
        <p>
          간병 일정을 2년간 조율한 사람, 길드 문서를 만들어 30명에게 설명한 사람, 취미 계정으로
          콘텐츠 300개를 만든 사람 — 이들은 이미 반복·책임·문제 해결의 기록을 갖고 있습니다.
          GapProof는 경험의 종류를 가리지 않고 <b>남긴 행동</b>을 봅니다.
        </p>
      </section>

      <section className="info-section">
        <h2><IconCheck />행동 증거 중심 원칙</h2>
        <ul>
          <li>역량 후보에는 반드시 입력 원문의 문장이 근거로 붙습니다. 원문에 없으면 버립니다.</li>
          <li>&ldquo;게임을 많이 했다&rdquo;는 사실만으로 게임 코치를, &ldquo;SNS를 오래 했다&rdquo;는 사실만으로 마케터를 단정하지 않습니다.</li>
          <li>AI 제안은 초안일 뿐 — 확인·수정·거절의 최종 권한은 항상 사용자에게 있습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2><IconWarning />과장하지 않는 구조</h2>
        <p>
          근거가 약하면 약하다고 표시합니다(증거등급 Lv.0 자기기록부터 시작). 부풀린 한 줄보다,
          확인 질문이 붙은 정직한 한 줄이 상담과 지원서에서 더 오래 살아남기 때문입니다.
        </p>
      </section>

      <section className="info-section">
        <h2><IconChecklist />작은 검증 행동이 필요한 이유</h2>
        <p>
          방향은 검증 없이는 가설일 뿐입니다. GapProof는 &ldquo;이번 주에 할 수 있는 하나의 작은 실험&rdquo;을
          함께 제안합니다 — 문서 한 장 정리, 인터뷰 한 번, 미니 프로젝트 하나. 실험의 결과가
          다음 증거가 됩니다.
        </p>
      </section>

      <section className="info-section">
        <h2><IconWarning />GapProof가 하지 않는 것</h2>
        <ul>
          <li>취업 가능성·적성을 판정하지 않습니다.</li>
          <li>직업을 대신 결정하지 않습니다 — 직업은 언제나 &ldquo;가설&rdquo;로만 제시합니다.</li>
          <li>원문에 없는 경력을 만들어내지 않습니다.</li>
        </ul>
        <p className="info-note">누구를 위한 서비스인지는 <a href="/who">누구를 위한가</a>에서, 프로젝트 배경은 <a href="/about">소개</a>에서 볼 수 있어요.</p>
      </section>
    </InfoShell>
  );
}
