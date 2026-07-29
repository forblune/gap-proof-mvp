// 브랜드 자산을 하나의 원본에서 생성한다.
//
// 왜 필요한가: 자산마다 로고를 따로 그려 두었더니 **네 가지 서로 다른 로고**가 배포돼 있었다.
//   - 앱 본체(brand-mark.tsx)      링 r=20 · 화살촉 밑변 15.0
//   - favicon.svg                  같은 좌표에 scale(0.75) 를 한 번 더 걸어 더 작았다
//   - icon-192/512/maskable        화살촉이 떨어져 나온 사각 얼룩 — 화살표로 읽히지 않았다
//   - og.png                       또 다른 좌표·다른 색
// 이 스크립트가 유일한 원본이다. 좌표를 바꾸려면 아래 GLYPH 만 고치고 다시 실행한다.
// brand-mark.tsx / brand-motion.tsx 의 마지막 단계와 좌표가 같아야 하며,
// tests/brand-assets.test.mjs 가 그 일치를 검사한다.
//
// 실행: node scripts/build-brand-assets.mjs
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

// ── 로고 원본 ────────────────────────────────────────────────────────────────
// viewBox 64×64. brand-mark.tsx 와 정확히 같아야 한다.
// 화살촉은 뒤가 파인 4점 폴리곤이다. 밑변이 평평한 삼각형은 획과 만나는 자리에서
// 아래로 얇은 가시가 튀고 위로는 홈이 생겼다 — 획은 거의 수평인데 촉만 30° 기울어서다.
// 축(30°)과 나란한 직선 구간 `L` 을 획 끝에 두어 촉이 획에 얹히게 했다.
export const GLYPH = {
  ring: "M33.6 13.1 A19 19 0 1 0 47.6 42.9",
  bar: "M31 32 H38 Q42 32 45.46 30 L47.2 29",
  head: "61.49,20.75 52,37.31 50.83,26.9 42.4,20.69",
  strokeWidth: 8.5,
  // 잉크의 실제 경계 — 링 바깥(중심 32 ± (19 + 8.5/2))과 화살촉 꼭짓점으로 정해진다.
  box: { x0: 8.75, y0: 8.75, x1: 61.49, y1: 55.25 },
};

const BRAND = { indigo: "#3454c5", mid: "#1f86ae", green: "#0eb178" };
const NAVY = "#172033";
const WHITE = "#ffffff";

/** 잉크 상자를 64 좌표계 한가운데로 옮기고 `fill` 비율만큼 키우는 transform */
function fit(fill) {
  const { x0, y0, x1, y1 } = GLYPH.box;
  const w = x1 - x0;
  const s = (64 * fill) / w;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return `translate(${(32 - s * cx).toFixed(3)} ${(32 - s * cy).toFixed(3)}) scale(${s.toFixed(5)})`;
}

/** 로고 본체. paint 가 문자열이면 단색, "grad" 면 브랜드 그라데이션. */
function glyphBody(paint) {
  const p = paint === "grad" ? "url(#gp)" : paint;
  return `<path d="${GLYPH.ring}" fill="none" stroke="${p}" stroke-width="${GLYPH.strokeWidth}" stroke-linecap="round"/>`
    + `<path d="${GLYPH.bar}" fill="none" stroke="${p}" stroke-width="${GLYPH.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<polygon points="${GLYPH.head}" fill="${p}"/>`;
}

// gradientUnits="userSpaceOnUse" — 기본값이면 요소마다 제 경계상자로 색을 다시 매핑해서
// 링과 가로획의 이음매에서 색이 눈에 띄게 어긋난다.
const GRAD_DEF = `<defs><linearGradient id="gp" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="58" y2="54">`
  + `<stop offset="0%" stop-color="${BRAND.indigo}"/><stop offset="55%" stop-color="${BRAND.mid}"/>`
  + `<stop offset="100%" stop-color="${BRAND.green}"/></linearGradient></defs>`;

/**
 * @param {object} o
 * @param {string|null} o.bg      배경색(null 이면 투명)
 * @param {number|null} o.radius  배경 모서리 반경(64 좌표계). null 이면 배경 없음
 * @param {string} o.paint        "grad" 또는 색상값
 * @param {number} o.fill         로고가 차지하는 폭 비율
 */
export function iconSvg({ bg = null, radius = 14, paint = "grad", fill = 0.62 }) {
  const needsGrad = paint === "grad";
  const rect = bg ? `<rect width="64" height="64"${radius ? ` rx="${radius}"` : ""} fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`
    + (needsGrad ? GRAD_DEF : "")
    + rect
    + `<g transform="${fit(fill)}">${glyphBody(paint)}</g></svg>`;
}

// ── PNG/ICO 렌더 ─────────────────────────────────────────────────────────────
async function renderPng(html, width, height, out, scale = 1) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  await page.setContent(html);
  await page.waitForTimeout(120);
  const buf = await page.screenshot({ omitBackground: true });
  writeFileSync(out, buf);
  await browser.close();
  return buf;
}

/** PNG 를 그대로 품는 최소 ICO. 브라우저는 PNG 내장 ICO 를 지원한다. */
function icoFromPng(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width (0 == 256)
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, pngBuf]);
}

const page = (svg, w, h, bg = "transparent") =>
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${bg}}
   svg{display:block;width:${w}px;height:${h}px}</style>${svg}`;

async function main() {
  // 1. favicon.svg — 탭 아이콘. 16px 까지 줄어들므로 여백을 적게 준다.
  const faviconSvg = iconSvg({ bg: NAVY, radius: 14, paint: WHITE, fill: 0.72 });
  writeFileSync(join(PUBLIC, "favicon.svg"), faviconSvg + "\n");

  // 2. favicon.ico 48×48
  const icoPng = await renderPng(page(faviconSvg, 48, 48), 48, 48, join(PUBLIC, "favicon-tmp.png"));
  writeFileSync(join(PUBLIC, "favicon.ico"), icoFromPng(icoPng, 48));

  // 3. 앱 아이콘 — 둥근 사각 + 흰 로고
  const appSvg = iconSvg({ bg: NAVY, radius: 14, paint: WHITE, fill: 0.62 });
  for (const size of [192, 512]) {
    await renderPng(page(appSvg, size, size), size, size, join(PUBLIC, `icon-${size}.png`));
  }

  // 4. maskable — 플랫폼이 어떤 모양으로 잘라도 잘리지 않도록 배경을 꽉 채우고(모서리 없음),
  //    로고는 안전영역(중앙 80% 원) 안에 둔다. 대각 반지름 기준으로 계산하면 폭 비율 0.60.
  const maskSvg = iconSvg({ bg: NAVY, radius: 0, paint: WHITE, fill: 0.6 });
  await renderPng(page(maskSvg, 512, 512), 512, 512, join(PUBLIC, "icon-512-maskable.png"));

  // 5. apple-touch — iOS 가 자체 마스크를 씌우므로 배경을 꽉 채운다(투명 금지).
  const appleSvg = iconSvg({ bg: NAVY, radius: 0, paint: WHITE, fill: 0.62 });
  await renderPng(page(appleSvg, 180, 180), 180, 180, join(PUBLIC, "apple-touch-icon.png"));

  // 6. press/logo.png — 노션 페이지 아이콘 등 외부용. 배경 없이 그라데이션 로고.
  const pressSvg = iconSvg({ bg: null, paint: "grad", fill: 0.92 });
  await renderPng(page(pressSvg, 320, 320), 320, 320, join(PUBLIC, "press/logo.png"));

  // 7. og.png — 공유 카드
  const ogGlyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`
    + GRAD_DEF + `<g transform="${fit(0.94)}">${glyphBody("grad")}</g></svg>`;
  const og = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0}
    .card{width:1200px;height:630px;background:#f2f4f8;display:flex;align-items:center;gap:74px;padding:0 96px;box-sizing:border-box;
          font-family:-apple-system,system-ui,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;position:relative}
    .card::before{content:"";position:absolute;inset:0 0 auto 0;height:10px;background:linear-gradient(90deg,${BRAND.indigo},${BRAND.mid},${BRAND.green})}
    .logo{width:250px;height:250px;flex:0 0 auto}.logo svg{width:100%;height:100%;display:block}
    h1{margin:0;font-size:78px;letter-spacing:-.035em;color:${NAVY};font-weight:850}
    h1 em{font-style:normal;color:${BRAND.green}}
    p.lead{margin:18px 0 0;font-size:33px;color:#2b3548;font-weight:650}
    .rule{width:76px;height:6px;border-radius:3px;background:${BRAND.green};margin:30px 0 26px}
    p.sub{margin:0;font-size:23px;line-height:1.6;color:#5a6478}
  </style><div class="card">
    <div class="logo">${ogGlyph}</div>
    <div><h1>Gap<em>Proof</em></h1>
      <p class="lead">경험을 근거로, 가치를 증명하다</p>
      <div class="rule"></div>
      <p class="sub">취업 또는 적성 판정이 아닙니다<br>운영: Forblune</p>
    </div></div>`;
  await renderPng(og, 1200, 630, join(PUBLIC, "og.png"));

  // 임시 파일 정리
  const { unlinkSync } = await import("node:fs");
  try { unlinkSync(join(PUBLIC, "favicon-tmp.png")); } catch { /* 이미 없으면 무시 */ }

  console.log("브랜드 자산 생성 완료:");
  for (const f of ["favicon.svg", "favicon.ico", "icon-192.png", "icon-512.png",
                   "icon-512-maskable.png", "apple-touch-icon.png", "og.png", "press/logo.png"]) {
    console.log(" -", f, readFileSync(join(PUBLIC, f)).length, "bytes");
  }
}

if (process.argv[1] && process.argv[1].endsWith("build-brand-assets.mjs")) await main();
