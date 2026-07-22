import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GapProof | 공백을 증거로",
  description: "흩어진 경험을 역량 증거와 다음 행동으로 연결하는 Solar 기반 AI 진로상담 지원 프로토타입",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
