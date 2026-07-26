import type { Metadata } from "next";
import { InfoShell } from "../components/info-shell";
import { IconCheck, IconLock, IconClock, IconEyeOff, IconList } from "../components/fact-icons";

export const metadata: Metadata = {
  alternates: { canonical: "/technology" },
  title: "기술과 검증 | GapProof",
  description: "GapProof의 실제 기술 스택·보안 설계·테스트 근거와 알려진 제한사항",
};

const STACK = [
  { name: "Next.js App Router + vinext (Vite)", reason: "파일 기반 라우팅과 서버 라우트를 Cloudflare Workers에서 실행하기 위해" },
  { name: "React 19 · TypeScript(strict)", reason: "5단계 상태 흐름을 타입 안전하게 관리하기 위해" },
  { name: "Cloudflare Workers", reason: "공개 배포와 엣지 실행, 환경변수(secret) 바인딩을 위해" },
  { name: "Upstage Solar API", reason: "한국어 경험 문장의 구조화(JSON 출력)에 적합하고, 국내 생태계 확장성을 고려" },
  { name: "node:test 통합 테스트", reason: "빌드 산출물 Worker를 직접 호출해 실제 응답 계약을 검증하기 위해" },
];

const SECURITY = [
  { name: "접근 게이트", Icon: IconCheck, detail: "데모 코드를 서버가 검증하고 서명된 HttpOnly 쿠키 세션을 발급해요. 환경변수가 없으면 데모가 열리지 않는 fail-closed 방식이에요. 공유용 데모 보호 장치일 뿐, 개인 계정 인증은 아니에요." },
  { name: "API 키 보호", Icon: IconLock, detail: "Solar API 키는 서버 환경에만 있고 브라우저로 전달되지 않아요." },
  { name: "요청 한도", Icon: IconClock, detail: "분석·코드 입력 모두 60초에 10회로 제한해 과다 요청과 무차별 대입을 막아요. 한도 확인이 불가능하면 요청을 거절해요." },
  { name: "개인정보 가리기", Icon: IconEyeOff, detail: "이메일·전화번호·주민등록번호로 보이는 표현은 Solar로 보내기 전에 가리고, 가린 사실을 화면에 알려요." },
  { name: "모델 허용 목록", Icon: IconList, detail: "서버에 등록된 Solar 모델만 사용할 수 있어요. 목록 밖 요청은 거부돼요." },
  { name: "무저장 원칙", Icon: IconLock, detail: "경험 원문을 서버에 저장하지 않아요. &ldquo;새 분석 시작하기&rdquo;는 화면의 모든 상태를 지워요." },
];

const CLASS_APPLIED = [
  "반응형 웹(5개 뷰포트 검증)", "시맨틱 HTML·접근성(라벨·라이브 리전·포커스 관리)", "React 컴포넌트·TypeScript",
  "환경변수·API 키 관리", "국내 LLM(Solar) 활용", "할루시네이션 대응(원문 인용 검증·명시적 폴백)",
  "오류 처리(사용자 메시지 보존)", "자동 테스트", "GitHub Issue → 브랜치 → PR 단위 개발",
];

export default function TechnologyPage() {
  return (
    <InfoShell
      active="/technology"
      eyebrow="Technology"
      title="쓴 기술만 말하고, 검증한 만큼만 주장합니다."
      lead="이 페이지의 내용은 저장소의 실제 코드·테스트와 일치하도록 관리합니다."
    >
      <section className="info-section">
        <h2>실제 기술 스택</h2>
        <div className="table-scroll">
          <table className="info-table">
            <thead><tr><th>기술</th><th>선택 이유</th></tr></thead>
            <tbody>
              {STACK.map((item) => (
                <tr key={item.name}><td><b>{item.name}</b></td><td>{item.reason}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-section">
        <h2>보안·개인정보 설계</h2>
        <ul className="info-cards">
          {SECURITY.map((item) => (
            <li key={item.name}><b><item.Icon />{item.name}</b><p>{item.detail}</p></li>
          ))}
        </ul>
      </section>

      <section className="info-section">
        <h2>검증 방법</h2>
        <p>자동 테스트, 실제 Workers 개발환경, 5개 화면 크기에서 검증했습니다.</p>
        <ul>
          <li>자동 테스트로 입력 경계값, 게이트 인증·위조 쿠키·fail-closed, 요청 한도, 개인정보 가리기, 모델 허용 목록, 서버 렌더링을 검증해요.</li>
          <li>실제 Worker 개발환경(workerd)에서 게이트 세션·요청 한도·보안 헤더를 실측했어요.</li>
          <li>5개 화면 크기(360~1440px)에서 가로 넘침 0, 콘솔 오류 0을 자동으로 확인해요.</li>
          <li>테스트는 유료 Solar API를 호출하지 않도록 격리되어 있어요.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>수업에서 배운 것과 실제 적용</h2>
        <p>AI Reboot 과정에서 배운 내용 중 이 데모에 실제 적용한 것:</p>
        <ul>
          {CLASS_APPLIED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          Supabase와 RLS(행 단위 보안)도 과정에서 학습했지만, 이번 데모는 <b>개인정보를 서버에
          저장하지 않는 설계</b>를 선택했기 때문에 의도적으로 사용하지 않았습니다. 상담사·기관
          계정과 이력 저장이 필요해지는 다음 단계(Phase 2)에서 도입을 검토합니다.
        </p>
      </section>

      <section className="info-section">
        <h2>알려진 제한사항</h2>
        <ul>
          <li>사용자 흐름 검증용 데모(MVP)이며, 기관 시스템 연동과 공식 자격 인정은 포함하지 않아요.</li>
          <li>이름·주소처럼 형식이 없는 개인정보는 자동으로 가려지지 않을 수 있어요 — 입력 안내가 1차 방어예요.</li>
          <li>Solar 실제 응답의 품질·지연은 운영 키 연결 후 계속 측정할 항목이에요.</li>
        </ul>
        <p className="info-repo">
          개발 기록은 GitHub 저장소(현재 비공개)의 이슈·PR 단위로 관리하고 있어요. 심사 과정에서
          요청이 있으면 공개 범위를 조정할 수 있어요.
        </p>
      </section>
    </InfoShell>
  );
}
