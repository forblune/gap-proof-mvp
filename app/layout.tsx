import type { Metadata } from "next";
import "./globals.css";
import { FeedbackWidget } from "./components/feedback-widget";

const SITE_URL = "https://gapproof.forblune.com";
const SITE_TITLE = "GapProof | 공백을 증거로";
const SITE_DESCRIPTION =
  "흩어진 경험을 역량 증거와 다음 행동으로 연결하는 Solar 기반 AI 진로상담 지원 프로토타입";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GapProof",
    locale: "ko_KR",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GapProof — 공백을 증거로" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// 테마 우선순위: localStorage 저장값 > prefers-color-scheme > 라이트 기본값.
// 하이드레이션·첫 페인트 이전에 동기 실행되어야 깜빡임(FOIT)이 없다 — React가 아니라
// 순수 스크립트 태그로 <html>에 data-theme을 직접 찍는다.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("gapproof-theme");var t=s==="light"||s==="dark"?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        {/* 로그인 사용자에게만 보이는 피드백 버튼(컴포넌트가 세션을 확인해 스스로 숨는다) */}
        <FeedbackWidget />
      </body>
    </html>
  );
}
