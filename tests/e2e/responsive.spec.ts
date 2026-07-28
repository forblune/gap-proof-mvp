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

// 심사 지적: .progress 가 repeat(6, 1fr) 이라 좁은 화면에서 뒤쪽 단계가 잘렸는데,
// .progress-wrap 의 overflow:hidden 이 scrollWidth 검사를 통과시켜 아무 테스트도 잡지 못했다.
// 가로 스크롤이 없다는 것과 정보가 보인다는 것은 다른 문제다.
test.describe("진행 단계가 좁은 화면에서 잘리지 않는다", () => {
  for (const width of [320, 360, 375]) {
    test(`${width}px — 6단계가 모두 보이고 현재 단계를 글로 알린다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/demo?sample=1", { waitUntil: "networkidle" });

      const consent = page.locator(".check-row input").first();
      await expect(consent).toBeVisible({ timeout: 20_000 });
      await consent.check();
      await page.getByRole("button", { name: /샘플로 둘러보기|내 경험에서 시작하기/ }).click();
      await expect(page.locator(".progress")).toBeVisible({ timeout: 15_000 });

      const result = await page.evaluate(() => {
        const list = document.querySelector(".progress");
        if (!list) return null;
        // 감싸는 요소의 border box 와 비교하면 좌우 패딩만큼(최대 36px) 잘려도 통과한다.
        // 실제 배치 영역인 ol 자체와 비교한다.
        const wrapBox = list.getBoundingClientRect();
        const items = [...list.querySelectorAll("li")];
        return {
          total: items.length,
          clipped: items.filter((li) => {
            const box = li.getBoundingClientRect();
            return box.right > wrapBox.right + 0.5 || box.left < wrapBox.left - 0.5 || box.width < 1;
          }).length,
        };
      });

      expect(result?.total).toBe(6);
      expect(result?.clipped, "진행 단계가 잘려 나갔습니다").toBe(0);
      // 라벨이 숨는 폭에서는 현재 위치를 글로 알려야 한다.
      await expect(page.locator(".progress-current")).toBeVisible();
    });
  }
});
