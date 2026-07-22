"use client";

import { useMemo, useState } from "react";

type ClaimStatus = "pending" | "confirmed" | "rejected";

type Claim = {
  id: number;
  skill: string;
  quote: string;
  source: string;
  tier: number;
  confidence: "높음" | "확인 필요";
  question: string;
  status: ClaimStatus;
};

const steps = ["시작", "경험", "역량 확인", "격차·행동", "GapProof"];

const initialClaims: Claim[] = [
  {
    id: 1,
    skill: "도메인과 기술을 연결한 문제 정의",
    quote:
      "항공물류 전공에서 배운 흐름을 바탕으로 AI가 상담의 반복 정리를 줄일 수 있다고 판단했다.",
    source: "학교·프로젝트",
    tier: 1,
    confidence: "높음",
    question: "문제를 확인한 사용자나 상담사가 있었나요?",
    status: "pending",
  },
  {
    id: 2,
    skill: "AI API 기반 서비스 프로토타이핑",
    quote: "Solar API를 연결해 한국어 상담 MVP인 MindHub를 만들었다.",
    source: "프로젝트 링크",
    tier: 1,
    confidence: "높음",
    question: "직접 구현한 범위와 작동 링크를 추가해 주세요.",
    status: "pending",
  },
  {
    id: 3,
    skill: "AI 모델 개발",
    quote: "집에서 AI 수학을 공부하고 관련 노트를 정리했다.",
    source: "자기기록",
    tier: 0,
    confidence: "확인 필요",
    question: "모델을 직접 학습·평가한 산출물이 있나요?",
    status: "pending",
  },
];

const actions = [
  {
    id: "learn",
    type: "학습",
    title: "사용자 인터뷰 핵심 익히기",
    time: "40분",
    rule: "질문 5개를 내 프로젝트에 맞게 작성",
  },
  {
    id: "project",
    type: "미니프로젝트",
    title: "청년 5명에게 증거카드 테스트",
    time: "2시간",
    rule: "인터뷰 5건과 수정사항 3개 남기기",
  },
  {
    id: "counsel",
    type: "상담",
    title: "상담사에게 Gap Brief 검증받기",
    time: "30분",
    rule: "유용성 5점 평가와 빠진 정보 1개 받기",
  },
];

function TierBadge({ tier }: { tier: number }) {
  const labels = ["자기기록", "근거 연결", "수행 확인", "기관 확인"];
  return (
    <span className={`tier tier-${tier}`}>
      <b>Lv.{tier}</b> {labels[tier]}
    </span>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [storeConsent, setStoreConsent] = useState(false);
  const [aggregateConsent, setAggregateConsent] = useState(false);
  const [experience, setExperience] = useState(
    "항공물류를 전공했고, 집에서 AI 수학과 웹을 공부했습니다. Solar API를 연결해 한국어 상담 MVP인 MindHub를 만들었습니다.",
  );
  const [claims, setClaims] = useState(initialClaims);
  const [selectedAction, setSelectedAction] = useState("project");
  const [notice, setNotice] = useState("");

  const confirmedClaims = useMemo(
    () => claims.filter((claim) => claim.status === "confirmed"),
    [claims],
  );

  const updateClaim = (id: number, status: ClaimStatus) => {
    setClaims((current) =>
      current.map((claim) => (claim.id === id ? { ...claim, status } : claim)),
    );
  };

  const moveTo = (next: number) => {
    setNotice("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetDemo = () => {
    setStep(0);
    setStoreConsent(false);
    setAggregateConsent(false);
    setClaims(initialClaims);
    setSelectedAction("project");
    setNotice("샘플 기록과 파생 결과를 화면에서 삭제했습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GapProof 처음으로">
          <span className="brand-mark">G</span>
          <span>GapProof</span>
        </a>
        <div className="top-actions">
          <span className="sample-badge"><i /> Solar 샘플 데모</span>
          <button className="text-button" onClick={resetDemo}>기록 삭제</button>
        </div>
      </header>

      <section className="progress-wrap" aria-label="진행 단계">
        <ol className="progress">
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "active" : index < step ? "done" : ""}>
              <span>{index < step ? "✓" : index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>
      </section>

      {notice && <div className="notice" role="status">{notice}</div>}

      {step === 0 && (
        <section className="hero page-shell" id="top">
          <div className="hero-copy">
            <span className="eyebrow">공백·전환 경험을 위한 AI 진로상담 지원</span>
            <h1>공백을 지우지 않고,<br /><em>증거로 바꿉니다.</em></h1>
            <p className="hero-lead">
              흩어진 공부와 프로젝트를 Solar가 역량 후보와 근거 문장으로 정리합니다.
              당신이 확인한 증거만 목표직무의 격차와 이번 주 행동으로 이어집니다.
            </p>
            <div className="principles" aria-label="서비스 원칙">
              <span>AI가 진로를 단정하지 않아요</span>
              <span>근거 없는 역량은 인정하지 않아요</span>
              <span>원문 공유는 직접 선택해요</span>
            </div>
          </div>

          <aside className="consent-card">
            <div className="card-kicker">샘플로 3분 체험</div>
            <h2>내 경험에서 시작하기</h2>
            <p>이 데모는 실제 Solar 호출 전 단계로, 준비된 샘플 결과를 사용합니다.</p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={storeConsent}
                onChange={(event) => setStoreConsent(event.target.checked)}
              />
              <span><b>체험 기록 저장에 동의</b><small>이 화면 안에서만 사용하며 언제든 삭제할 수 있어요.</small></span>
            </label>
            <label className="check-row optional">
              <input
                type="checkbox"
                checked={aggregateConsent}
                onChange={(event) => setAggregateConsent(event.target.checked)}
              />
              <span><b>익명 격차 통계 공유</b><small>선택사항 · 개인 원문은 기관 통계에 포함하지 않아요.</small></span>
            </label>
            <button className="primary full" disabled={!storeConsent} onClick={() => moveTo(1)}>
              샘플 여정 시작하기 <span>→</span>
            </button>
            <small className="fine-print">GapProof는 취업 가능성이나 적성을 판정하지 않습니다.</small>
          </aside>
        </section>
      )}

      {step === 1 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 1 · 경험함</span><h1>학적 밖에 있던 경험을 적어주세요.</h1></div>
            <span className="time-pill">약 2분</span>
          </div>
          <div className="experience-layout">
            <div className="paper-card input-card">
              <label htmlFor="experience"><b>어떤 전공·공부·일·프로젝트를 해봤나요?</b></label>
              <textarea id="experience" value={experience} onChange={(event) => setExperience(event.target.value)} />
              <div className="input-meta"><span>개인·가족 실명과 의료정보는 적지 않아도 돼요.</span><b>{experience.length}자</b></div>
              <div className="source-list">
                <button type="button" className="source active">프로젝트</button>
                <button type="button" className="source">강의·수료</button>
                <button type="button" className="source">일·아르바이트</button>
                <button type="button" className="source">학교</button>
              </div>
            </div>
            <aside className="paper-card evidence-preview">
              <div className="card-kicker">입력 예시</div>
              <blockquote>“학교에서 배운 전공과 집에서 시작한 기술 공부가 따로 놀았습니다.”</blockquote>
              <div className="mini-evidence"><span>01</span><p><b>항공물류 전공</b><small>도메인 지식 · 학교</small></p></div>
              <div className="mini-evidence"><span>02</span><p><b>AI 수학·웹 독학</b><small>학습 기록 · 자기기록</small></p></div>
              <div className="mini-evidence"><span>03</span><p><b>MindHub 제작</b><small>작동 산출물 · 프로젝트</small></p></div>
            </aside>
          </div>
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(0)}>이전</button>
            <button className="primary" disabled={experience.trim().length < 20} onClick={() => moveTo(2)}>
              Solar 샘플로 역량 찾기 <span>→</span>
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 2 · 사용자 확인</span><h1>AI의 제안보다 당신의 확인이 먼저예요.</h1></div>
            <div className="legend"><i /> 원문 근거가 함께 표시됩니다</div>
          </div>
          <div className="explain-strip">
            <b>Solar 샘플 분석 완료</b>
            <span>3개 후보 중 과장되거나 맥락이 다른 것은 거절하세요. 거절한 항목은 카드와 추천에서 빠집니다.</span>
          </div>
          <div className="claims">
            {claims.map((claim) => (
              <article key={claim.id} className={`claim-card ${claim.status}`}>
                <div className="claim-top">
                  <span className={`confidence ${claim.confidence === "높음" ? "high" : "low"}`}>{claim.confidence}</span>
                  <TierBadge tier={claim.tier} />
                </div>
                <h2>{claim.skill}</h2>
                <blockquote>“{claim.quote}”</blockquote>
                <div className="claim-source"><span>출처</span><b>{claim.source}</b></div>
                <p className="follow-up"><b>더 확인하면 좋은 것</b>{claim.question}</p>
                <div className="claim-actions">
                  <button className={claim.status === "rejected" ? "selected reject" : ""} onClick={() => updateClaim(claim.id, "rejected")}>거절</button>
                  <button onClick={() => setNotice("수정 입력은 알파 버전에서 연결할 예정입니다.")}>표현 수정</button>
                  <button className={claim.status === "confirmed" ? "selected confirm" : "confirm"} onClick={() => updateClaim(claim.id, "confirmed")}>✓ 맞아요</button>
                </div>
              </article>
            ))}
          </div>
          <div className="footer-actions sticky-actions">
            <div><b>{confirmedClaims.length}개 확인됨</b><span>최소 1개를 확인해 주세요.</span></div>
            <button className="secondary" onClick={() => moveTo(1)}>이전</button>
            <button className="primary" disabled={confirmedClaims.length === 0} onClick={() => moveTo(3)}>격차와 다음 행동 보기 <span>→</span></button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 3 · 목표직무 비교</span><h1>미래 전체가 아니라, 이번 주 한 걸음을 찾습니다.</h1></div>
            <div className="role-chip"><small>대표 목표직무</small><b>AI 서비스 기획자</b></div>
          </div>
          <div className="map-grid">
            <section className="paper-card strengths">
              <div className="card-kicker">확인된 현재 역량</div>
              <h2>이미 출발점이 있어요.</h2>
              {confirmedClaims.length ? confirmedClaims.map((claim) => (
                <div className="strength-row" key={claim.id}><span>✓</span><p><b>{claim.skill}</b><small>{claim.quote}</small></p><TierBadge tier={claim.tier} /></div>
              )) : <p>확인된 역량이 없습니다.</p>}
            </section>
            <section className="paper-card gaps">
              <div className="card-kicker coral">우선 격차 3개</div>
              <h2>더 필요한 것은 이만큼이에요.</h2>
              {[
                ["사용자 검증", 72, "인터뷰·테스트 기록"],
                ["데이터·성과지표", 58, "KPI와 이벤트 설계"],
                ["개인정보·AI 안전", 42, "동의·삭제·감사기록"],
              ].map(([label, value, proof]) => (
                <div className="gap-row" key={label as string}>
                  <div><b>{label}</b><small>필요 증거: {proof}</small></div>
                  <div className="bar"><i style={{ width: `${value}%` }} /></div>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
          </div>
          <div className="action-section">
            <div className="action-title"><div><span className="eyebrow">격차를 낮추는 행동</span><h2>이번 주에는 하나만 선택해요.</h2></div><p>중요도 × 격차 × 실행가능성 순으로 골랐어요.</p></div>
            <div className="action-grid">
              {actions.map((action) => (
                <button key={action.id} className={`action-card ${selectedAction === action.id ? "selected" : ""}`} onClick={() => setSelectedAction(action.id)}>
                  <span className="action-type">{action.type}</span>
                  <h3>{action.title}</h3>
                  <p>{action.rule}</p>
                  <div><b>{action.time}</b><span>{selectedAction === action.id ? "✓ 선택됨" : "선택하기"}</span></div>
                </button>
              ))}
            </div>
          </div>
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(2)}>이전</button>
            <button className="primary" onClick={() => moveTo(4)}>GapProof 만들기 <span>→</span></button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="page-shell flow-page proof-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 4 · 증거에서 행동까지</span><h1>설명이 아니라, 다음 상담의 출발점이 생겼어요.</h1></div>
            <span className="complete-badge">✓ 샘플 여정 완료</span>
          </div>
          <div className="proof-grid">
            <article className="proof-card personal-proof">
              <div className="proof-header"><div><span className="brand-mark small">G</span><b>GapProof</b></div><span>개인용 증거카드</span></div>
              <div className="identity"><small>목표직무</small><h2>AI 서비스 기획자</h2><p>항공물류의 도메인 경험과 AI 독학을 서비스 문제 해결로 연결하는 전환 경로</p></div>
              <div className="proof-block"><span>확인된 역량</span>{confirmedClaims.map((claim) => <div className="proof-skill" key={claim.id}><b>{claim.skill}</b><TierBadge tier={claim.tier} /></div>)}</div>
              <div className="proof-block quote-block"><span>대표 근거</span><blockquote>“{confirmedClaims[0]?.quote ?? "확인된 근거를 추가해 주세요."}”</blockquote></div>
              <div className="chosen-action"><span>이번 주 다음 행동</span><b>{actions.find((action) => action.id === selectedAction)?.title}</b><small>{actions.find((action) => action.id === selectedAction)?.rule}</small></div>
              <footer><span>AI 제안 → 사용자 확인 완료</span><b>2026.07.22</b></footer>
            </article>

            <article className="proof-card counselor-proof">
              <div className="proof-header"><div><span className="brief-mark">1P</span><b>Gap Brief</b></div><span>상담사용 1쪽 요약</span></div>
              <div className="brief-section"><span>상담 목표</span><h2>과거 설명보다 다음 행동 합의에 시간을 씁니다.</h2></div>
              <div className="brief-columns">
                <div><span>현재 강점</span><ul><li>도메인–기술 문제 연결</li><li>AI API 프로토타이핑</li></ul></div>
                <div><span>우선 확인</span><ul><li>실제 사용자 검증 경험</li><li>본인이 구현한 범위</li></ul></div>
              </div>
              <div className="brief-section questions"><span>다음 상담 질문</span><ol><li>이 문제를 가장 절실하게 느낀 사용자는 누구였나요?</li><li>청년 5명 테스트에서 무엇을 관찰할 건가요?</li><li>이 행동을 끝냈다고 판단할 증거는 무엇인가요?</li></ol></div>
              <div className="privacy-note"><b>기관 공유 범위</b><p>{aggregateConsent ? "익명 격차 항목 공유에 동의 · 개인 원문 제외" : "익명 통계 공유 안 함 · 개인 카드만 사용"}</p></div>
              <footer><span>상담 보조자료 · 자동판정 아님</span><b>검토 필요</b></footer>
            </article>
          </div>
          <div className="story-callout"><span>GapProof의 약속</span><p>“미래를 예측해 주는 AI가 아니라, 불확실한 미래에도 다시 움직일 수 있게 하는 AI.”</p></div>
          <div className="footer-actions final-actions">
            <button className="secondary" onClick={() => moveTo(3)}>행동 다시 고르기</button>
            <button className="secondary" onClick={() => setNotice("PDF 내보내기는 알파 구현 범위에 포함되어 있습니다.")}>PDF 준비 중</button>
            <button className="primary" onClick={resetDemo}>새 샘플 시작 <span>↻</span></button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <p>샘플 데이터 · 취업 또는 적성 판정이 아닙니다</p>
      </footer>
    </main>
  );
}
