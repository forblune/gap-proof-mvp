import type { MetadataRoute } from "next";

// #24: PWA 아이콘(192/512/maskable)을 실제로 참조시키는 최소 매니페스트.
// 색은 디자인 토큰(--ink, --paper)과 동일 값.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GapProof",
    short_name: "GapProof",
    description: "흩어진 경험을 역량 증거와 다음 행동으로 연결하는 Solar 기반 AI 진로상담 지원 프로토타입",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#17243d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
