"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROLES,
  findRole,
  computeGapMap,
  recommendNextActions,
  tierFromLink,
  makeCheck,
  hasConfirmedEvidenceFor,
} from "../lib/engine";
import { DEFAULT_MODEL_ID, SOLAR_MODELS, findModel } from "../lib/models";
import { buildLookIntoItResources } from "../lib/resources";
import type { YoutubeLesson } from "../lib/youtube-lesson";
import { LESSON_QUESTION_LABELS, parseYoutubeUrl } from "../lib/youtube-lesson";
import {
  CERTIFICATE_DISCLAIMER,
  CERTIFICATE_ISSUER,
  CERTIFICATE_USAGE_NOTE,
  CERTIFICATE_KINDS,
  RECOGNITION_GROUPS,
  RECOGNITION_KINDS,
  MIN_ANSWER_CHARS,
  canIssueLearningCertificate,
  canIssuePerformanceCertificate,
  certificateScope,
  certificateSerial,
  countAnswered,
  evidenceCoverage,
  isAnsweredEnough,
  maxTierFromRecord,
  recognitionKindsFor,
  type CertificateKindId,
  type LearningRecord,
} from "../lib/recognition";
import { clearDraft, loadDraft, saveDraft, type DraftClaim } from "../lib/draft";
import { LONG_EXAMPLES, SAMPLE_JOURNEY } from "../lib/samples";
import { AI_ORGANIZE_PROMPT, previewText, validateImportFile } from "../lib/import-file";
import { IconCheck, IconQuestion, IconWarning, IconCompass, IconChecklist } from "../components/fact-icons";
import BrandGlyph from "../components/brand-mark";
import MobileActionsMenu from "../components/mobile-actions-menu";
import ThemeToggle from "../components/theme-toggle";

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
  // Gate 4(#40) V2 — 전부 선택: 없으면 렌더하지 않는다(샘플·구버전 호환)
  factStatus?: "확인됨" | "부분 확인" | "계획·관심";
  context?: string;
  behaviors?: string[];
  signals?: ("반복" | "책임" | "문제 해결" | "몰입")[];
  evidenceStrength?: "강함" | "보통" | "약함";
  overclaimRisk?: string | null;
  jobHypotheses?: { title: string; reason: string; missing: string }[];
  smallStep?: string;
};

type Quiz = {
  compId: string;
  questions: { q: string; options: string[]; answer: number }[];
  picks: (number | null)[];
  attempt: number;
  status: "open" | "passed" | "locked";
};

type AnalysisSource = "idle" | "loading" | "solar" | "sample";

// 발급된 문서 — 화면·인쇄본에 그대로 쓰인다. 발급 조건은 recognition.ts가 판정한다.
type IssuedCertificate = {
  kind: CertificateKindId;
  serial: string;
  issuedAt: string;
  competencyLabel: string;
  sourceTitle: string;
  scope: string;
  artifactUrl?: string;
};

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

const steps = ["시작", "경험", "역량 확인", "먼저 알아보기", "격차·행동", "GapProof"];

// 개인화할 결과가 없을 때의 대체 공유 문구 — buildResultShareText()도 프리셋 값(목표직무명·개수·행동명)만
// 사용하며, 사용자의 경험 원문·역량 설명·근거·인용문은 절대 포함하지 않는다.
const SHARE_TEXT = "공백·전환 경험을 역량 증거와 이번 주 행동으로 — GapProof 데모";

// 증거등급은 "무엇이 확인됐는가"이지 숙련도가 아니다.
// 숫자만 홀로 두면 실력 점수로 읽힌다 — 확인된 사실을 늘 함께 붙인다.
// (벤치마킹: Open Badges 3.0 은 achievedLevel 을 발급기관 루브릭이 있을 때만 쓴다)
const TIER_LABELS = ["자기기록", "근거 연결", "수행 확인", "기관 확인"];
const TIER_MEANS = [
  "사용자가 원문에서 확인한 내용입니다.",
  "확인 가능한 링크가 연결됐습니다.",
  "실제 수행이나 산출물이 확인됐습니다.",
  "지정 기관이 확인했습니다.",
];

function TierBadge({ tier }: { tier: number }) {
  return (
    <span className={`tier tier-${tier}`}>
      <b>Lv.{tier}</b> {TIER_LABELS[tier]}
      <small className="tier-means">{TIER_MEANS[tier]}</small>
      <small className="sr-only"> 숙련도 점수가 아닙니다.</small>
    </span>
  );
}

// 목표직무 선택 — STEP3(자료를 보기 전)·STEP4(격차 비교) 두 곳에서 동일한 roleId를 공유한다.
// 상호 배타적으로 하나만 마운트되므로 radio name 충돌은 없다. role="radiogroup"+radio로 구성해
// "3개 중 1개 선택됨" 상태를 스크린리더가 안정적으로 announce하도록 한다(색상만으로 전달하지 않음).
function RoleSelect({ roleId, onSelect }: { roleId: string; onSelect: (id: string) => void }) {
  return (
    <div className="role-select" role="radiogroup" aria-label="목표직무 선택">
      {ROLES.map((option) => (
        <label key={option.id} className={`role-card ${roleId === option.id ? "selected" : ""}`}>
          <input
            type="radio"
            name="target-role"
            value={option.id}
            checked={roleId === option.id}
            onChange={() => onSelect(option.id)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [storeConsent, setStoreConsent] = useState(false);
  const [aggregateConsent, setAggregateConsent] = useState(false);
  const [experience, setExperience] = useState(""); // Gate 3(#39): 기본 예시 주입 제거 — 예시는 표시 전용
  const [claims, setClaims] = useState<Claim[]>([]);
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
  // Gate 2b(#37): 코드 없는 샘플 체험 — 실제 Solar 호출 없이 전체 흐름을 보여준다.
  const [sampleMode, setSampleMode] = useState(false);
  const [gateCode, setGateCode] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  // Gate 5(#41): 모델 선택 다이얼로그(네이티브 <dialog> — focus trap·Esc 기본 제공)
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [pendingModelId, setPendingModelId] = useState(modelId);
  // 영상 학습(Gemini) — 학습 자료·질문 응답·수행 기록·산출물. 인정 상한은 recognition.ts가 정한다.
  const [lessonUrl, setLessonUrl] = useState("");
  const [lesson, setLesson] = useState<YoutubeLesson | null>(null);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonAnswers, setLessonAnswers] = useState<string[]>([]);
  // 자료를 끝까지 봤는지는 시스템이 측정할 수 없다 — 본인이 표시한 값으로만 다룬다.
  const [sourceCompleted, setSourceCompleted] = useState(false);
  // 저장된 작성 내용을 불러왔다는 사실과 저장 시각. 복원했다는 것을 사용자가 알아야
  // 자기가 쓰지 않은 내용이 보인다고 오해하지 않고, 지우고 새로 시작할지 고를 수 있다.
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [lessonEditing, setLessonEditing] = useState(false);
  const [performanceNote, setPerformanceNote] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [issuedCert, setIssuedCert] = useState<IssuedCertificate | null>(null);
  const modelDialogRef = useRef<HTMLDialogElement | null>(null);
  const modelButtonRef = useRef<HTMLButtonElement | null>(null);
  // Gate 6(#42): 파일 가져오기 — 브라우저 안에서 텍스트로만 읽는다(업로드·저장 없음)
  const [importPreview, setImportPreview] = useState<{ name: string; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const proofHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const lookIntoHeadingRef = useRef<HTMLHeadingElement | null>(null);
  // Gate 1(#35): draft 저장은 사용자 상호작용(첫 상태 변화) 이후부터 시작한다.
  // 마운트 직후 기본값을 저장해 기존 draft를 덮어쓰지 않기 위한 가드.
  const draftSaveArmed = useRef(false);
  // localStorage를 쓸 수 없을 때만 사용하는 이 탭 한정 발급 대상 식별자.
  const sessionOwnerKey = useRef<string | null>(null);

  const showNotice = (text: string, kind: NoticeKind = "info") => setNotice({ text, kind });

  // Gate 5(#41): 모델 다이얼로그 — 열 때 history state를 쌓아 모바일 뒤로가기가 닫기로 동작
  const openModelDialog = () => {
    setPendingModelId(modelId);
    setModelDialogOpen(true);
    try { window.history.pushState({ gpModelDialog: true }, ""); } catch { /* 미지원 환경 무시 */ }
  };
  const closeModelDialog = (viaHistory = false) => {
    setModelDialogOpen(false);
    // 모바일은 헤더의 "모델 변경" 버튼이 display:none이라(hidden 요소는 focus 불가) 액션 메뉴
    // 토글로 대신 복귀한다.
    if (modelButtonRef.current && modelButtonRef.current.offsetParent !== null) {
      modelButtonRef.current.focus();
    } else {
      document.querySelector<HTMLButtonElement>(".actions-toggle")?.focus();
    }
    if (!viaHistory) {
      try { if (window.history.state?.gpModelDialog) window.history.back(); } catch { /* 무시 */ }
    }
  };
  const applyModel = () => {
    setModelId(pendingModelId);
    closeModelDialog();
  };
  useEffect(() => {
    const dialog = modelDialogRef.current;
    if (!dialog) return;
    if (modelDialogOpen && !dialog.open) dialog.showModal();
    if (!modelDialogOpen && dialog.open) dialog.close();
  }, [modelDialogOpen]);
  useEffect(() => {
    const onPop = () => { if (modelDialogOpen) closeModelDialog(true); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [modelDialogOpen]);
  const journeyOpen = gateOpen || sampleMode;
  const experienceLength = experience.length;
  const OVER_LIMIT = experienceLength > 10000;


  // Gate 1(#35): 마지막 진행 상태 복원 — 인앱 브라우저 재시작·세션 만료 후 재인증해도
  // 원래 단계·입력·확인 상태로 복귀한다. draft는 이 기기 localStorage에만 존재한다.
  // SSR 하이드레이션과 초기 HTML을 일치시키기 위해 복원은 반드시 effect에서 1회 수행한다
  // (useState 초기값에서 읽으면 서버·클라 첫 렌더가 달라져 hydration 오류가 난다).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 마운트 1회성 진입 판정·복원(연쇄 렌더 없음) */
    if (new URLSearchParams(window.location.search).get("sample") === "1") {
      setSampleMode(true); // 샘플 체험은 draft를 읽지도 쓰지도 않는다
      setExperience(SAMPLE_JOURNEY.experience); // Gate 3: 기본값 제거 이후에도 샘플은 원문이 채워진 상태로 시작
      return;
    }
    const draft = loadDraft(window.localStorage);
    if (!draft) return;
    // 증거등급 무결성 P0: 예전 버전에서 저장됐거나 손상된 draft가 STEP5(step:5)를 확인된
    // 증거 0개 상태로 가리키면, 복원 즉시(첫 페인트 전) STEP4로 낮춰 잘못된 화면이 잠깐이라도
    // 그려지지 않게 한다(아래 가드 effect는 이후의 상태 변화만 담당).
    const restoredConfirmedCount = ((draft.claims as Claim[]) ?? []).filter(
      (claim) => claim.status === "confirmed",
    ).length;
    setStep(draft.step === 5 && restoredConfirmedCount === 0 ? 4 : draft.step);
    setStoreConsent(draft.storeConsent);
    setAggregateConsent(draft.aggregateConsent);
    setExperience(draft.experience);
    setClaims(draft.claims as Claim[]);
    setRoleId(draft.roleId);
    setPassedChecks(draft.passedChecks);
    setAnalysisSource(draft.analysisSource);
    setAnalysisModel(draft.analysisModel);
    setModelId(draft.modelId);
    setAnalysisNotice(draft.analysisNotice);
    setSelectedAction(draft.selectedAction);
    setProofDate(draft.proofDate);
    // 말없이 되살리지 않는다. 무엇이 복원됐고 무엇이 복원되지 않았는지 알려 준다.
    setRestoredAt(draft.savedAt ?? null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Gate 1(#35): 진행 상태를 draft로 저장. 로딩 상태는 저장하지 않는다.
  useEffect(() => {
    if (!draftSaveArmed.current) {
      draftSaveArmed.current = true; // 마운트 첫 실행(기본값)은 저장하지 않음
      return;
    }
    if (analysisSource === "loading") return;
    if (sampleMode) return; // 샘플 체험은 사용자 작성물이 아니므로 저장하지 않는다
    saveDraft(
      window.localStorage,
      {
        step,
        storeConsent,
        aggregateConsent,
        experience,
        claims: claims as DraftClaim[],
        roleId,
        passedChecks,
        analysisSource,
        analysisModel,
        modelId,
        analysisNotice,
        selectedAction,
        proofDate,
      },
      new Date().toISOString(),
    );
  }, [sampleMode, step, storeConsent, aggregateConsent, experience, claims, roleId, passedChecks, analysisSource, analysisModel, modelId, analysisNotice, selectedAction, proofDate]);

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

  // STEP 5 도착 시 결과 제목으로 포커스 이동(스크린리더·키보드 사용자 안내)
  useEffect(() => {
    if (step === 5) proofHeadingRef.current?.focus();
  }, [step]);

  // STEP 3 도착 시 제목으로 포커스 이동 — 목표직무 선택이 이 단계의 핵심 상호작용이라
  // STEP 5와 동일하게 스크린리더·키보드 사용자에게 진입을 명확히 알린다.
  useEffect(() => {
    if (step === 3) lookIntoHeadingRef.current?.focus();
  }, [step]);

  // 카카오 공유 준비: STEP 5에서 키가 구성된 경우에만 SDK를 로드한다.
  // 키는 저장소에 없고 서버 환경변수(KAKAO_JS_KEY)에서만 온다. 없으면 버튼 미표시.
  useEffect(() => {
    if (step !== 5 || kakaoReady) return;
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
      ),
    [confirmedClaims, role],
  );

  // 학습확인(퀴즈)을 통과한 모든 역량 — "퀴즈를 시도해 봤다"는 사실 자체를 나타낼 뿐,
  // 화면에 "수행 확인"으로 표시해도 되는지는 verifiedPassedComps로 별도 판정한다.
  const passedComps = useMemo(
    () => role.competencies.filter((c) => passedChecks[c.id]),
    [role, passedChecks],
  );

  // 증거등급 무결성 P0: 퀴즈를 통과했고, 이 역량에 매칭되는 확인 증거(원문 인용)가
  // 최소 1개 있는 역량만 "수행 확인(Lv.2)"으로 화면에 표시한다 — engine.ts의
  // competencyStrength와 동일한 hasConfirmedEvidenceFor 기준을 재사용해 계산·표시 로직이
  // 어긋나지 않게 한다.
  const verifiedPassedComps = useMemo(() => {
    const confirmedInputs = confirmedClaims.map((claim) => ({
      skill: claim.skill,
      quote: claim.quote,
      tier: claim.tier,
    }));
    return passedComps
      .filter((c) => hasConfirmedEvidenceFor(c, confirmedInputs))
      .map((c) => ({
        comp: c,
        // 배지 등급을 2로 못박지 않는다. 이 역량에 실제로 연결된 확인 증거의 등급을 그대로 쓴다
        // (링크 없는 자기기록이면 Lv.0). 퀴즈 통과는 "이해 확인"일 뿐 수행이 아니므로
        // 등급을 올리는 근거가 되지 못한다 — recognition.ts의 인정 유형과 같은 규칙이다.
        tier: confirmedInputs
          .filter((claim) => c.keywords.some((k) => `${claim.skill} ${claim.quote}`.includes(k)))
          .reduce((max, claim) => Math.max(max, claim.tier), 0),
      }));
  }, [passedComps, confirmedClaims]);

  const recommended = useMemo(() => recommendNextActions(gaps, role), [gaps, role]);
  const chosenAction =
    recommended.find((action) => action.id === selectedAction) ?? recommended[0];

  // STEP 3 "먼저 알아보기" — 상위 격차 역량(없으면 목표직무의 첫 역량)을 기준으로 검색 링크를 구성한다.
  // 검색어는 이 역량의 카탈로그 라벨(role.competencies[].label)만 사용하고, 사용자의 경험 원문·근거 인용은
  // resources.ts에 절대 넘기지 않는다.
  const lookIntoComp = useMemo(() => {
    const byId = (id: string) => role.competencies.find((comp) => comp.id === id);
    return (gaps[0] && byId(gaps[0].id)) || role.competencies[0];
  }, [gaps, role]);
  // null이면 이 claim 묶음에 AI가 제안한 직업 가설이 없다는 뜻 — 사용자가 선택한 목표직무(role.label)를
  // "AI 가설"인 것처럼 대신 채워 넣지 않는다(두 개념을 섞지 않기 위한 명시적 분리).
  const lookIntoHypothesis = useMemo(() => {
    const withHypothesis = confirmedClaims.find((claim) => claim.jobHypotheses && claim.jobHypotheses.length > 0);
    return withHypothesis?.jobHypotheses?.[0]?.title ?? null;
  }, [confirmedClaims]);
  const lookIntoResources = useMemo(
    () => buildLookIntoItResources(lookIntoComp.label, lookIntoHypothesis, lookIntoComp.project),
    [lookIntoComp, lookIntoHypothesis],
  );

  // 학습 기록 — 발급 조건 판정과 인정 표시가 모두 이 하나의 값을 본다(화면과 규칙이 어긋나지 않게).
  const learningRecord = useMemo<LearningRecord>(
    () => ({
      competencyId: lookIntoComp.id,
      competencyLabel: lookIntoComp.label,
      sourceTitle: lesson?.title ?? "",
      sourceUrl: lesson?.videoUrl,
      requiredQuestionCount: lesson?.questions.length ?? 0,
      answeredQuestionCount: lesson ? countAnswered(lessonAnswers) : 0,
      sourceCompleted: Boolean(lesson) && sourceCompleted,
      understandingChecked: Boolean(passedChecks[lookIntoComp.id]),
      performanceNote,
      artifacts: artifactUrl.trim() ? [{ url: artifactUrl.trim() }] : [],
    }),
    [lookIntoComp, lesson, lessonAnswers, sourceCompleted, passedChecks, performanceNote, artifactUrl],
  );

  const learningDecision = useMemo(() => canIssueLearningCertificate(learningRecord), [learningRecord]);
  const performanceDecision = useMemo(
    () => canIssuePerformanceCertificate(learningRecord),
    [learningRecord],
  );
  const activeRecognitions = useMemo(() => recognitionKindsFor(learningRecord), [learningRecord]);
  const recordMaxTier = useMemo(() => {
    const confirmedInputs = confirmedClaims.map((claim) => ({ skill: claim.skill, quote: claim.quote, tier: claim.tier }));
    return maxTierFromRecord(learningRecord, hasConfirmedEvidenceFor(lookIntoComp, confirmedInputs));
  }, [learningRecord, confirmedClaims, lookIntoComp]);

  // 증거 충족도 — 이 서비스가 쓰는 유일한 비율 수치. 취업 가능성·적성 예측이 아니라
  // "목표 직무가 요구하는 증거 중 확인된 항목의 비율"이며, 산정식과 근거를 함께 보여 준다.
  const roleCoverage = useMemo(() => {
    const requiredItems = role.competencies.map((comp) => comp.proof);
    const confirmedInputs = confirmedClaims.map((claim) => ({
      skill: claim.skill,
      quote: claim.quote,
      tier: claim.tier,
    }));
    const metItems = role.competencies
      .filter((comp) => hasConfirmedEvidenceFor(comp, confirmedInputs))
      .map((comp) => comp.proof);
    return evidenceCoverage(requiredItems, metItems);
  }, [role, confirmedClaims]);

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
      showNotice("역량 표현을 3자 이상 적어 주십시오.", "error");
      return;
    }
    setClaims((current) =>
      current.map((claim) =>
        claim.id === id ? { ...claim, skill: nextSkill, status: "pending" } : claim,
      ),
    );
    setEditingClaimId(null);
    setEditingSkill("");
    showNotice("역량 표현을 수정했습니다. 원문 근거는 바뀌지 않았으니 다시 확인해 주십시오.", "success");
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

  // Gate: 확인된 증거(원문 인용) 없이는 STEP5로 진행할 수 없다 — 학습확인(퀴즈) 통과나
  // localStorage draft 복원만으로 이 화면에 도달한 상태(예: 이전 버전에서 저장된 draft,
  // 또는 직접 조작된 상태)가 있으면 즉시 STEP4로 되돌린다.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- 잘못 복원된 step 값을 정정하는 가드(연쇄 렌더 없음) */
    if (step === 5 && confirmedClaims.length === 0) setStep(4);
  }, [step, confirmedClaims.length]);

  // Gate 6(#42): 정리 프롬프트 복사
  const copyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_ORGANIZE_PROMPT);
      showNotice("정리 프롬프트를 복사했습니다. 쓰던 AI에 붙여넣고, 받은 답을 여기로 가져오십시오.", "success");
    } catch {
      showNotice("복사 권한이 없어 프롬프트를 복사하지 못했습니다. 아래 내용을 직접 선택해 복사해 주십시오.", "error");
    }
  };

  // Gate 6(#42): 파일 선택 → 검증 → 텍스트 추출 → 미리보기(사용자 확인 전에는 입력에 넣지 않음)
  const onImportFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const verdict = validateImportFile({ name: file.name, type: file.type, size: file.size });
    if (!verdict.ok) {
      showNotice(verdict.reason, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        showNotice("파일에서 읽을 텍스트가 없습니다.", "error");
      } else {
        setImportPreview({ name: file.name, text });
      }
    } catch {
      showNotice("파일을 읽지 못했습니다. 다른 파일로 다시 시도해 주십시오.", "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const confirmImport = () => {
    if (!importPreview) return;
    setExperience((current) => (current.trim() ? current + "\n\n" + importPreview.text.trim() : importPreview.text.trim()));
    setImportPreview(null);
    showNotice("파일 내용을 입력에 추가했습니다. 개인정보가 섞여 있지 않은지 확인하고 자유롭게 수정하십시오.", "success");
  };

  const analyzeExperience = async () => {
    if (experience.trim().length < 20 || experience.length > 10000 || analysisSource === "loading") return;
    if (sampleMode) {
      // 샘플 체험: 네트워크 요청 없이 미리 준비된 예시 결과를 보여준다(비용 0·명시 표시)
      setClaims(SAMPLE_JOURNEY.claims.map((claim) => ({ ...claim, status: "pending", link: "" })));
      setAnalysisSource("sample");
      setAnalysisModel(null);
      setAnalysisNotice("샘플 체험 중입니다 — 실제 Solar 호출 없이 준비된 예시 결과입니다.");
      moveTo(2);
      return;
    }
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
        // 세션 없음·만료: 입력·단계는 메모리와 draft(이 기기)에 유지한 채 게이트로 전환한다.
        // draft 저장(#35)이 있으므로 "이어서 진행" 안내가 실제 동작과 일치한다.
        setAnalysisSource("idle");
        setGateOpen(false);
        showNotice("데모 이용 시간이 만료되었습니다. 작성한 내용은 이 기기에 잠시 보관했습니다. 다시 인증하면 이어서 진행할 수 있습니다.", "error");
        scrollToTop();
        return;
      }
      if (!response.ok) {
        // 400·413 등 입력 오류: 서버가 준 사용자용 메시지를 그대로 보여주고,
        // 입력을 유지한 채 현재 단계에 머문다. 샘플 결과로 대체하지 않는다.
        setAnalysisSource("idle");
        showNotice(data.message || "요청을 처리하지 못했습니다. 입력을 확인한 뒤 다시 시도해 주십시오.", "error");
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
      showNotice("연결 오류로 분석하지 못했습니다. 입력은 그대로 남아 있으니 잠시 후 같은 버튼으로 다시 시도해 주십시오.", "error");
    }
  };

  // 영상 학습 자료 생성 — 키는 서버에서만 쓰이며, 실패는 전부 사용자 언어로 안내한다.
  const generateLesson = async () => {
    const url = lessonUrl.trim();
    if (!url) {
      setLessonError("공개 YouTube 영상 주소를 입력해 주십시오.");
      return;
    }
    // 주소 형식은 보내기 전에 확인한다 — 잘못된 주소로 유료 호출을 낭비하지 않고,
    // 사용자에게 즉시 구체적인 안내를 준다(서버도 같은 규칙으로 한 번 더 검사한다).
    if (!parseYoutubeUrl(url)) {
      setLessonError(
        "공개 YouTube 영상 주소를 확인해 주십시오. 예: https://www.youtube.com/watch?v=... 또는 https://youtu.be/...",
      );
      return;
    }
    // 샘플 체험은 실제 AI 호출을 하지 않는다(경험 분석과 동일한 규칙).
    // 없는 학습 자료를 지어내지 않고, 무엇을 하면 되는지만 안내한다.
    if (sampleMode) {
      setLessonError(
        "샘플 체험에서는 실제 AI 호출을 하지 않습니다. 영상 학습을 만들려면 시작 화면에서 데모 코드로 입장해 주십시오. 영상은 지금 직접 보셔도 됩니다.",
      );
      return;
    }
    setLessonBusy(true);
    setLessonError(null);
    try {
      const response = await fetch("/api/lesson", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as {
        lesson?: YoutubeLesson;
        notice?: string;
        message?: string;
      };
      if (!response.ok || !data.lesson) {
        setLessonError(data.message ?? "학습 자료를 만들지 못했습니다. 다시 시도해 주십시오.");
        return;
      }
      setLesson(data.lesson);
      setLessonAnswers(new Array(data.lesson.questions.length).fill(""));
      setSourceCompleted(false);
      setIssuedCert(null);
      if (data.notice) showNotice(data.notice, "info");
    } catch {
      setLessonError("학습 자료를 만들지 못했습니다. 네트워크를 확인하고 다시 시도해 주십시오.");
    } finally {
      setLessonBusy(false);
    }
  };

  const updateLessonAnswer = (index: number, value: string) =>
    setLessonAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));

  const clearLesson = () => {
    setLesson(null);
    setLessonAnswers([]);
    setSourceCompleted(false);
    setLessonError(null);
    setIssuedCert(null);
    setLessonEditing(false);
  };

  // 발급 대상 식별자. 로그인 사용자가 생기기 전까지는 이 기기에만 존재하는 무작위 값이며,
  // 개인정보를 담지 않는다. 같은 날 같은 학습을 마친 다른 사람과 번호가 겹치지 않게 하는 용도다.
  const ownerKey = () => {
    const KEY = "gp_owner_key";
    try {
      const existing = window.localStorage.getItem(KEY);
      if (existing) return existing;
      const created = crypto.randomUUID();
      window.localStorage.setItem(KEY, created);
      return created;
    } catch {
      // 저장이 막힌 환경(프라이빗 모드 등)에서도 발급은 가능해야 하지만, 고정 문자열을 쓰면
      // 서로 다른 사용자가 같은 번호를 받는다. 이 탭에서만 유지되는 난수로 대체한다.
      if (!sessionOwnerKey.current) sessionOwnerKey.current = crypto.randomUUID();
      return sessionOwnerKey.current;
    }
  };

  // 발급 — 조건 미충족이면 아무것도 만들지 않는다(버튼도 비활성이지만 방어적으로 한 번 더 막는다).
  const issueCertificate = (kind: CertificateKindId) => {
    const decision = kind === "performance" ? performanceDecision : learningDecision;
    if (!decision.eligible) {
      showNotice("아직 발급 조건을 충족하지 않았습니다.", "error");
      return;
    }
    const issuedAt = formatProofDate(new Date());
    setIssuedCert({
      kind,
      serial: certificateSerial(kind, learningRecord, issuedAt, ownerKey()),
      issuedAt,
      competencyLabel: learningRecord.competencyLabel,
      sourceTitle: learningRecord.sourceTitle,
      scope: certificateScope(kind === "performance" ? "performance" : "learning"),
      artifactUrl: kind === "performance" ? artifactUrl.trim() : undefined,
    });
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
      showNotice("모든 문항에 답해 주십시오.", "error");
      return;
    }
    const ok = quiz.questions.every((qq, i) => quiz.picks[i] === qq.answer);
    if (ok) {
      setPassedChecks((prev) => ({ ...prev, [quiz.compId]: true }));
      setQuiz({ ...quiz, status: "passed" });
      // 증거등급 무결성 P0: 퀴즈 통과 자체는 항상 일어나지만, "수행 확인(Lv.2)"으로
      // 기록되는지는 이 역량에 매칭되는 확인 증거가 있을 때만 참이므로 안내 문구를 그에 맞춘다.
      const quizComp = role.competencies.find((c) => c.id === quiz.compId);
      const confirmedInputs = confirmedClaims.map((claim) => ({ skill: claim.skill, quote: claim.quote, tier: claim.tier }));
      const reflectedInGrade = quizComp ? hasConfirmedEvidenceFor(quizComp, confirmedInputs) : false;
      showNotice(
        reflectedInGrade
          ? "학습확인 통과 · 수행 확인(Lv.2)으로 기록했습니다."
          : "학습확인 통과 · 이 역량에 확인한 근거가 아직 없어 등급에는 반영되지 않았습니다.",
        "success",
      );
    } else if (quiz.attempt >= 3) {
      setQuiz({ ...quiz, status: "locked" });
    } else {
      setQuiz({ ...quiz, attempt: quiz.attempt + 1, picks: [null, null] });
      showNotice("오답이 있습니다. 다시 시도해 보십시오.", "error");
    }
  };
  const retryCheck = () => setQuiz((q) => (q ? { ...q, attempt: 1, picks: [null, null], status: "open" } : q));
  const closeCheck = () => setQuiz(null);

  // Gate 1(#35): 여정 상태 일괄 초기화 + draft 소거. 소거 직후 초기값이 draft로
  // 재저장되지 않도록 저장 가드를 해제한다(다음 사용자 상호작용부터 다시 저장).
  const resetJourneyState = (nextExperience: string, nextClaims: Claim[], options?: { keepStoredDraft?: boolean }) => {
    if (!options?.keepStoredDraft) clearDraft(window.localStorage);
    draftSaveArmed.current = false;
    setStep(0);
    setStoreConsent(false);
    setAggregateConsent(false);
    setExperience(nextExperience);
    setClaims(nextClaims);
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
  };

  // 샘플 체험 진입·초기화·종료 — 사용자의 실제 draft는 건드리지 않는다
  const enterSample = () => {
    resetJourneyState(SAMPLE_JOURNEY.experience, [], { keepStoredDraft: true });
    setSampleMode(true);
    setNotice(null);
    scrollToTop();
  };
  const restartSample = () => {
    resetJourneyState(SAMPLE_JOURNEY.experience, [], { keepStoredDraft: true });
    showNotice("체험을 처음부터 다시 시작합니다.", "info");
    scrollToTop();
  };
  const exitSample = () => {
    setSampleMode(false);
    // ?sample=1이 남아 있으면 새로고침 시 샘플로 재진입해 실제 작성 흐름과 어긋난다 — URL 정리
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* 미지원 무시 */ }
    const draft = loadDraft(window.localStorage);
    resetJourneyState(draft ? draft.experience : "", draft ? (draft.claims as Claim[]) : [], { keepStoredDraft: true });
    if (draft) {
      setStep(draft.step);
      setStoreConsent(draft.storeConsent);
      setAggregateConsent(draft.aggregateConsent);
      setRoleId(draft.roleId);
      setPassedChecks(draft.passedChecks);
      setAnalysisSource(draft.analysisSource);
      setAnalysisModel(draft.analysisModel);
      setModelId(draft.modelId);
      setAnalysisNotice(draft.analysisNotice);
      setSelectedAction(draft.selectedAction);
      setProofDate(draft.proofDate);
    }
    setNotice(null);
    scrollToTop();
  };

  const deleteRecords = () => {
    resetJourneyState("", []);
    showNotice("이전 내용을 모두 지웠습니다. 새 분석을 시작할 수 있습니다.", "success");
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
        showNotice(data.message || "데모 코드를 확인하지 못했습니다. 다시 시도해 주십시오.", "error");
        return;
      }
      setNotice(null);
      setGateOpen(true);
      setGateCode("");
      scrollToTop();
    } catch {
      showNotice("연결 오류로 데모 코드를 확인하지 못했습니다. 잠시 후 다시 시도해 주십시오.", "error");
    } finally {
      setGateBusy(false);
    }
  };

  // 데모 잠금(로그아웃): 서버 쿠키 만료 + 게이트 화면 복귀.
  // Gate 1(#35): 잠금은 공용 기기 이탈 신호로 보고 화면 상태와 draft를 함께 지운다.
  const lockDemo = async () => {
    try {
      await fetch("/api/gate", { method: "DELETE" });
    } catch {
      // 네트워크 실패여도 화면은 잠근다(쿠키는 만료 시 자동 무효)
    }
    resetJourneyState("", []);
    setGateOpen(false);
    setGateCode("");
    showNotice("데모에서 나왔습니다. 다시 보려면 데모 코드를 입력해 주십시오.", "info");
    scrollToTop();
  };

  const shareUrl = () => window.location.origin;

  // 공유 문구를 "내 결과"로 개인화 — 목표직무명·확인된 역량 개수·선택한 행동명(전부 프리셋/집계값)만 사용하고,
  // 경험 원문·역량 설명·근거·인용문은 절대 포함하지 않는다.
  const buildResultShareText = () => {
    // verifiedPassedComps는 "확인 증거가 있는" 역량만 담으므로 confirmedClaims와 겹친다.
    // 두 값을 더하면 같은 증거를 두 번 세게 되므로 확인된 증거 수만 쓴다.
    const totalSkills = confirmedClaims.length;
    if (totalSkills === 0) return SHARE_TEXT;
    const actionPart = chosenAction ? ` · 이번 주 행동 "${chosenAction.title}"` : "";
    return `${role.label} 목표로 역량 ${totalSkills}개 확인${actionPart} — GapProof`;
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      showNotice("링크를 복사했습니다. 어디든 붙여넣어 공유할 수 있습니다.", "success");
    } catch {
      showNotice("복사 권한이 없어 링크를 복사하지 못했습니다. 주소창의 주소를 직접 복사해 주십시오.", "error");
    }
  };

  const shareViaSystem = async () => {
    // 공유에는 내 결과 요약(목표직무·확인 개수·행동명)과 링크만 담는다 — 경험 원문·분석 근거는 포함하지 않는다.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "GapProof", text: buildResultShareText(), url: shareUrl() });
      } catch {
        // 사용자가 공유를 취소한 경우 등 — 조용히 종료
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl());
      showNotice("이 브라우저는 바로 공유를 지원하지 않아 링크를 복사했습니다.", "info");
    } catch {
      showNotice("공유를 지원하지 않는 브라우저입니다. 주소창의 주소를 복사해 주십시오.", "error");
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
        description: buildResultShareText(),
        imageUrl: `${url}/og.png`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: "데모 열어보기", link: { mobileWebUrl: url, webUrl: url } }],
    });
  };

  const requestDelete = () => setConfirmingDelete(true);
  const cancelDelete = () => {
    setConfirmingDelete(false);
    // 데스크톱은 헤더의 "새 분석 시작하기" 버튼, 모바일은 그 버튼이 display:none이라
    // (hidden 요소는 focus 불가) 액션 메뉴 토글로 대신 복귀한다.
    if (deleteButtonRef.current && deleteButtonRef.current.offsetParent !== null) {
      deleteButtonRef.current.focus();
    } else {
      document.querySelector<HTMLButtonElement>(".actions-toggle")?.focus();
    }
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
        {journeyOpen && (
          <div className="top-actions">
            <div className="model-summary">
              <span className="model-summary-text" aria-live="polite">
                <small>AI 분석 모델</small>
                <b>{findModel(modelId).fullName}{modelId === DEFAULT_MODEL_ID ? " · 기본" : ""}</b>
              </span>
              <button
                ref={modelButtonRef}
                className="secondary model-change"
                disabled={analysisSource === "loading"}
                onClick={openModelDialog}
              >모델 변경</button>
            </div>
            <span
              className={`sample-badge ${analysisSource === "solar" ? "live" : ""}`}
              aria-label={analysisSource === "solar" ? `Solar 실연결 · ${analysisModel}` : "Solar 샘플 데모"}
            ><i /> <span className="sample-badge-text">{analysisSource === "solar" ? `Solar 실연결 · ${analysisModel}` : "Solar 샘플 데모"}</span></span>
            {!sampleMode && <button className="text-button" ref={deleteButtonRef} onClick={requestDelete}>새 분석 시작하기</button>}
          </div>
        )}
        {journeyOpen && (
          <MobileActionsMenu
            modelLabel={`${findModel(modelId).fullName}${modelId === DEFAULT_MODEL_ID ? " · 기본" : ""}`}
            onChangeModel={openModelDialog}
            modelDisabled={analysisSource === "loading"}
            connectionLabel={analysisSource === "solar" ? `Solar 실연결 · ${analysisModel}` : "Solar 샘플 데모"}
            connectionLive={analysisSource === "solar"}
            onNewAnalysis={sampleMode ? null : requestDelete}
          />
        )}
        <ThemeToggle />
      </header>

      {sampleMode && journeyOpen && (
        <div className="sample-strip" role="status">
          <span><b>샘플 체험 중</b> — 실제 분석이 아닙니다. 미리 준비된 예시로 전체 흐름을 볼 수 있습니다.</span>
          <button className="text-button" onClick={exitSample}>실제 분석으로 전환</button>
        </div>
      )}

      {journeyOpen && (
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
          aria-label="새 분석 시작 확인"
          onKeyDown={(event) => { if (event.key === "Escape") cancelDelete(); }}
        >
          <p>새 분석을 시작하시겠습니까? 현재 작성한 내용과 분석 결과가 사라집니다. 이 작업은 되돌릴 수 없습니다.</p>
          <div>
            <button autoFocus onClick={cancelDelete}>계속 작성하기</button>
            <button className="danger" onClick={confirmDelete}>새 분석 시작</button>
          </div>
        </div>
      )}

      {!journeyOpen && (
        <section className="page-shell gate-page" aria-label="심사·멘토링 데모 입장">
          <div className="gate-card">
            <div className="gate-brand"><span className="brand-mark"><BrandGlyph /></span><b>GapProof</b></div>
            <div className="card-kicker">심사·멘토링 데모</div>
            <h1>안내받은 데모 코드를 입력해 주십시오.</h1>
            <p className="gate-guide">
              공백·전환 경험을 역량 증거와 이번 주 행동으로 바꾸는 <b>Solar 기반 진로 탐색 데모</b>입니다.
              현재는 제한된 테스트로 운영합니다.
              들어오려면 심사·멘토링 공유용 <b>데모 코드</b>가 필요합니다.
              계정 로그인이나 개인 비밀번호가 아닙니다. 코드는 안내받은 채널에서 확인할 수 있습니다.
            </p>
            <label htmlFor="gate-code">데모 코드</label>
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
            <small className="gate-hint">GapProof는 취업 가능성이나 적성을 판정하지 않습니다.</small>
            <div className="gate-actions">
              <button className="primary" disabled={!gateCode.trim() || gateBusy} onClick={submitGateCode}>
                {gateBusy ? "확인 중…" : "데모 열기"}
              </button>
              <button className="secondary" onClick={enterSample}>
                코드 없이 샘플 둘러보기
              </button>
            </div>
            <small className="gate-hint">샘플 체험은 실제 Solar를 호출하지 않고, 예시 결과임을 화면에 항상 표시합니다.</small>
            <nav className="gate-links" aria-label="서비스 소개 페이지">
              <a href="/about">소개</a>
              <a href="/guide">이용 가이드</a>
              <a href="/how-it-works">작동 원리</a>
              <a href="/technology">기술과 검증</a>
            </nav>
          </div>
        </section>
      )}

      {journeyOpen && step === 0 && (
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
              <span>AI가 진로를 단정하지 않습니다</span>
              <span>근거 없는 역량은 인정하지 않습니다</span>
              <span>원문 공유는 직접 선택합니다</span>
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
              <span><b>[필수] 경험 분석을 위한 원문 처리</b><small>분석 요청에만 사용하며 현재 버전은 서버에 원문을 저장하지 않습니다.</small></span>
            </label>
            <label className="check-row optional">
              <input
                type="checkbox"
                checked={aggregateConsent}
                onChange={(event) => setAggregateConsent(event.target.checked)}
              />
              <span><b>[선택] 익명 서비스 개선 통계 참여</b><small>선택하지 않아도 핵심 기능을 모두 쓸 수 있습니다. 현재 버전은 통계를 실제로 수집하지 않습니다. 이 선택은 Gap Brief의 기관 공유 범위 표시에만 반영됩니다.</small></span>
            </label>
            <button className="primary full" disabled={!storeConsent} onClick={() => moveTo(1)}>
              {sampleMode ? "샘플로 둘러보기" : "내 경험에서 시작하기"} <span>→</span>
            </button>
            <small className="fine-print">GapProof는 취업 가능성이나 적성을 판정하지 않습니다.</small>
          </aside>
        </section>
      )}

      {/* 저장된 내용을 말없이 되살리지 않는다 — 무엇이 돌아왔고 무엇이 돌아오지 않았는지 알린다. */}
      {journeyOpen && restoredAt && (
        <div className="page-shell">
          <div className="restore-note" role="status">
            <p>
              <b>이 기기에 저장해 둔 작성 내용을 불러왔습니다.</b>{" "}
              마지막 저장: {new Date(restoredAt).toLocaleString("ko-KR")}
            </p>
            <p className="restore-scope">
              경험 원문·후보 확인 상태·목표 직무는 복원됩니다. 영상 학습 결과와 질문 답변, 수행 기록,
              산출물 링크, 발급한 문서는 저장하지 않으므로 복원되지 않습니다.
            </p>
            <div className="restore-actions">
              <button type="button" className="secondary" onClick={() => setRestoredAt(null)}>
                이어서 하기
              </button>
              <button type="button" className="text-button" onClick={requestDelete}>
                지우고 새로 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {journeyOpen && step === 1 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 1 · 경험함</span><h1>학적 밖에 있던 경험을 적어 주십시오.</h1></div>
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
              <label htmlFor="experience"><b>경력이라고 생각하지 않았던 일까지 들려주십시오.</b></label>
              <p className="input-guide">학교, 일, 돌봄, 게임, 취미, SNS, 쉬었던 시기처럼 작아 보였던 경험도 괜찮습니다. 잘 정리하지 않아도 됩니다.</p>
              <textarea id="experience" placeholder="여기에 자유롭게 적어 주십시오. 문장이 어색해도, 순서가 뒤죽박죽이어도 괜찮습니다." value={experience} onChange={(event) => setExperience(event.target.value)} />
              <div className="input-meta"><span>개인·가족 실명, 연락처, 주민등록번호는 적지 않아도 됩니다.</span><b className={OVER_LIMIT ? "count-over" : ""}>{experienceLength.toLocaleString()}자 / 최소 20자 · 최대 10,000자</b></div>
              {OVER_LIMIT && (
                <p className="length-hint over" role="alert">10,000자를 넘었습니다. 지금 내용은 그대로 남아 있으니 {(experienceLength - 10000).toLocaleString()}자만 줄이면 분석할 수 있습니다. 자동으로 잘라내지 않습니다.</p>
              )}
              {experience.trim().length < 20 && (
                <p className="length-hint" role="status">앞뒤 공백을 뺀 20자 이상 적으면 ‘내 경험에서 가능성 찾기’ 버튼이 켜집니다.</p>
              )}
              <p className="source-note">이런 경험도 좋습니다 — 프로젝트, 수업·강의, 자격증, Notion·메모, 손글씨 기록, 일·아르바이트, 돌봄, 게임·커뮤니티, 쉬었던 시기.</p>

              <div className="import-box">
                <details>
                  <summary>이미 사용하는 AI가 있습니까? (ChatGPT·Claude·Gemini)</summary>
                  <p className="import-guide">
                    쓰던 AI에 아래 프롬프트를 붙여넣으면 대화 속 경험을 정리해 줍니다.
                    받은 답을 이 입력창에 붙여넣으십시오.
                    <b> 외부 AI의 답은 확정된 사실이 아니라 초안입니다. 붙여넣은 뒤 직접 확인·수정하십시오.</b>
                    {" "}붙여넣기 전에 이름·연락처 같은 개인정보가 섞이지 않았는지 확인해 주십시오.
                  </p>
                  <pre className="import-prompt">{AI_ORGANIZE_PROMPT}</pre>
                  <button type="button" className="secondary" onClick={copyAiPrompt}>정리 프롬프트 복사</button>
                </details>
                <details>
                  <summary>메모 파일이 있습니까? (TXT·MD 1개)</summary>
                  <p className="import-guide">파일은 이 브라우저 안에서 텍스트로만 읽습니다 — 서버로 올리거나 저장하지 않습니다. 최대 200KB, PDF·DOCX는 다음 단계에서 준비 중입니다.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.markdown,text/plain,text/markdown"
                    aria-label="TXT 또는 Markdown 파일 선택"
                    onChange={(event) => onImportFile(event.target.files)}
                  />
                  {importPreview && (
                    <div className="import-preview" role="region" aria-label="파일 미리보기">
                      <b>{importPreview.name}</b>
                      <p>{previewText(importPreview.text).preview}{previewText(importPreview.text).truncated ? "…" : ""}</p>
                      <small>{importPreview.text.length.toLocaleString()}자 — 추가하기 전까지는 입력에 반영되지 않습니다.</small>
                      <div className="import-actions">
                        <button type="button" className="secondary" onClick={() => setImportPreview(null)}>제외</button>
                        <button type="button" className="primary" onClick={confirmImport}>입력에 추가</button>
                      </div>
                    </div>
                  )}
                </details>
              </div>
            </div>
            <aside className="paper-card evidence-preview">
              <div className="card-kicker">입력 예시</div>
              <blockquote>“학교에서 배운 전공과 집에서 시작한 기술 공부가 따로 놀았습니다.”</blockquote>
              <div className="mini-evidence"><span>01</span><p><b>항공물류 전공</b><small>도메인 지식 · 학교</small></p></div>
              <div className="mini-evidence"><span>02</span><p><b>AI 수학·웹 독학</b><small>학습 기록 · 자기기록</small></p></div>
              <div className="mini-evidence"><span>03</span><p><b>MindHub 제작</b><small>작동 산출물 · 프로젝트</small></p></div>
              <div className="long-examples">
                <p className="card-kicker">정리 안 된 긴 예시 3가지 (표시용 — 입력에 넣지 않습니다)</p>
                {LONG_EXAMPLES.map((ex) => (
                  <details key={ex.id}>
                    <summary>{ex.label}</summary>
                    <p>{ex.text}</p>
                  </details>
                ))}
              </div>
            </aside>
          </div>
          )}
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(0)}>이전</button>
            <button className="primary" disabled={experience.trim().length < 20 || OVER_LIMIT || analysisSource === "loading"} onClick={analyzeExperience}>
              {analysisSource === "loading" ? <><span className="spinner" />역량 후보를 찾는 중…</> : "내 경험에서 가능성 찾기"} <span>→</span>
            </button>
          </div>
        </section>
      )}

      {journeyOpen && step === 2 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 2 · 사용자 확인</span><h1>AI의 제안보다 당신의 확인이 먼저입니다.</h1></div>
            <div className="legend"><i /> 입력 문장을 근거로 인용합니다 · 개인정보가 감지되면 가려서 표시됩니다</div>
          </div>
          <div className="explain-strip">
            <b>{analysisSource === "solar" ? `Solar ${analysisModel} 분석 완료` : "안전한 샘플 분석 완료"}</b>
            <span>{analysisNotice} 과장되거나 맥락이 다른 후보는 거절하십시오. 거절한 항목은 카드와 추천에서 빠집니다.</span>
          </div>
          <div className="claims">
            {claims.map((claim) => (
              <article key={claim.id} className={`claim-card ${claim.status}`}>
                <div className="claim-top">
                  <span className={`confidence ${claim.confidence === "높음" ? "high" : "low"}`}>{claim.confidence === "높음" ? "근거 일치 높음" : "근거 확인 필요"}</span>
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
                  <input id={`claim-link-${claim.id}`} value={claim.link ?? ""} placeholder="https://... (GitHub·수료증·노트 주소)" onChange={(event) => attachLink(claim.id, event.target.value)} />
                  <small>{claim.link ? "링크 연결됨 → 증거등급 Lv.1 근거 연결" : "링크가 없으면 Lv.0 자기기록으로 시작합니다"}</small>
                </div>
                <p className="follow-up"><b><IconQuestion />더 확인하면 좋은 것</b>{claim.question}</p>
                {(claim.factStatus || claim.behaviors?.length || claim.jobHypotheses?.length || claim.smallStep) && (
                  <div className="claim-v2">
                    <div className="v2-badges">
                      {claim.factStatus && (
                        <span
                          className={`v2-badge status-${claim.factStatus === "확인됨" ? "done" : claim.factStatus === "부분 확인" ? "partial" : "plan"}`}
                        >
                          AI 판단: 원문에 {claim.factStatus}
                        </span>
                      )}
                      {claim.evidenceStrength && <span className="v2-badge">근거 {claim.evidenceStrength}</span>}
                      {claim.signals?.map((signal) => <span className="v2-badge signal" key={signal}>{signal}</span>)}
                    </div>
                    {claim.context && <p className="v2-line"><b>상황</b>{claim.context}</p>}
                    {claim.behaviors && claim.behaviors.length > 0 && (
                      <p className="v2-line"><b><IconCheck />AI가 원문에서 뽑은 행동</b>{claim.behaviors.join(" · ")}</p>
                    )}
                    {claim.overclaimRisk && <p className="v2-line risk"><b><IconWarning />과장 주의</b>{claim.overclaimRisk}</p>}
                    {claim.jobHypotheses && claim.jobHypotheses.length > 0 && (
                      <details className="v2-hypo">
                        <summary><IconCompass />직업 가설 (판정 아님)</summary>
                        <ul>
                          {claim.jobHypotheses.map((hypothesis) => (
                            <li key={hypothesis.title}>
                              <b>{hypothesis.title} (가설)</b> — {hypothesis.reason}
                              <small>부족한 증거: {hypothesis.missing}</small>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {claim.smallStep && <p className="v2-line step"><b><IconChecklist />이번 주 작은 실험</b>{claim.smallStep}</p>}
                  </div>
                )}
                <div className="claim-actions">
                  <button className={claim.status === "rejected" ? "selected reject" : ""} aria-pressed={claim.status === "rejected"} onClick={() => updateClaim(claim.id, "rejected")}>거절</button>
                  <button onClick={() => startEditingClaim(claim)}>표현 수정</button>
                  <button className={claim.status === "confirmed" ? "selected confirm" : "confirm"} aria-pressed={claim.status === "confirmed"} onClick={() => updateClaim(claim.id, "confirmed")}>✓ 맞습니다</button>
                </div>
              </article>
            ))}
          </div>
          <div className="footer-actions sticky-actions">
            <div><b>{confirmedClaims.length}개 확인됨</b><span>최소 1개를 확인해 주십시오.</span></div>
            <button className="secondary" onClick={() => moveTo(1)}>이전</button>
            <button className="primary" disabled={confirmedClaims.length === 0} onClick={() => moveTo(3)}>다음: 먼저 알아보기 <span>→</span></button>
          </div>
        </section>
      )}

      {journeyOpen && step === 3 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 3 · 먼저 알아보기</span><h1 ref={lookIntoHeadingRef} tabIndex={-1}>AI가 아니라 당신이 직접 확인하는 단계입니다.</h1></div>
            <span className="time-pill">건너뛰어도 됩니다</span>
          </div>
          <p className="lookinto-intro">여기 링크는 정답이 아니라 검색 출발점입니다. 실제로 있는지, 지금 나에게 맞는지는 직접 살펴보고 판단해 주십시오.</p>

          <div className="lookinto-group role-picker">
            {lookIntoHypothesis && (
              <p className="follow-up"><b><IconCompass />AI가 제안한 직업 가설 (판정 아님)</b>{lookIntoHypothesis}</p>
            )}
            <div className="card-kicker">이번에 알아볼 목표직무</div>
            <p className="length-hint">{lookIntoHypothesis ? "그래서 아래 3가지 중 무엇을 먼저 확인해볼까요? 언제든 바꿀 수 있습니다." : "아래에서 이번에 확인해볼 목표직무를 선택해 주십시오. 언제든 바꿀 수 있습니다."}</p>
            <RoleSelect roleId={roleId} onSelect={(id) => { setRoleId(id); setQuiz(null); }} />
          </div>

          <div className="lookinto-group">
            <div className="card-kicker">먼저 검색해보기 · 배워보기</div>
            <div className="lookinto-grid">
              {lookIntoResources.learn.map((card) => (
                <article className="lookinto-card" key={card.id}>
                  <span className="lookinto-platform">{card.platform}</span>
                  <h3>{card.title}</h3>
                  <p className="follow-up"><b>추천 이유</b>{card.reason}</p>
                  <div className="v2-badges">
                    {card.hypothesis && <span className="v2-badge">{card.hypothesis}</span>}
                    <span className="v2-badge">{card.time}</span>
                    <span className="v2-badge">{card.difficulty}</span>
                    <span className="v2-badge">{card.free}</span>
                  </div>
                  <p className="follow-up"><b><IconQuestion />확인할 포인트</b>{card.verify}</p>
                  <a className="lookinto-link" href={card.href} target="_blank" rel="noopener noreferrer" aria-label={card.ariaLabel}>
                    {card.linkLabel} <span aria-hidden="true">↗</span>
                  </a>
                </article>
              ))}
            </div>
          </div>

          <details className="lookinto-group v2-hypo lookinto-institutional">
            <summary><IconCompass />제도 확인하기 ({lookIntoResources.institutional.length}) — 고용24·온통청년</summary>
            <div className="lookinto-grid">
              {lookIntoResources.institutional.map((card) => (
                <article className="lookinto-card" key={card.id}>
                  <span className="lookinto-platform">{card.platform}</span>
                  <h3>{card.title}</h3>
                  <p className="follow-up"><b>추천 이유</b>{card.reason}</p>
                  {card.searchHint && <p className="lookinto-hint">{card.searchHint}</p>}
                  <div className="v2-badges">
                    {card.hypothesis && <span className="v2-badge">{card.hypothesis}</span>}
                    <span className="v2-badge">{card.time}</span>
                    <span className="v2-badge">{card.difficulty}</span>
                    <span className="v2-badge">{card.free}</span>
                  </div>
                  <p className="follow-up"><b><IconQuestion />확인할 포인트</b>{card.verify}</p>
                  <a className="lookinto-link" href={card.href} target="_blank" rel="noopener noreferrer" aria-label={card.ariaLabel}>
                    {card.linkLabel} <span aria-hidden="true">↗</span>
                  </a>
                </article>
              ))}
            </div>
          </details>

          <div className="lookinto-group">
            <div className="card-kicker">직접 해보기</div>
            <article className="action-card lookinto-project">
              <span className="action-type">미니프로젝트</span>
              <h3>{lookIntoResources.project.title}</h3>
              <p>{lookIntoResources.project.rule}</p>
              <div><b>{lookIntoResources.project.time}</b><span>{lookIntoResources.project.hypothesis}</span></div>
            </article>
          </div>

          <div className="lookinto-group lesson-group">
            <div className="card-kicker">영상으로 학습하기 (선택)</div>
            <h3 className="lesson-title">본 영상을 학습 기록으로 남깁니다.</h3>
            <p className="length-hint">
              공개 YouTube 주소를 넣으면 요약·핵심 개념·질문을 정리해 드립니다. 정리된 내용은 직접 고칠 수 있습니다.
              영상 학습과 질문은 <b>학습 완료·이해 확인</b>까지만 인정됩니다 — 증거등급은 실제로 해 보고 결과물을 남겨야 오릅니다.
            </p>
            <div className="lesson-input-row">
              <label className="sr-only" htmlFor="lesson-url">공개 YouTube 영상 주소</label>
              <input
                id="lesson-url"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={lessonUrl}
                onChange={(event) => setLessonUrl(event.target.value)}
                disabled={lessonBusy}
              />
              <button className="check-cta" onClick={generateLesson} disabled={lessonBusy || !lessonUrl.trim()}>
                {lessonBusy ? "정리하는 중…" : lesson ? "다시 만들기" : "학습 자료 만들기"}
              </button>
            </div>
            {lessonError && <p className="lesson-error" role="alert">{lessonError}</p>}

            {/* 인정 범위는 영상 학습을 만들지 않아도 항상 보인다.
                무엇이 어떤 근거로 인정되는지는 이 제품의 핵심 설명인데,
                학습 자료를 만든 사용자만 볼 수 있으면 대부분이 한 번도 보지 못한다. */}
              <div className="recognition-panel">
                <div className="card-kicker">지금 인정되는 범위</div>
                {/* 확인 주체가 다른 것을 같은 목록에 섞지 않는다.
                    내가 적은 것과 기관이 발급한 것이 나란히 놓이면 같은 무게로 읽힌다. */}
                {RECOGNITION_GROUPS.map((group) => {
                  const kinds = RECOGNITION_KINDS.filter(
                    (kind) => group.kinds.includes(kind.id) && kind.id !== "third_party_reviewed",
                  );
                  if (kinds.length === 0) return null;
                  return (
                    <section className={`recognition-group recognition-group-${group.id}`} key={group.id}>
                      <h4>{group.label}</h4>
                      <p className="recognition-who">{group.who}</p>
                      <ul className="recognition-list">
                        {kinds.map((kind) => {
                          const active = activeRecognitions.includes(kind.id);
                          return (
                            <li key={kind.id} className={active ? "recognition-on" : "recognition-off"}>
                              <b>{active ? "인정됨" : "아직 아님"} · {kind.label}</b>
                              <small>{active ? kind.limits : kind.means}</small>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
                <p className="length-hint">
                  {lesson ? (
                    <>
                      이 학습 기록만으로 도달 가능한 최대 증거등급: <b>Lv.{recordMaxTier}</b>
                      {recordMaxTier === 0 && " — 등급을 올리려면 실제로 해 보고 결과물 링크를 남겨 주십시오."}
                    </>
                  ) : (
                    <>학습 자료를 만들면 여기에 무엇까지 인정되는지 표시됩니다. 학습만으로는 <b>Lv.0 자기기록</b>을 넘지 않습니다.</>
                  )}
                </p>
              </div>

            {lesson && (
              <div className="lesson-body">
                <div className="lesson-head">
                  <h4>{lesson.title}</h4>
                  <div className="lesson-head-actions">
                    <button className="secondary" onClick={() => setLessonEditing((prev) => !prev)}>
                      {lessonEditing ? "편집 끝내기" : "내용 고치기"}
                    </button>
                    <button className="secondary" onClick={clearLesson}>지우기</button>
                  </div>
                </div>
                {lessonEditing ? (
                  <label className="lesson-edit">
                    <span>요약을 직접 고칠 수 있습니다</span>
                    <textarea
                      value={lesson.summary}
                      rows={4}
                      onChange={(event) => setLesson({ ...lesson, summary: event.target.value })}
                    />
                  </label>
                ) : (
                  <p className="lesson-summary">{lesson.summary}</p>
                )}

                {lesson.keyConcepts.length > 0 && (
                  <div className="v2-badges">
                    {lesson.keyConcepts.map((concept) => (
                      <span className="v2-badge" key={concept}>{concept}</span>
                    ))}
                  </div>
                )}

                {lesson.timestamps.length > 0 && (
                  <ul className="lesson-timestamps">
                    {lesson.timestamps.map((stamp) => (
                      <li key={`${stamp.at}-${stamp.label}`}><b>{stamp.at}</b> {stamp.label}</li>
                    ))}
                  </ul>
                )}

                <div className="lesson-questions">
                  <div className="card-kicker">스스로 확인하기 (필수 {lesson.questions.length}문항)</div>
                  {/* 시청 시간을 측정하지 않으므로 완료는 본인 표시로만 받는다(자기기록 Lv.0). */}
                  <label className="check-row lesson-done">
                    <input
                      type="checkbox"
                      checked={sourceCompleted}
                      onChange={(event) => setSourceCompleted(event.target.checked)}
                    />
                    <span>
                      이 학습 자료를 끝까지 봤습니다.
                      <small>본인이 표시한 값입니다. GapProof는 시청 시간을 측정하지 않습니다.</small>
                    </span>
                  </label>
                  {lesson.questions.map((question, index) => {
                    const answer = lessonAnswers[index] ?? "";
                    const enough = isAnsweredEnough(answer);
                    const fieldId = `lesson-q-${index}`;
                    return (
                      // label 로 전체를 감싸면 도움말과 글자수까지 입력칸의 "이름"이 되어
                      // 한 글자 칠 때마다 이름이 바뀐다. 이름은 질문만, 나머지는 설명으로 붙인다.
                      <div className="lesson-question" key={`${question.kind}-${index}`}>
                        <label className="lesson-q-head" htmlFor={fieldId}>
                          <span className="v2-badge">{LESSON_QUESTION_LABELS[question.kind]}</span>
                          {question.question}
                        </label>
                        <textarea
                          id={fieldId}
                          rows={2}
                          value={answer}
                          aria-describedby={`${fieldId}-guide ${fieldId}-count`}
                          placeholder={`내 말로 ${MIN_ANSWER_CHARS}자 이상 적어 주십시오`}
                          onChange={(event) => updateLessonAnswer(index, event.target.value)}
                        />
                        <small className="lesson-guide" id={`${fieldId}-guide`}>도움말: {question.answerGuide}</small>
                        {/* 조건을 넘긴 순간을 스크린리더에도 알린다. */}
                        {/* 진행 중 숫자는 눈으로만 본다. 라이브 리전이면 한 글자마다 낭독된다. */}
                        <small className={enough ? "lesson-count ok" : "lesson-count"} id={`${fieldId}-count`}>
                          {enough
                            ? `응답으로 인정됩니다 (${answer.trim().length}자)`
                            : `${MIN_ANSWER_CHARS}자 이상 필요합니다 (현재 ${answer.trim().length}자)`}
                        </small>
                        {/* 임계를 넘은 순간만 알린다 — 텍스트가 바뀔 때만 낭독된다. */}
                        <span className="sr-only" role="status">
                          {enough ? `${index + 1}번 질문 응답으로 인정됩니다.` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="lesson-practice">
                  <p className="follow-up"><b>추천 수행 과제</b>{lesson.practiceTask}</p>
                  <p className="follow-up"><b>예상 산출물</b>{lesson.expectedArtifact}</p>
                  <label className="lesson-edit">
                    <span>무엇을 직접 해 봤는지 한 줄로 적어 주십시오</span>
                    <textarea
                      rows={2}
                      value={performanceNote}
                      placeholder="예: 실제 문제 1개를 5문장으로 정의해 봤습니다"
                      onChange={(event) => setPerformanceNote(event.target.value)}
                    />
                  </label>
                  <label className="lesson-edit">
                    <span>결과물 링크 (http/https)</span>
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://github.com/... 또는 문서 공유 링크"
                      value={artifactUrl}
                      onChange={(event) => setArtifactUrl(event.target.value)}
                    />
                  </label>
                </div>

                <div className="cert-actions">
                  {CERTIFICATE_KINDS.filter((kind) => kind.id !== "external_record").map((kind) => {
                    const decision = kind.id === "performance" ? performanceDecision : learningDecision;
                    return (
                      <div className="cert-action" key={kind.id}>
                        <button
                          className="check-cta"
                          disabled={!decision.eligible}
                          onClick={() => issueCertificate(kind.id)}
                        >
                          {kind.label} 발급
                        </button>
                        <small>{kind.doesNotMean}</small>
                        {!decision.eligible && (
                          <div role="status">
                            <ul className="cert-missing">
                              {decision.missing.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                            {decision.nextStep && (
                              <p className="cert-next"><b>다음 한 가지</b> {decision.nextStep}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {issuedCert && (
                  <article className="certificate-doc" aria-label={`${issuedCert.kind === "performance" ? "수행 확인서" : "학습 수료증"}`}>
                    <header>
                      <span className="brand-mark small"><BrandGlyph /></span>
                      <div>
                        <b>{issuedCert.kind === "performance" ? "수행 확인서" : "학습 수료증"}</b>
                        <small>{CERTIFICATE_ISSUER}</small>
                      </div>
                    </header>
                    <dl>
                      <div><dt>역량</dt><dd>{issuedCert.competencyLabel || "—"}</dd></div>
                      <div><dt>학습 자료</dt><dd>{issuedCert.sourceTitle || "—"}</dd></div>
                      <div><dt>확인 범위</dt><dd>{issuedCert.scope}</dd></div>
                      {issuedCert.artifactUrl && (
                        <div><dt>결과물</dt><dd className="cert-url">{issuedCert.artifactUrl}</dd></div>
                      )}
                      <div><dt>발급일</dt><dd>{issuedCert.issuedAt}</dd></div>
                      <div><dt>고유번호</dt><dd>{issuedCert.serial}</dd></div>
                    </dl>
                    <p className="cert-disclaimer">{CERTIFICATE_DISCLAIMER}</p>
                    {/* 잘못 쓰이는 자리를 문서가 직접 막는다. 인쇄본에도 함께 나간다. */}
                    <div className="cert-usage">
                      <b>이 문서를 적는 자리</b>
                      <p>{CERTIFICATE_USAGE_NOTE.allowed}</p>
                      <p>{CERTIFICATE_USAGE_NOTE.forbidden}</p>
                      <p className="cert-usage-example">
                        {CERTIFICATE_USAGE_NOTE.wording
                          .replace("{역량}", issuedCert.competencyLabel || "역량")
                          .replace("{발급일}", issuedCert.issuedAt)}
                      </p>
                    </div>
                    <div className="cert-doc-actions">
                      <button className="secondary" onClick={() => window.print()}>인쇄 · PDF로 저장</button>
                    </div>
                  </article>
                )}
              </div>
            )}
          </div>

          <p className="length-hint" role="status">둘러보지 않아도 다음으로 넘어갈 수 있습니다.</p>
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(2)}>이전</button>
            <button className="primary" onClick={() => moveTo(4)}>다음: 격차·행동 보기 <span>→</span></button>
          </div>
        </section>
      )}

      {journeyOpen && step === 4 && (
        <section className="page-shell flow-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 4 · 목표직무 비교</span><h1>미래 전체가 아니라, 이번 주 한 걸음을 찾습니다.</h1></div>
            <div className="role-chip"><small>대표 목표직무</small><b>{role.label}</b></div>
          </div>
          <RoleSelect roleId={roleId} onSelect={(id) => { setRoleId(id); setQuiz(null); }} />
          <div className="map-grid">
            <section className="paper-card strengths">
              <div className="card-kicker">확인된 현재 역량</div>
              <h2>이미 출발점이 있습니다.</h2>
              {confirmedClaims.length || verifiedPassedComps.length ? (
                <>
                  {confirmedClaims.map((claim) => (
                    <div className="strength-row" key={claim.id}><span>✓</span><p><b>{claim.skill}</b><small>{claim.quote}</small></p><TierBadge tier={claim.tier} /></div>
                  ))}
                  {verifiedPassedComps.map(({ comp, tier }) => (
                    <div className="strength-row" key={comp.id}><span>✓</span><p><b>{comp.label}</b><small>확인한 근거 있음 · 학습확인(이해) 통과</small></p><TierBadge tier={tier} /></div>
                  ))}
                </>
              ) : <p>확인된 역량이 없습니다.</p>}
            </section>
            <section className="paper-card gaps">
              <div className="card-kicker coral">우선 격차</div>
              <h2>더 필요한 것은 이만큼입니다.</h2>
              {gaps.length ? gaps.slice(0, 3).map((gap) => (
                <div className="gap-row" key={gap.id}>
                  <div><b>{gap.label}</b><small>필요 증거: {gap.proof} · Lv.{gap.current}/{gap.required}</small></div>
                    <div className="bar" role="img" aria-label={`요구 Lv.${gap.required} 중 ${gap.current} 확인됨`}>
                    <i style={{ width: `${gap.percent}%` }} />
                  </div>
                </div>
              )) : <p>선택한 직무의 필수 역량을 이미 확인했습니다. 다른 직무로 바꿔 격차를 확인해 보십시오.</p>}
              <div className="coverage-block">
                <div className="coverage-head">
                  <b>증거 충족도 {roleCoverage.percent}%</b>
                  <small>{roleCoverage.metCount} / {roleCoverage.requiredCount} 항목</small>
                </div>
                <p className="coverage-formula">산정식: {roleCoverage.formula}</p>
                {roleCoverage.basis.length > 0 && (
                  <p className="coverage-list"><b>확인된 요구 증거</b> {roleCoverage.basis.join(" · ")}</p>
                )}
                {roleCoverage.unmet.length > 0 && (
                  <p className="coverage-list"><b>아직 확인되지 않은 항목</b> {roleCoverage.unmet.join(" · ")}</p>
                )}
                <p className="coverage-disclaimer">{roleCoverage.disclaimer}</p>
              </div>
            </section>
          </div>
          <div className="action-section">
            <div className="action-title"><div><span className="eyebrow">격차를 낮추는 행동</span><h2>이번 주에는 하나만 선택합니다.</h2></div><p>중요도 × 격차 × 실행가능성 순으로 골랐습니다.</p></div>
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
                <div className="check-panel"><div className="card-kicker">학습확인 통과</div><h3>‘{label}’ 이해도 확인 완료</h3><div className="check-result pass">이해도 확인을 통과했습니다. 이 역량에 확인한 근거가 있으면 수행 확인(Lv.2)에 반영되고, 아직 없으면 근거를 먼저 확인해 주십시오.</div><div className="check-actions">{gaps.length ? <button className="check-cta" onClick={startCheck}>다음 격차 확인 →</button> : <span className="check-done">✓ 남은 우선 격차 없음</span>}<button className="secondary" onClick={closeCheck}>닫기</button></div></div>
              );
              if (quiz.status === "locked") return (
                <div className="check-panel"><div className="card-kicker coral">추가 학습 필요</div><h3>‘{label}’ 3회 미통과</h3><div className="check-result fail">등급을 올리지 않았습니다. 추천 학습을 완료한 뒤 다시 확인해 주십시오.</div><div className="check-actions"><button className="check-cta" onClick={retryCheck}>다시 시도</button><button className="secondary" onClick={closeCheck}>닫기</button></div></div>
              );
              return (
                <div className="check-panel"><div className="card-kicker">학습확인 · 이해도 점검</div><h3>‘{label}’ 이해도 확인</h3><p>2문항 · 최대 3회. 통과 자체가 증거가 되지는 않으며, 확인한 근거가 있을 때만 수행 확인(Lv.2)에 반영됩니다.</p>
                  {quiz.questions.map((qq, qi) => (
                    <div className="check-q" key={qi}><p>Q{qi + 1}. {qq.q}</p><div className="check-opts">{qq.options.map((op, oi) => (<button key={oi} className={`check-opt ${quiz.picks[qi] === oi ? "picked" : ""}`} onClick={() => pickAnswer(qi, oi)}>{op}</button>))}</div></div>
                  ))}
                  <div className="check-actions"><span className="attempts">시도 {quiz.attempt}/3</span><button className="check-cta" onClick={submitCheck}>제출</button><button className="secondary" onClick={closeCheck}>취소</button></div>
                </div>
              );
            }
            if (!gaps.length) return null;
            return (
              <div className="check-panel"><div className="card-kicker">학습확인 (선택)</div><h3>‘{gaps[0].label}’ 30초 이해도 확인</h3><p>추천 학습을 이해했는지 2문항으로 확인합니다. 통과 자체가 증거가 되지는 않으며, 이 역량에 확인한 근거가 있을 때만 수행 확인(Lv.2)에 반영됩니다.</p><div className="check-actions"><button className="check-cta" onClick={startCheck}>학습확인 시작 →</button></div></div>
            );
          })()}
          {confirmedClaims.length === 0 && (
            <div className="zero-note" role="status">
              다음 단계로 가려면 내 경험에서 확인할 수 있는 근거를 하나 이상 선택해 주십시오.
              {passedComps.length > 0
                ? " 학습확인은 이해도를 점검할 뿐, 그 자체로는 증거를 대신하지 않습니다."
                : " ‘이전’으로 돌아가 후보를 최소 1개 확인하거나, 경험 단계에서 내용을 보강한 뒤 다시 분석해 주십시오."}
            </div>
          )}
          <div className="footer-actions">
            <button className="secondary" onClick={() => moveTo(3)}>이전</button>
            <button
              className="primary"
              disabled={confirmedClaims.length === 0}
              onClick={() => { setProofDate(formatProofDate(new Date())); moveTo(5); }}
            >
              GapProof 만들기 <span>→</span>
            </button>
          </div>
        </section>
      )}

      {journeyOpen && step === 5 && (
        <section className="page-shell flow-page proof-page">
          <div className="section-head">
            <div><span className="eyebrow">STEP 5 · 증거에서 행동까지</span><h1 ref={proofHeadingRef} tabIndex={-1}>설명이 아니라, 바로 실행할 다음 걸음이 생겼습니다.</h1></div>
            <span className="complete-badge">{analysisSource === "solar" ? "✓ 분석 여정 완료" : "✓ 샘플 여정 완료"}</span>
          </div>
          <p className="selfserve-note">상담사 없이도 위 카드와 추천만으로 바로 시작할 수 있습니다. Gap Brief는 원할 때 상담사·기관의 검증과 K-MOOC·직업훈련 연계를 위한 <b>선택</b> 자료입니다.</p>
          <div className="proof-grid">
            <article className="proof-card personal-proof">
              <div className="proof-header"><div><span className="brand-mark small"><BrandGlyph /></span><b>GapProof</b></div><span>개인용 증거카드</span></div>
              <div className="identity"><small>목표직무</small><h2>{role.label}</h2><p>{role.blurb}</p></div>
              <div className="proof-block"><span>확인된 역량</span>{confirmedClaims.map((claim) => <div className="proof-skill" key={claim.id}><b>{claim.skill}</b><TierBadge tier={claim.tier} /></div>)}{verifiedPassedComps.map(({ comp, tier }) => <div className="proof-skill" key={comp.id}><b>{comp.label} · 이해 확인</b><TierBadge tier={tier} /></div>)}</div>
              <div className="proof-block quote-block"><span>대표 근거</span><blockquote>“{confirmedClaims[0]?.quote ?? "확인된 근거를 추가해 주십시오."}”</blockquote></div>
              {/* 추천이 비어 있으면 빈 제목만 남은 칸이 인쇄된다 — 그럴 때는 무엇을 하라는 안내로 대체한다. */}
              <div className="chosen-action">
                <span>이번 주 다음 행동</span>
                {chosenAction ? (
                  <>
                    <b>{chosenAction.title}</b>
                    <small>{chosenAction.rule}</small>
                  </>
                ) : (
                  <>
                    <b>아직 정하지 않았습니다.</b>
                    <small>부족한 근거를 하나 고르면 다음 행동을 제안해 드립니다.</small>
                  </>
                )}
              </div>
              <footer><span>{analysisSource === "solar" ? `Solar ${analysisModel}` : "샘플 규칙"} 제안 → 사용자 확인 완료</span><b>{proofDate}</b></footer>
            </article>

            <article className="proof-card counselor-proof">
              <div className="proof-header"><div><span className="brief-mark">1P</span><b>Gap Brief</b></div><span>선택 · 상담사·기관 검증용</span></div>
              <div className="brief-section"><span>상담 목표</span><h2>과거 설명보다 다음 행동 합의에 시간을 씁니다.</h2></div>
              <div className="brief-columns">
                <div><span>현재 강점</span><ul>{confirmedClaims.map((claim) => <li key={claim.id}>{claim.skill}</li>)}</ul></div>
                <div><span>우선 격차</span><ul>{gaps.slice(0, 3).map((gap) => <li key={gap.id}>{gap.label} (Lv.{gap.current}/{gap.required})</li>)}</ul></div>
              </div>
              <div className="brief-section questions"><span>다음 상담 질문</span><ol>{confirmedClaims.slice(0, 2).map((claim) => <li key={claim.id}>{claim.question}</li>)}<li>이 행동을 끝냈다고 판단할 증거는 무엇입니까?</li></ol></div>
              <div className="privacy-note"><b>기관 공유 범위</b><p>{aggregateConsent ? "익명 격차 항목 공유에 동의 · 개인 원문 제외" : "익명 통계 공유 안 함 · 개인 카드만 사용"}</p></div>
              <footer><span>상담 보조자료 · 자동판정 아님</span><b>검토 필요</b></footer>
            </article>
          </div>
          <div className="story-callout"><span>GapProof의 약속</span><p>“미래를 예측해 주는 AI가 아니라, 불확실한 미래에도 다시 움직일 수 있게 하는 AI.”</p></div>
          <div className="footer-actions final-actions">
            <button className="secondary" onClick={() => moveTo(4)}>행동 다시 고르기</button>
            <button className="secondary" onClick={copyShareLink}>링크 복사</button>
            <button className="secondary" onClick={shareViaSystem}>공유하기</button>
            {kakaoReady && (
              <button className="secondary kakao-share" onClick={shareViaKakao}>카카오톡 공유</button>
            )}
            <button className="secondary" onClick={() => window.print()}>PDF로 저장 · 인쇄</button>
            <button className="primary" onClick={sampleMode ? restartSample : requestDelete}>{sampleMode ? "체험 처음부터 시작하기" : "새 분석 시작하기"} <span>↻</span></button>
          </div>
          <p className="share-note">공유하기·카카오톡 공유에는 목표 직무, 확인한 역량 개수, 이번 주 행동만 담깁니다 — 경험 원문이나 역량 설명·근거는 포함되지 않습니다. (링크 복사는 주소만 복사합니다.)</p>
        </section>
      )}


      {/* Gate 5(#41): 모델 선택 — 모바일 Bottom Sheet / 데스크톱 Dialog (CSS 분기) */}
      <dialog
        ref={modelDialogRef}
        className="model-dialog"
        aria-label="AI 분석 모델 선택"
        onClose={() => { if (modelDialogOpen) closeModelDialog(); }}
        onCancel={() => { if (modelDialogOpen) closeModelDialog(); }}
      >
        <div className="model-dialog-head">
          <b>AI 분석 모델 선택</b>
          <p>모델마다 성격이 다릅니다. [공식]은 Upstage 소개 기반, [자체]는 GapProof 관찰이며 검증 전 항목은 &ldquo;평가 중&rdquo;으로 표시합니다.</p>
        </div>
        <div className="model-cards" role="radiogroup" aria-label="Solar 모델">
          {SOLAR_MODELS.map((option) => (
            <label key={option.id} className={`model-card ${pendingModelId === option.id ? "selected" : ""}`}>
              <input
                type="radio"
                name="solar-model"
                value={option.id}
                checked={pendingModelId === option.id}
                onChange={() => setPendingModelId(option.id)}
              />
              <span className="model-card-head">
                <b>{option.fullName}</b>
                <span className="model-badge">{option.badge}</span>
                {pendingModelId === option.id && <span className="model-selected">현재 선택</span>}
              </span>
              <span className="model-card-line"><i>[공식]</i>{option.officialNote}</span>
              <span className="model-card-line"><i>[공식]</i>잘 맞는 입력: {option.goodFor}</span>
              <span className="model-card-line"><i>[자체]</i>상대 속도: {option.relativeSpeed}</span>
              <span className="model-card-line"><i>[자체]</i>긴 글: {option.longText}</span>
              <span className="model-card-line"><i>[자체]</i>근거 추출: {option.evidenceExtraction}</span>
              <span className="model-card-line caution"><i>주의</i>{option.caution}</span>
            </label>
          ))}
        </div>
        <div className="model-dialog-actions">
          <button className="secondary" onClick={() => closeModelDialog()}>취소</button>
          <button className="primary" onClick={applyModel}>이 모델 사용</button>
        </div>
      </dialog>

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <nav className="footer-nav" aria-label="정보 페이지">
          <a href="/about">소개</a>
          <a href="/guide">이용 가이드</a>
          <a href="/how-it-works">작동 원리</a>
          <a href="/technology">기술과 검증</a>
          <a href="/privacy">개인정보 처리방침</a>
          <a href="/terms">이용약관</a>
        </nav>
        <p>{analysisSource === "solar" ? "Solar 실연결" : "샘플 데이터"} · 취업 또는 적성 판정이 아닙니다</p>
        {journeyOpen && (
          <button className="text-button" onClick={sampleMode ? exitSample : lockDemo}>{sampleMode ? "체험 나가기" : "데모 나가기"}</button>
        )}
      </footer>
    </main>
  );
}
