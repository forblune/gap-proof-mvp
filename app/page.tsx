// Gate 2a(#36): 공개 홈 — 설명 없이 이 페이지만 보고도 문제·대상·작동 방식·기술·범위를
// 이해할 수 있게 하는 제품 스토리. 게이트 없음(데모 진입은 /demo에서 게이트 유지).
// 사례는 전부 가상 인물이며 실존 개인정보를 사용하지 않는다.
import type { Metadata } from "next";
import BrandGlyph from "./components/brand-mark";
import MobileDrawerNav from "./components/mobile-drawer-nav";
import { NAV_ITEMS } from "./components/site-nav";

export const metadata: Metadata = {
  title: "GapProof | 경험을 증거로 바꾸는 진로 탐색",
  description:
    "돌봄, 아르바이트, 게임, 독학, 쉬었던 시간까지 — 삶에서 실제로 한 행동을 근거로 역량 후보를 찾고 다음 진로 탐색으로 연결합니다.",
  alternates: { canonical: "/" },
};

const CASES = [
  {
    id: "game",
    tag: "게임·커뮤니티",
    raw: "“밤마다 길드 레이드 일정 짜고, 신규 멤버 30명한테 공략 설명하는 문서를 만들었어요. 분쟁 나면 중재도 제가 했고요. 이런 게 경력이 되나요?”",
    actions: ["40인 일정 조율을 6개월간 반복", "신규 멤버용 공략 문서 작성·업데이트", "구성원 갈등 중재"],
    candidate: "운영 커뮤니케이션·문서화",
    quote: "신규 멤버 30명한테 공략 설명하는 문서를 만들었어요",
    verify: "문서 실물(스크린샷·링크)이 남아 있나요?",
    risk: "‘게임을 잘함’ 자체는 역량 후보로 쓰지 않아요 — 남긴 행동만 봅니다.",
    hypothesis: "커뮤니티 운영·CS 기획 (가설)",
    smallStep: "공략 문서 1개를 포트폴리오 형식으로 정리해 보기",
  },
  {
    id: "care",
    tag: "가족 돌봄",
    raw: "“2년간 할머니 간병하면서 병원 일정, 약, 보험 서류를 제가 다 관리했어요. 그동안 일은 못 했으니까 공백기죠.”",
    actions: ["복수 기관 일정·서류를 2년간 단독 관리", "복약·상태 기록 체계 유지", "돌발 상황 우선순위 판단"],
    candidate: "일정·기록 관리와 이해관계 조율",
    quote: "병원 일정, 약, 보험 서류를 제가 다 관리했어요",
    verify: "관리에 쓴 기록(달력·표·메모)이 남아 있나요?",
    risk: "돌봄 경험만으로 의료 역량을 단정하지 않아요.",
    hypothesis: "운영 관리·고객 지원 (가설)",
    smallStep: "당시 관리 방식을 한 장의 절차표로 재구성해 보기",
  },
  {
    id: "mix",
    tag: "아르바이트·SNS·취미 혼합",
    raw: "“카페 알바 3년에 취미로 빵 계정 운영했고, 영상 편집도 독학했어요. 다 따로따로라 뭐가 되는 건지 모르겠어요.”",
    actions: ["단골 응대 패턴을 정리해 신입에게 전수", "SNS 계정 콘텐츠 300건 제작·반응 분석", "영상 편집 독학 후 계정에 적용"],
    candidate: "콘텐츠 제작·반응 분석",
    quote: "빵 계정 운영했고, 영상 편집도 독학했어요",
    verify: "반응이 좋았던 콘텐츠와 그 이유를 설명할 수 있나요?",
    risk: "SNS를 오래 했다는 사실만으로 마케터로 단정하지 않아요.",
    hypothesis: "콘텐츠 마케팅 어시스턴트 (가설)",
    smallStep: "반응 상위 3개 콘텐츠의 공통점을 한 장으로 분석해 보기",
  },
] as const;

export default function HomePage() {
  return (
    <main className="home">
      <header className="topbar info-bar">
        <a className="brand" href="/" aria-label="GapProof 홈">
          <span className="brand-mark"><BrandGlyph /></span>
          <span>GapProof</span>
        </a>
        <nav className="info-nav" aria-label="정보 페이지">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          <a className="nav-cta" href="/demo">데모 열기 →</a>
        </nav>
        <MobileDrawerNav />
      </header>

      {/* 1. Hero — 하이브리드 방향: 핵심 진입 구간은 다크 네이비로 무게감을 준다 */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-inner">
          <p className="eyebrow">삶의 경험 → 확인된 증거 → 이번 주 한 걸음</p>
          <h1 id="home-hero-title">경력이라고 생각하지 않았던 경험에서<br /><em>다음 가능성</em>을 발견하세요.</h1>
          <p className="lead">
            돌봄, 아르바이트, 게임, 취미, 독학, 쉬었던 시간까지. GapProof는 삶에서 실제로 한 행동을
            근거로 역량 후보를 찾고, 확인 질문과 작은 실험을 통해 다음 진로 탐색으로 연결합니다.
          </p>
          <div className="home-cta-row">
            <a className="primary" href="/demo">내 경험에서 가능성 찾기 →</a>
            <a className="secondary" href="/demo?sample=1">샘플로 둘러보기</a>
          </div>
          <p className="fine-print">샘플은 코드 없이 볼 수 있어요 · 실제 분석은 심사·멘토링용 데모 코드로 입장해요 · 취업 가능성이나 적성을 판정하지 않습니다.</p>
        </div>
      </section>

      {/* 2. 왜 필요한가 */}
      <section className="home-section" aria-labelledby="home-why">
        <p className="eyebrow">왜 필요한가</p>
        <h2 id="home-why">경험이 없는 게 아니라, 경력의 언어로 옮기지 못했을 뿐입니다.</h2>
        <div className="home-grid three">
          <div className="home-card"><b>이력서 밖의 시간</b><p>학력·직장 중심의 경력 관점은 돌봄·독학·커뮤니티·휴식기의 실제 행동을 담지 못해요.</p></div>
          <div className="home-card"><b>근거 없는 판정의 피로</b><p>적성·합격 가능성을 점수로 말하는 도구는 근거를 보여주지 못하고, 사람을 위축시켜요.</p></div>
          <div className="home-card"><b>멈춘 시작</b><p>“무엇이 부족한가”만 들으면 시작할 수 없어요. 가진 것의 증거에서 출발해야 해요.</p></div>
        </div>
        <a className="home-more" href="/why">자세히 보기 →</a>
      </section>

      {/* 3. 누구를 위한가 */}
      <section className="home-section" aria-labelledby="home-who">
        <p className="eyebrow">누구를 위한가</p>
        <h2 id="home-who">이런 분을 생각하며 만들었습니다.</h2>
        <ul className="home-audience">
          <li>경력이 없다고 느끼는 분</li>
          <li>공백기·휴학·진로 전환 중인 분</li>
          <li>비공식 경험(돌봄·커뮤니티·취미)이 많은 분</li>
          <li>관심사가 흩어져 정리가 안 되는 분</li>
          <li>AI와의 대화에 자기 경험이 쌓여 있는 분</li>
          <li>진로상담 전에 경험을 정리하고 싶은 분</li>
        </ul>
        <a className="home-more" href="/who">자세히 보기 →</a>
      </section>

      {/* 4. 어떤 경험을 입력할 수 있는가 */}
      <section className="home-section" aria-labelledby="home-input">
        <p className="eyebrow">어떤 경험이 가능한가</p>
        <h2 id="home-input">잘 정리하지 않아도, 이런 경험이면 충분해요.</h2>
        <div className="home-chips" role="list">
          {["학교·전공", "일·아르바이트", "가족 돌봄·간병", "게임·커뮤니티 운영", "SNS·창작 취미", "독학·온라인 강의", "중단한 프로젝트", "쉬었던 시기"].map((chip) => (
            <span role="listitem" key={chip}>{chip}</span>
          ))}
        </div>
        <p className="home-note">이메일·전화번호로 보이는 표현은 분석 전에 자동으로 가려요. 원문은 서버에 저장하지 않아요.</p>
      </section>

      {/* 5. 어떻게 작동하는가 */}
      <section className="home-section" aria-labelledby="home-how">
        <p className="eyebrow">어떻게 작동하는가</p>
        <h2 id="home-how">AI는 제안하고, 확정은 언제나 사용자가 합니다.</h2>
        <ol className="home-steps">
          <li><b>자유롭게 쓰기</b><span>정리되지 않은 그대로 적어요.</span></li>
          <li><b>AI가 후보 제안</b><span>Solar가 실제 행동과 원문 근거를 함께 찾아요.</span></li>
          <li><b>사용자가 확인</b><span>맞아요·수정·거절 — 하나도 확인하지 않으면 진행되지 않아요.</span></li>
          <li><b>격차와 한 걸음</b><span>목표 직무와의 거리, 이번 주 행동, 증거카드로 이어져요.</span></li>
        </ol>
        <a className="home-more" href="/how-it-works">작동 원리 전체 보기 →</a>
      </section>

      {/* 6. Before/After 사례 */}
      <section className="home-section" aria-labelledby="home-cases">
        <p className="eyebrow">가상 사례 3가지</p>
        <h2 id="home-cases">이렇게 바뀝니다 — 정리되지 않은 말에서, 확인된 증거로.</h2>
        <p className="home-note">아래는 이해를 돕기 위한 가상 사례예요. 실존 인물의 정보가 아닙니다.</p>
        <div className="home-cases">
          {CASES.map((c) => (
            <article className="home-case" key={c.id} aria-label={`가상 사례: ${c.tag}`}>
              <p className="case-tag">{c.tag}</p>
              <blockquote>{c.raw}</blockquote>
              <dl className="case-facts">
                <div className="fact fact-evidence">
                  <dt>확인된 행동</dt>
                  <dd><ul>{c.actions.map((a) => <li key={a}>{a}</li>)}</ul></dd>
                </div>
                <div className="fact fact-candidate">
                  <dt>역량 후보</dt>
                  <dd><b>{c.candidate}</b> — 근거: “{c.quote}”</dd>
                </div>
                <div className="fact fact-verify">
                  <dt>더 확인할 것</dt>
                  <dd>{c.verify}</dd>
                </div>
                <div className="fact fact-caution">
                  <dt>과장하지 않기</dt>
                  <dd>{c.risk}</dd>
                </div>
                <div className="fact fact-hypothesis">
                  <dt>직업 가설</dt>
                  <dd>{c.hypothesis}</dd>
                </div>
                <div className="fact fact-action">
                  <dt>이번 주 작은 실험</dt>
                  <dd>{c.smallStep}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* 7. AI 모델 */}
      <section className="home-section" aria-labelledby="home-model">
        <p className="eyebrow">AI 모델 선택</p>
        <h2 id="home-model">분석 전에 Solar 모델을 직접 고를 수 있어요.</h2>
        <div className="home-grid three">
          <div className="home-card"><b>Solar Pro 3 · 기본</b><p>복잡한 경험 분석에 적합한 최신 모델이에요.</p></div>
          <div className="home-card"><b>Solar Pro 2</b><p>안정적인 고성능 모델이에요.</p></div>
          <div className="home-card"><b>Solar Mini</b><p>빠르고 가벼운 분석용 모델이에요.</p></div>
        </div>
        <p className="home-note">서버에 등록된 모델만 사용돼요. 실제 연결인지 샘플인지 화면 배지로 항상 구분해요.</p>
      </section>

      {/* 8. 기술·안전·검증 */}
      <section className="home-section" aria-labelledby="home-tech">
        <p className="eyebrow">기술·안전·검증</p>
        <h2 id="home-tech">쓴 기술만 말하고, 검증한 만큼만 주장합니다.</h2>
        <div className="home-grid four">
          <div className="home-card"><b>무저장 원칙</b><p>경험 원문을 서버에 저장하지 않아요.</p></div>
          <div className="home-card"><b>개인정보 가리기</b><p>이메일·전화번호는 분석 전에 자동으로 가려요.</p></div>
          <div className="home-card"><b>원문 인용 검증</b><p>입력에 없는 문장은 근거로 쓰지 않아요.</p></div>
          <div className="home-card"><b>요청 한도</b><p>과다 요청은 1분 단위로 제한해요.</p></div>
        </div>
        <a className="home-more" href="/technology">기술과 검증 전체 보기 →</a>
      </section>

      {/* 9. 현재와 다음 단계 */}
      <section className="home-section" aria-labelledby="home-now">
        <p className="eyebrow">현재와 다음 단계</p>
        <h2 id="home-now">지금 되는 것과 앞으로 할 것을 구분해서 말해요.</h2>
        <div className="home-grid two">
          <div className="home-card">
            <b>지금 제공해요</b>
            <ul className="home-list">
              <li>코드 없는 샘플 체험 + 5단계 실분석(데모 코드)</li>
              <li>최대 10,000자 입력·TXT/MD 파일 가져오기</li>
              <li>AI 대화 정리 프롬프트로 기존 기록 옮겨오기</li>
              <li>Solar 모델 선택·실연결/샘플 구분</li>
              <li>개인용 증거카드·상담사용 Gap Brief·인쇄</li>
            </ul>
          </div>
          <div className="home-card">
            <b>다음 단계로 준비 중이에요</b>
            <ul className="home-list">
              <li>회원가입·내 기록 저장(법적 문서 정비와 함께)</li>
              <li>PDF·DOCX 파일 첨부</li>
              <li>청년 정책·훈련 정보(온통청년) 연동 검토</li>
              <li>발견 분석 품질의 운영 데이터 기반 고도화</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 10. CTA — 히어로와 같은 다크 네이비로 마무리해 열고 닫는 구조를 만든다 */}
      <section className="home-section home-final" aria-labelledby="home-cta">
        <div className="home-final-inner">
          <h2 id="home-cta">공백을 지우지 않고, 증거로 바꿉니다.</h2>
          <div className="home-cta-row">
            <a className="primary" href="/demo">내 경험에서 가능성 찾기 →</a>
            <a className="secondary" href="/guide">이용 가이드 먼저 보기</a>
          </div>
          <p className="fine-print">GapProof는 취업 가능성이나 적성을 판정하지 않습니다.</p>
        </div>
      </section>

      <footer className="site-footer">
        <p><b>GapProof</b> · Solar 기반 AI 진로상담 지원 프로토타입</p>
        <nav className="footer-nav" aria-label="정보 페이지">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          <a href="/demo">데모</a>
          <a href="/privacy">개인정보 처리방침</a>
          <a href="/terms">이용약관</a>
        </nav>
        <p>취업 또는 적성 판정이 아닙니다</p>
      </footer>
    </main>
  );
}
