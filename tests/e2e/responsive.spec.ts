import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { label: "mobile-320", width: 320, height: 690 },
  { label: "mobile-360", width: 360, height: 780 },
  { label: "mobile-375", width: 375, height: 812 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "mobile-430", width: 430, height: 932 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

// /technology 는 화면 폭에 맞춰 줄어드는 시각화가 있어 좁은 폭에서 반드시 확인해야 한다.
const PATHS = ["/", "/demo", "/why", "/technology", "/login", "/privacy"];

test.describe("반응형 뷰포트 검사", () => {
  for (const viewport of VIEWPORTS) {
    for (const path of PATHS) {
      test(`${viewport.label} — ${path} 가로 오버플로가 없다`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(path, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scrollWidth - overflow.clientWidth,
          `scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
        ).toBeLessThanOrEqual(1);
      });
    }
  }
});
