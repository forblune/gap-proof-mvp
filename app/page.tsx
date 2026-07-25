"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROLES,
  findRole,
  computeGapMap,
  recommendNextActions,
  tierFromLink,
  makeCheck,
} from "./lib/engine";
import { DEFAULT_MODEL_ID, SOLAR_MODELS } from "./lib/models";
import BrandGlyph from "./components/brand-mark";

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

type NoticeKind = "success" | "error" | "info";
type Notice = { text: string; kind: NoticeKind };

// 카드 생성 시점의 날짜. 개인용 카드이므로 기기(사용자 로컬) 시간 기준으로 표기한다.
function formatProofDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

type AnalysisResponse = {
  source: "solar" | "sample";
  model: string | null;
  claims: Claim[];
  notice: string;
};

const steps = ["시작", "경험", "역량 확인", "격차·행동", "GapProof"];

// 공유 문구는 상수로 고정 — 사용자의 경험 입력·분석 결과를 절대 포함하지 않는다.
const SHARE_TEXT = "공백·전환 경험을 역량 증거와 이번 주 행동으로 — GapProof 데모";

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
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [selectedAction, setSelectedAction] = useState("project");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingClaimId, setEditingClaimId] = useState<number | null>(null);
  const [editingSkill, setEditingSkill] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [proofDate, setProofDate] = useState<string | null>(null);
  // 전체 데모 진입 게이트: 인증 전에는 메인 5단계 흐름을 렌더하지 않는다.
  const [gateOpen, setGateOpen] = useState(false);
  const [gateCode, setGateCode] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const proofHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const showNotice = (text: string, kind: NoticeKind = "info") => setNotice({ text, kind });

  // 세션 쿠키는 HttpOnly라 클라이언트가 읽을 수 없으므로 서버에 상태를 물어본다(새로고침 후 세션 유지).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate")
      .then((response) => response.json())
      .then((data: { authorized?: boolean }) => {
        if (!cancelled) setGateOpen(Boolean(data.authorized));
      })
      .catch(() => {
        if (!cancelled) setGateOpen(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // STEP 4 도착 시 결과 제목으로 포커스 이동(스크린리더·키보드 사용자 안내)
  useEffect(() => {
    if (step === 4) proofHeadingRef.current?.focus();
  }, [step]);

  // 카카오 공유 준비: STEP 4에서 키가 구성된 경우에만 SDK를 로드한다.
  // 키는 저장소에 없고 서버 환경변수(KAKAO_JS_KEY)에서만 온다. 없으면 버튼 미표시.
  useEffect(() => {
    if (step !== 4 || kakaoReady) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/share-config");
        const { kakaoJsKey } = (await response.json()) as { kakaoJsKey?: string | null };
        if (!kakaoJsKey || cancelled) return;
        const holder = window as unknown as { Kakao?: { isInitialized(): boolean; init(key: string): void } };
        if (!holder.Kakao) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("kakao_sdk_load_failed"));
            document.head.appendChild(script);
          });
        }
        if (cancelled || !holder.Kakao) return;
        if (!holder.Kakao.isInitialized()) holder.Kakao.init(kakaoJsKey);
        setKakaoReady(true);
      } catch {
        // 키 미구성·SDK 로드 실패 — 카카오 버튼을 표시하지 않는다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, kakaoReady]);

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
      showNotice("역량 표현을 3자 이상 적어 주세요.", "error");
      return;
    }
    setClaims((current) =>
      current.map((claim) =>
        claim.id === id ? { ...claim, skill: nextSkill, status: "pending" } : claim,
      ),
    );
    setEditingClaimId(null);
    setEditingSkill("");
    showNotice("역량 표현을 수정했습니다. 원문 근거는 바뀌지 않았으니 다시 확인해 주세요.", "success");
  };

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const moveTo = (next: number) => {
    setNotice(null);
    setStep(next);
    scrollToTop();
  };

  const analyzeExperience = async () => {
    if (experience.trim().length < 20 || analysisSource === "loading") return;
    setAnalysisSource("loading");
    setAnalysisNotice("");
    setNotice(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ experience: experience.trim(), model: modelId }),
      });
      const data = (await response.json()) as AnalysisResponse & { message?: string };
      if (response.status === 401) {
        // 세션 없음·만료: 입력·단계는 유지한 채 게이트 화면으로 전환한다(재인증 후 그 자리로 복귀).
        setAnalysisSource("idle");
        setGateOpen(false);
        showNotice(data.message || "접근 코드 확인이 필요해요. 코드를 다시 입력해 주세요.", "error");
        scrollToTop();
        return;
      }
      if (!response.ok) {
        // 400·413 등 입력 오류: 서버가 준 사용자용 메시지를 그대로 보여주고,
        // 입력을 유지한 채 현재 단계에 머문다. 샘플 결과로 대체하지 않는다.
        setAnalysisSource("idle");
        showNotice(data.message || "요청을 처리하지 못했어요. 입력을 확인한 뒤 다시 시도해 주세요.", "error");
        return;
      }
      if (!Array.isArray(data.claims) || !data.claims.length) {
        throw new Error("empty_claims");
      }
      setClaims(data.claims.map((claim) => ({ ...claim, status: "pending", link: "" })));
      setAnalysisSource(data.source);
      setAnalysisModel(data.model);
      setAnalysisNotice(data.notice);
      moveTo(2);
    } catch {
      // 네트워크·서버 장애: 입력과 단계를 유지하고 재시도를 안내한다.
      // 사용자 입력과 무관한 정적 샘플로 대체하지 않는다(샘플 폴백은 서버가 원문 기반으로 제공).
      setAnalysisSource("idle");
      showNotice("연결 오류로 분석하지 못했어요. 입력은 그대로 남아 있으니 잠시 후 같은 버튼으로 다시 시도해 주세요.", "error");
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
      showNotice("모든 문항에 답해 주세요.", "error");
      return;
    }
    const ok = quiz.questions.every((qq, i) => quiz.picks[i] === qq.answer);
    if (ok) {
      setPassedChecks((prev) => ({ ...prev, [quiz.compId]: true }));
      setQuiz({ ...quiz, status: "passed" });
      showNotice("학습확인 통과 · 수행 확인(Lv.2)으로 기록했어요.", "success");
    } else if (quiz.attempt >= 3) {
      setQuiz({ ...quiz, status: "locked" });
    } else {
      setQuiz({ ...quiz, attempt: quiz.attempt + 1, picks: [null, null] });
      showNotice("오답이 있어요. 다시 시도해 보세요.", "error");
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
    setProofDate(null);
    setConfirmingDelete(false);
    setModelId(DEFAULT_MODEL_ID);
    showNotice("새 샘플을 준비했습니다.", "info");
    scrollToTop();
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
    setProofDate(null);
    setConfirmingDelete(false);
    setModelId(DEFAULT_MODEL_ID);
    showNotice("입력한 경험과 이 화면의 파생 결과를 삭제했습니다.", "success");
    scrollToTop();
  };

  const submitGateCode = async () => {
    const code = gateCode.trim();
    if (!code || gateBusy) return;
    setGateBusy(true);
    try {
      const response = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as { authorized?: boolean; message?: string };
      if (!response.ok) {
        showNotice(data.message || "접근 코드를 확인하지 못했어요. 다시 시도해 주세요.", "error");
        return;
      }
      setNotice(null);
      setGateOpen(true);
      setGateCode("");
      scrollToTop();
    } catch {
      showNotice("연결 오류로 접근 코드를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setGateBusy(false);
    }
  };

  // 데모 잠금(로그아웃): 서버 쿠키 만료 + 게이트 화면 복귀 (입력 데이터는 유지)
  const lockDemo = async () => {
    try {
      await fetch("/api/gate", { method: "DELETE" });
    } catch {
      // 네트워크 실패여도 화면은 잠근다(쿠키는 만료 시 자동 무효)
    }
    setGateOpen(false);
    setGateCode("");
    showNotice("데모를 잠갔어요. 다시 보려면 접근 코드를 입력해 주세요.", "info");
    scrollToTop();
  };

  const shareUrl = () => window.location.origin;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      showNotice("링크를 복사했어요. 어디든 붙여넣어 공유할 수 있어요.", "success");
    } catch {
      showNotice("복사 권한이 없어 링크를 복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.", "error");
    }
  };

  const shareViaSystem = async () => {
    // 공유에는 서비스 소개와 링크만 담는다 — 사용자의 경험 원문·분석 결과는 포함하지 않는다.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "GapProof", text: SHARE_TEXT, url: shareUrl() });
      } catch {
        // 사용자가 공유를 취소한 경우 등 — 조용히 종료
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl());
      showNotice("이 브라우저는 바로 공유를 지원하지 않아 링크를 복사했어요.", "info");
    } catch {
      showNotice("공유를 지원하지 않는 브라우저예요. 주소창의 주소를 복사해 주세요.", "error");
    }
  };

  const shareViaKakao = () => {
    const holder = window as unknown as { Kakao?: { Share?: { sendDefault(options: object): void } } };
    if (!holder.Kakao?.Share) return;
    const url = shareUrl();
    holder.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: "GapProof | 공백을 증거로",
        description: SHARE_TEXT,
        imageUrl: `${url}/og.png`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: "데모 열어보기", link: { mobileWebUrl: url, webUrl: url } }],
    });
  };

  const requestDelete = () => setConfirmingDelete(true);
  const cancelDelete = () => {
    setConfirmingDelete(false);
    deleteButtonRef.current?.focus();
  };
  const confirmDelete = () => {
    setConfirmingDelete(false);
    deleteRecords();
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GapProof 처음으로">
          <span className="brand-mark"><BrandGlyph /></span>
          <span>GapProof</span>
        </a>
        {gateOpen && (
          <div className="top-actions">
            <select
              className="model-select"
              aria-label="Solar 모델 선택"
              title={SOLAR_MODELS.find((option) => option.id === modelId)?.description}
              value={modelId}
              disabled={analysisSource === "loading"}
              onChange={(event) => setModelId(event.target.value)}
            >
              {SOLAR_MODELS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}{option.id === DEFAULT_MODEL_ID ? " (기본)" : ""}
                </option>
              ))}
            </select>
            <span
              className={`sample-badge ${analysisSource === "solar" ? "live" : ""}`}
              aria-label={analysisSource === "solar" ? `Solar 실연결 · ${analysisModel}` : "Solar 샘플 데모"}
            ><i /> <span className="sample-badge-text">{analysisSource === "solar" ? `Solar 실연결 · ${analysisModel}` : "Solar 샘플 데모"}</span></span>
            <button className="text-button" ref={deleteButtonRef} onClick={requestDelete}>기록 삭제</button>
          </div>
        )}
      </header>

      {gateOpen && (
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
      )}

      {notice && (
        <div className={`notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.kind === "error" && <strong>오류</strong>}
          {notice.text}
        </div>
      )}

      {confirmingDelete && (
        <div
          className="confirm-bar"
          role="alertdialog"
          aria-label="기록 삭제 확인"
          onKeyDown={(event) => { if (event.key === "Escape") cancelDelete(); }}
        >
          <p>입력한 경험과 이 화면의 모든 결과가 삭제됩니다. 삭제할까요?</p>
          <div>
            <button autoFocus onClick={cancelDelete}>취소</button>
            <button className="danger" onClick={confirmDelete}>삭제</button>
          </div>
        </div>
      )}

      {!gateOpen && (
        <section className="page-shell gate-page" aria-label="데모 접근 코드 확인">
          <div className="gate-card">
            <div className="gate-brand"><span className="brand-mark"><BrandGlyph /></span><b>GapProof</b></div>
            <div className="card-kicker">데모 접근 확인</div>
            <h1>접근 코드를 입력해 주세요.</h1>
            <p className="gate-guide">
              공백·전환 경험을 역량 증거와 이번 주 행동으로 바꾸는 <b>Solar 기반 진로 탐색 데모</b>예요.
              심사·멘토링 공유용 <b>데모 접근 코드</b>가 필요하며, 계정 로그인이나 개인 비밀번호가 아니에요.
              코드는 안내받은 채널에서 확인할 수 있어요.
            </p>
            <label htmlFor="gate-code">접근 코드</label>
            <input
              id="gate-code"
              type="password"
              autoComplete="one-time-code"
              maxLength={64}
              value={gateCode}
              autoFocus
              onChange={(event) => setGateCode(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") submitGateCode(); }}
            />
            <small className="gate-hint">GapProof는 취업 가능성이나 적성을 판정하지 않아요.</small>
            <div className="gate-actions">
              <button className="primary" disabled={!gateCode.trim() || gateBusy} onClick={submitGateCode}>
                {gateBusy ? "확인 중…" : "데모 열기"}
              </button>
            </div>
            <nav className="gate-links" aria-label="서비스 소개 페이지">
              <a href="/about">소개</a>
              <a href="/guide">이용 가이드</a>
              <a href="/how-it-works">작동 원리</a>
              <a href="/technology">기술과 검증</a>
            </nav>
          </div>
        </section>
      )}

      {gateOpen && step === 0 && (
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

      {gateOpen && step === 1 && (
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
              <textarea id="experience" maxLength={3000} placeholder="Notion·메모·손글씨 파일·자격증·들은 수업·프로젝트 등 무엇이든 좋아요. 예: 항공물류를 전공했고 집에서 AI를 독학했어요. 데이터 분석을 배우고 싶어요." value={experience} onChange={(event) => setExperience(event.target.value)} />
              <div className="input-meta"><span>개인·가족 실명과 의료정보는 적지 않아도 돼요.</span><b>{experience.length.toLocaleString()}자 / 최소 20자 · 최대 3,000자</b></div>
              {experience.trim().length < 20 && (
                <p className="length-hint" role="status">앞뒤 공백을 뺀 20자 이상 적으면 ‘Solar로 역량 후보 찾기’ 버튼이 켜져요.</p>
              )}
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

      {gateOpen && step === 2 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 2 · 사용자 확인</span><h1>AI의 제안보다 당신의 확인이 먼저예요.</h1></div>
            <div className="legend"><i /> 입력 문장을 근거로 인용해요 · 개인정보가 감지되면 가려서 표시돼요</div>
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

      {gateOpen && step === 3 && (
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
          {confirmedClaims.length === 0 && passedComps.length === 0 && (
            <div className="zero-note" role="status">아직 확인된 역량이 없어요. ‘이전’으로 돌아가 후보를 최소 1개 확인하거나, 경험 단계에서 내용을 보강한 뒤 다시 분석해 주세요.</div>
          )}
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(2)}>이전</button>
            <button
              className="primary"
              disabled={confirmedClaims.length === 0 && passedComps.length === 0}
              onClick={() => { setProofDate(formatProofDate(new Date())); moveTo(4); }}
            >
              GapProof 만들기 <span>→</span>
            </button>
          </div>
        </section>
      )}

      {gateOpen && step === 4 && (
        <section className="page-shell flow-page proof-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 4 · 증거에서 행동까지</span><h1 ref={proofHeadingRef} tabIndex={-1}>설명이 아니라, 바로 실행할 다음 걸음이 생겼어요.</h1></div>
            <span className="complete-badge">✓ 샘플 여정 완료</span>
          </div>
          <p className="selfserve-note">상담사 없이도 위 카드와 추천만으로 바로 시작할 수 있어요. Gap Brief는 원할 때 상담사·기관의 검증과 K-MOOC·직업훈련 연계를 위한 <b>선택</b> 자료예요.</p>
          <div className="proof-grid">
            <article className="proof-card personal-proof">
              <div className="proof-header"><div><span className="brand-mark small"><BrandGlyph /></span><b>GapProof</b></div><span>개인용 증거카드</span></div>
              <div className="identity"><small>목표직무</small><h2>{role.label}</h2><p>{role.blurb}</p></div>
              <div className="proof-block"><span>확인된 역량</span>{confirmedClaims.map((claim) => <div className="proof-skill" key={claim.id}><b>{claim.skill}</b><TierBadge tier={claim.tier} /></div>)}{passedComps.map((c) => <div className="proof-skill" key={c.id}><b>{c.label} · 수행 확인</b><TierBadge tier={2} /></div>)}</div>
              <div className="proof-block quote-block"><span>대표 근거</span><blockquote>“{confirmedClaims[0]?.quote ?? "확인된 근거를 추가해 주세요."}”</blockquote></div>
              <div className="chosen-action"><span>이번 주 다음 행동</span><b>{chosenAction?.title}</b><small>{chosenAction?.rule}</small></div>
              <footer><span>{analysisSource === "solar" ? `Solar ${analysisModel}` : "샘플 규칙"} 제안 → 사용자 확인 완료</span><b>{proofDate}</b></footer>
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
            <button className="secondary" onClick={copyShareLink}>링크 복사</button>
            <button className="secondary" onClick={shareViaSystem}>공유하기</button>
            {kakaoReady && (
              <button className="secondary kakao-share" onClick={shareViaKakao}>카카오톡 공유</button>
            )}
            <button className="secondary" onClick={() => window.print()}>PDF로 저장 · 인쇄</button>
            <button className="primary" onClick={resetDemo}>새 샘플 시작 <span>↻</span></button>
          </div>
          <p className="share-note">링크 공유에는 서비스 소개만 담겨요 — 내 경험 입력과 결과는 포함되지 않아요.</p>
        </section>
      )}

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <nav className="footer-nav" aria-label="정보 페이지">
          <a href="/about">소개</a>
          <a href="/guide">이용 가이드</a>
          <a href="/how-it-works">작동 원리</a>
          <a href="/technology">기술과 검증</a>
        </nav>
        <p>{analysisSource === "solar" ? "Solar 실연결" : "샘플 데이터"} · 취업 또는 적성 판정이 아닙니다</p>
        {gateOpen && (
          <button className="text-button" onClick={lockDemo}>데모 잠금</button>
        )}
      </footer>
    </main>
  );
}
