import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "laptop-1024", width: 1024, height: 800 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

const PATHS = ["/", "/demo", "/why"];

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
