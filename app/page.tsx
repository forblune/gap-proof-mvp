"use client";

import { useMemo, useState } from "react";
import {
  ROLES,
  findRole,
  computeGapMap,
  recommendNextActions,
  tierFromLink,
  makeCheck,
} from "./lib/engine";

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
  link?: string;
};

type Quiz = {
  compId: string;
  questions: { q: string; options: string[]; answer: number }[];
  picks: (number | null)[];
  attempt: number;
  status: "open" | "passed" | "locked";
};

type AnalysisSource = "idle" | "loading" | "solar" | "sample";

type AnalysisResponse = {
  source: "solar" | "sample";
  model: string | null;
  claims: Claim[];
  notice: string;
};

const steps = ["시작", "경험", "역량 확인", "격차·행동", "GapProof"];

const defaultExperience =
  "항공물류를 전공했고, 집에서 AI 수학과 웹을 공부했습니다. Solar API를 연결해 한국어 상담 MVP인 MindHub를 만들었습니다.";

const initialClaims: Claim[] = [
  {
    id: 1,
    skill: "도메인과 기술을 연결한 문제 정의",
    quote:
      "항공물류 전공에서 배운 흐름을 바탕으로 AI가 상담의 반복 정리를 줄일 수 있다고 판단했다.",
    source: "학교·프로젝트",
    tier: 0,
    confidence: "확인 필요",
    question: "문제를 확인한 사용자나 상담사가 있었나요?",
    status: "pending",
    link: "",
  },
  {
    id: 2,
    skill: "AI API 기반 서비스 프로토타이핑",
    quote: "Solar API를 연결해 한국어 상담 MVP인 MindHub를 만들었다.",
    source: "프로젝트 링크",
    tier: 0,
    confidence: "확인 필요",
    question: "직접 구현한 범위와 작동 링크를 추가해 주세요.",
    status: "pending",
    link: "",
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
    link: "",
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
  const [experience, setExperience] = useState(defaultExperience);
  const [claims, setClaims] = useState(initialClaims);
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const [passedChecks, setPassedChecks] = useState<Record<string, boolean>>({});
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>("idle");
  const [analysisModel, setAnalysisModel] = useState<string | null>(null);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [selectedAction, setSelectedAction] = useState("project");
  const [notice, setNotice] = useState("");
  const [editingClaimId, setEditingClaimId] = useState<number | null>(null);
  const [editingSkill, setEditingSkill] = useState("");

  const confirmedClaims = useMemo(
    () => claims.filter((claim) => claim.status === "confirmed"),
    [claims],
  );

  const role = useMemo(() => findRole(roleId), [roleId]);

  const gaps = useMemo(
    () =>
      computeGapMap(
        confirmedClaims.map((claim) => ({
          skill: claim.skill,
          quote: claim.quote,
          tier: claim.tier,
        })),
        role,
        passedChecks,
      ),
    [confirmedClaims, role, passedChecks],
  );

  const passedComps = useMemo(
    () => role.competencies.filter((c) => passedChecks[c.id]),
    [role, passedChecks],
  );

  const recommended = useMemo(() => recommendNextActions(gaps, role), [gaps, role]);
  const chosenAction =
    recommended.find((action) => action.id === selectedAction) ?? recommended[0];

  const updateClaim = (id: number, status: ClaimStatus) => {
    setClaims((current) =>
      current.map((claim) => (claim.id === id ? { ...claim, status } : claim)),
    );
  };

  const attachLink = (id: number, link: string) => {
    setClaims((current) =>
      current.map((claim) =>
        claim.id === id ? { ...claim, link, tier: tierFromLink(link) } : claim,
      ),
    );
  };

  const startEditingClaim = (claim: Claim) => {
    setEditingClaimId(claim.id);
    setEditingSkill(claim.skill);
  };

  const saveClaimSkill = (id: number) => {
    const nextSkill = editingSkill.trim().slice(0, 80);
    if (nextSkill.length < 3) {
      setNotice("역량 표현을 3자 이상 적어 주세요.");
      return;
    }
    setClaims((current) =>
      current.map((claim) =>
        claim.id === id ? { ...claim, skill: nextSkill, status: "pending" } : claim,
      ),
    );
    setEditingClaimId(null);
    setEditingSkill("");
    setNotice("역량 표현을 수정했습니다. 원문 근거는 바뀌지 않았으니 다시 확인해 주세요.");
  };

  const moveTo = (next: number) => {
    setNotice("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const analyzeExperience = async () => {
    if (experience.trim().length < 20 || analysisSource === "loading") return;
    setAnalysisSource("loading");
    setAnalysisNotice("");
    setNotice("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ experience: experience.trim() }),
      });
      const data = (await response.json()) as AnalysisResponse & { message?: string };
      if (!response.ok || !Array.isArray(data.claims) || !data.claims.length) {
        throw new Error(data.message || "분석 결과를 만들지 못했습니다.");
      }
      setClaims(data.claims.map((claim) => ({ ...claim, status: "pending", link: "" })));
      setAnalysisSource(data.source);
      setAnalysisModel(data.model);
      setAnalysisNotice(data.notice);
      moveTo(2);
    } catch {
      setClaims(initialClaims);
      setAnalysisSource("sample");
      setAnalysisModel(null);
      setAnalysisNotice("연결 오류로 준비된 샘플 결과를 표시합니다.");
      moveTo(2);
    }
  };

  const startCheck = () => {
    if (!gaps.length) return;
    const comp = role.competencies.find((c) => c.id === gaps[0].id);
    if (!comp) return;
    setQuiz({ compId: comp.id, questions: makeCheck(comp, role).questions, picks: [null, null], attempt: 1, status: "open" });
  };
  const pickAnswer = (qi: number, oi: number) =>
    setQuiz((q) => (q ? { ...q, picks: q.picks.map((p, i) => (i === qi ? oi : p)) } : q));
  const submitCheck = () => {
    if (!quiz) return;
    if (quiz.picks.some((p) => p === null)) {
      setNotice("모든 문항에 답해 주세요.");
      return;
    }
    const ok = quiz.questions.every((qq, i) => quiz.picks[i] === qq.answer);
    if (ok) {
      setPassedChecks((prev) => ({ ...prev, [quiz.compId]: true }));
      setQuiz({ ...quiz, status: "passed" });
      setNotice("학습확인 통과 · 수행 확인(Lv.2)으로 기록했어요.");
    } else if (quiz.attempt >= 3) {
      setQuiz({ ...quiz, status: "locked" });
    } else {
      setQuiz({ ...quiz, attempt: quiz.attempt + 1, picks: [null, null] });
      setNotice("오답이 있어요. 다시 시도해 보세요.");
    }
  };
  const retryCheck = () => setQuiz((q) => (q ? { ...q, attempt: 1, picks: [null, null], status: "open" } : q));
  const closeCheck = () => setQuiz(null);

  const resetDemo = () => {
    setStep(0);
    setStoreConsent(false);
    setAggregateConsent(false);
    setExperience(defaultExperience);
    setClaims(initialClaims);
    setRoleId(ROLES[0].id);
    setPassedChecks({});
    setQuiz(null);
    setAnalysisSource("idle");
    setAnalysisModel(null);
    setAnalysisNotice("");
    setSelectedAction("project");
    setEditingClaimId(null);
    setEditingSkill("");
    setNotice("새 샘플을 준비했습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecords = () => {
    setStep(0);
    setStoreConsent(false);
    setAggregateConsent(false);
    setExperience("");
    setClaims([]);
    setRoleId(ROLES[0].id);
    setPassedChecks({});
    setQuiz(null);
    setAnalysisSource("idle");
    setAnalysisModel(null);
    setAnalysisNotice("");
    setSelectedAction("project");
    setEditingClaimId(null);
    setEditingSkill("");
    setNotice("입력한 경험과 이 화면의 파생 결과를 삭제했습니다.");
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
          <span className={`sample-badge ${analysisSource === "solar" ? "live" : ""}`}><i /> {analysisSource === "solar" ? `Solar 실연결 · ${analysisModel}` : "Solar 샘플 데모"}</span>
          <button className="text-button" onClick={deleteRecords}>기록 삭제</button>
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
              상담사 없이 바로 추천을 받고, 원하면 상담사·기관이 검토와 K-MOOC·직업훈련 연계로 도와줍니다.
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
            <p>키가 연결되면 실제 Solar를 호출하고, 없으면 원문 기반 샘플로 안전하게 전환합니다.</p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={storeConsent}
                onChange={(event) => setStoreConsent(event.target.checked)}
              />
              <span><b>경험 분석에 동의</b><small>분석 요청에만 사용하며 현재 버전은 서버에 원문을 저장하지 않아요.</small></span>
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
          {analysisSource === "loading" ? (
            <div className="skeleton-claims" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((n) => (
                <div className="skeleton-card" key={n}>
                  <div className="skeleton-line short" />
                  <div className="skeleton-line tall" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          ) : (
          <div className="experience-layout">
            <div className="paper-card input-card">
              <label htmlFor="experience"><b>무엇을 배우고, 하고, 만들어 봤나요?</b></label>
              <p className="input-guide">꼭 처음부터 완벽히 정리하지 않아도 괜찮아요. 생각나는 대로 자세히 쓰고, 배우고 싶은 것이 있으면 그 바람도 적어 주세요.</p>
              <textarea id="experience" placeholder="Notion·메모·손글씨 파일·자격증·들은 수업·프로젝트 등 무엇이든 좋아요. 예: 항공물류를 전공했고 집에서 AI를 독학했어요. 데이터 분석을 배우고 싶어요." value={experience} onChange={(event) => setExperience(event.target.value)} />
              <div className="input-meta"><span>개인·가족 실명과 의료정보는 적지 않아도 돼요.</span><b>{experience.length}자</b></div>
              <div className="source-list">
                <button type="button" className="source active">프로젝트</button>
                <button type="button" className="source">수업·강의</button>
                <button type="button" className="source">자격증</button>
                <button type="button" className="source">Notion·메모</button>
                <button type="button" className="source">손글씨 파일</button>
                <button type="button" className="source">일·아르바이트</button>
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
          )}
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(0)}>이전</button>
            <button className="primary" disabled={experience.trim().length < 20 || analysisSource === "loading"} onClick={analyzeExperience}>
              {analysisSource === "loading" ? <><span className="spinner" />역량 후보를 찾는 중…</> : "Solar로 역량 후보 찾기"} <span>→</span>
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
            <b>{analysisSource === "solar" ? `Solar ${analysisModel} 분석 완료` : "안전한 샘플 분석 완료"}</b>
            <span>{analysisNotice} 과장되거나 맥락이 다른 후보는 거절하세요. 거절한 항목은 카드와 추천에서 빠집니다.</span>
          </div>
          <div className="claims">
            {claims.map((claim) => (
              <article key={claim.id} className={`claim-card ${claim.status}`}>
                <div className="claim-top">
                  <span className={`confidence ${claim.confidence === "높음" ? "high" : "low"}`}>{claim.confidence}</span>
                  <TierBadge tier={claim.tier} />
                </div>
                {editingClaimId === claim.id ? (
                  <div className="claim-editor">
                    <label htmlFor={`claim-skill-${claim.id}`}>역량 표현 수정</label>
                    <input id={`claim-skill-${claim.id}`} value={editingSkill} maxLength={80} onChange={(event) => setEditingSkill(event.target.value)} />
                    <small>원문 인용은 증거이므로 수정하지 않습니다.</small>
                    <div><button onClick={() => { setEditingClaimId(null); setEditingSkill(""); }}>취소</button><button className="save" onClick={() => saveClaimSkill(claim.id)}>저장</button></div>
                  </div>
                ) : <h2>{claim.skill}</h2>}
                <blockquote>“{claim.quote}”</blockquote>
                <div className="claim-source"><span>출처</span><b>{claim.source}</b></div>
                <div className="evidence-link">
                  <label htmlFor={`claim-link-${claim.id}`}>근거 링크 (선택)</label>
                  <input id={`claim-link-${claim.id}`} value={claim.link ?? ""} placeholder="GitHub·수료증·노트 URL" onChange={(event) => attachLink(claim.id, event.target.value)} />
                  <small>{claim.link ? "링크 연결됨 → 증거등급 Lv.1 근거 연결" : "링크가 없으면 Lv.0 자기기록으로 시작해요"}</small>
                </div>
                <p className="follow-up"><b>더 확인하면 좋은 것</b>{claim.question}</p>
                <div className="claim-actions">
                  <button className={claim.status === "rejected" ? "selected reject" : ""} onClick={() => updateClaim(claim.id, "rejected")}>거절</button>
                  <button onClick={() => startEditingClaim(claim)}>표현 수정</button>
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
            <div className="role-chip"><small>대표 목표직무</small><b>{role.label}</b></div>
          </div>
          <div className="role-select" role="group" aria-label="목표직무 선택">
            {ROLES.map((option) => (
              <button key={option.id} className={roleId === option.id ? "active" : ""} onClick={() => { setRoleId(option.id); setQuiz(null); }}>{option.label}</button>
            ))}
          </div>
          <div className="map-grid">
            <section className="paper-card strengths">
              <div className="card-kicker">확인된 현재 역량</div>
              <h2>이미 출발점이 있어요.</h2>
              {confirmedClaims.length || passedComps.length ? (
                <>
                  {confirmedClaims.map((claim) => (
                    <div className="strength-row" key={claim.id}><span>✓</span><p><b>{claim.skill}</b><small>{claim.quote}</small></p><TierBadge tier={claim.tier} /></div>
                  ))}
                  {passedComps.map((c) => (
                    <div className="strength-row" key={c.id}><span>✓</span><p><b>{c.label}</b><small>학습확인 통과 · 수행 확인</small></p><TierBadge tier={2} /></div>
                  ))}
                </>
              ) : <p>확인된 역량이 없습니다.</p>}
            </section>
            <section className="paper-card gaps">
              <div className="card-kicker coral">우선 격차</div>
              <h2>더 필요한 것은 이만큼이에요.</h2>
              {gaps.length ? gaps.slice(0, 3).map((gap) => (
                <div className="gap-row" key={gap.id}>
                  <div><b>{gap.label}</b><small>필요 증거: {gap.proof} · Lv.{gap.current}/{gap.required}</small></div>
                  <div className="bar"><i style={{ width: `${gap.percent}%` }} /></div>
                  <strong>{gap.score}</strong>
                </div>
              )) : <p>선택한 직무의 필수 역량을 이미 확인했어요. 다른 직무로 바꿔 격차를 확인해 보세요.</p>}
            </section>
          </div>
          <div className="action-section">
            <div className="action-title"><div><span className="eyebrow">격차를 낮추는 행동</span><h2>이번 주에는 하나만 선택해요.</h2></div><p>중요도 × 격차 × 실행가능성 순으로 골랐어요.</p></div>
            <div className="action-grid">
              {recommended.map((action) => (
                <button key={action.id} className={`action-card ${selectedAction === action.id ? "selected" : ""}`} onClick={() => setSelectedAction(action.id)}>
                  <span className="action-type">{action.type}</span>
                  <h3>{action.title}</h3>
                  <p>{action.rule}</p>
                  <div><b>{action.time}</b><span>{selectedAction === action.id ? "✓ 선택됨" : "선택하기"}</span></div>
                </button>
              ))}
            </div>
          </div>
          {(() => {
            if (quiz) {
              const comp = role.competencies.find((c) => c.id === quiz.compId);
              const label = comp?.label ?? "";
              if (quiz.status === "passed") return (
                <div className="check-panel"><div className="card-kicker">학습확인 통과</div><h3>‘{label}’ 수행 확인 완료</h3><div className="check-result pass">Lv.2 수행 확인으로 기록했어요. 위 격차 지도에서 이 역량이 닫힌 것을 확인하세요.</div><div className="check-actions">{gaps.length ? <button className="check-cta" onClick={startCheck}>다음 격차 확인 →</button> : <span className="check-done">✓ 남은 우선 격차 없음</span>}<button className="secondary" onClick={closeCheck}>닫기</button></div></div>
              );
              if (quiz.status === "locked") return (
                <div className="check-panel"><div className="card-kicker coral">추가 학습 필요</div><h3>‘{label}’ 3회 미통과</h3><div className="check-result fail">등급을 올리지 않았어요. 추천 학습을 완료한 뒤 다시 확인해 주세요.</div><div className="check-actions"><button className="check-cta" onClick={retryCheck}>다시 시도</button><button className="secondary" onClick={closeCheck}>닫기</button></div></div>
              );
              return (
                <div className="check-panel"><div className="card-kicker">학습확인 · 통과 시 Lv.2 수행 확인</div><h3>‘{label}’ 이해도 확인</h3><p>2문항 · 최대 3회. 통과하면 이 역량의 격차가 닫혀요.</p>
                  {quiz.questions.map((qq, qi) => (
                    <div className="check-q" key={qi}><p>Q{qi + 1}. {qq.q}</p><div className="check-opts">{qq.options.map((op, oi) => (<button key={oi} className={`check-opt ${quiz.picks[qi] === oi ? "picked" : ""}`} onClick={() => pickAnswer(qi, oi)}>{op}</button>))}</div></div>
                  ))}
                  <div className="check-actions"><span className="attempts">시도 {quiz.attempt}/3</span><button className="check-cta" onClick={submitCheck}>제출</button><button className="secondary" onClick={closeCheck}>취소</button></div>
                </div>
              );
            }
            if (!gaps.length) return null;
            return (
              <div className="check-panel"><div className="card-kicker">학습확인 (선택)</div><h3>‘{gaps[0].label}’ 30초 이해도 확인</h3><p>추천 학습을 이해했는지 2문항으로 확인하고, 통과하면 수행 확인(Lv.2)으로 기록해요.</p><div className="check-actions"><button className="check-cta" onClick={startCheck}>학습확인 시작 →</button></div></div>
            );
          })()}
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(2)}>이전</button>
            <button className="primary" onClick={() => moveTo(4)}>GapProof 만들기 <span>→</span></button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="page-shell flow-page proof-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 4 · 증거에서 행동까지</span><h1>설명이 아니라, 바로 실행할 다음 걸음이 생겼어요.</h1></div>
            <span className="complete-badge">✓ 샘플 여정 완료</span>
          </div>
          <p className="selfserve-note">상담사 없이도 위 카드와 추천만으로 바로 시작할 수 있어요. Gap Brief는 원할 때 상담사·기관의 검증과 K-MOOC·직업훈련 연계를 위한 <b>선택</b> 자료예요.</p>
          <div className="proof-grid">
            <article className="proof-card personal-proof">
              <div className="proof-header"><div><span className="brand-mark small">G</span><b>GapProof</b></div><span>개인용 증거카드</span></div>
              <div className="identity"><small>목표직무</small><h2>{role.label}</h2><p>{role.blurb}</p></div>
              <div className="proof-block"><span>확인된 역량</span>{confirmedClaims.map((claim) => <div className="proof-skill" key={claim.id}><b>{claim.skill}</b><TierBadge tier={claim.tier} /></div>)}{passedComps.map((c) => <div className="proof-skill" key={c.id}><b>{c.label} · 수행 확인</b><TierBadge tier={2} /></div>)}</div>
              <div className="proof-block quote-block"><span>대표 근거</span><blockquote>“{confirmedClaims[0]?.quote ?? "확인된 근거를 추가해 주세요."}”</blockquote></div>
              <div className="chosen-action"><span>이번 주 다음 행동</span><b>{chosenAction?.title}</b><small>{chosenAction?.rule}</small></div>
              <footer><span>{analysisSource === "solar" ? `Solar ${analysisModel}` : "샘플 규칙"} 제안 → 사용자 확인 완료</span><b>2026.07.22</b></footer>
            </article>

            <article className="proof-card counselor-proof">
              <div className="proof-header"><div><span className="brief-mark">1P</span><b>Gap Brief</b></div><span>선택 · 상담사·기관 검증용</span></div>
              <div className="brief-section"><span>상담 목표</span><h2>과거 설명보다 다음 행동 합의에 시간을 씁니다.</h2></div>
              <div className="brief-columns">
                <div><span>현재 강점</span><ul>{confirmedClaims.map((claim) => <li key={claim.id}>{claim.skill}</li>)}</ul></div>
                <div><span>우선 격차</span><ul>{gaps.slice(0, 3).map((gap) => <li key={gap.id}>{gap.label} (Lv.{gap.current}/{gap.required})</li>)}</ul></div>
              </div>
              <div className="brief-section questions"><span>다음 상담 질문</span><ol>{confirmedClaims.slice(0, 2).map((claim) => <li key={claim.id}>{claim.question}</li>)}<li>이 행동을 끝냈다고 판단할 증거는 무엇인가요?</li></ol></div>
              <div className="privacy-note"><b>기관 공유 범위</b><p>{aggregateConsent ? "익명 격차 항목 공유에 동의 · 개인 원문 제외" : "익명 통계 공유 안 함 · 개인 카드만 사용"}</p></div>
              <footer><span>상담 보조자료 · 자동판정 아님</span><b>검토 필요</b></footer>
            </article>
          </div>
          <div className="story-callout"><span>GapProof의 약속</span><p>“미래를 예측해 주는 AI가 아니라, 불확실한 미래에도 다시 움직일 수 있게 하는 AI.”</p></div>
          <div className="footer-actions final-actions">
            <button className="secondary" onClick={() => moveTo(3)}>행동 다시 고르기</button>
            <button className="secondary" onClick={() => window.print()}>PDF로 저장 · 인쇄</button>
            <button className="primary" onClick={resetDemo}>새 샘플 시작 <span>↻</span></button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <p>{analysisSource === "solar" ? "Solar 실연결" : "샘플 데이터"} · 취업 또는 적성 판정이 아닙니다</p>
      </footer>
    </main>
  );
}
