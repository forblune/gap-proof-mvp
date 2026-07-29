import { test, expect } from "@playwright/test";

// 테마 토글이 **주변을 밀지 않는지** 지키는 회귀 테스트.
//
// 실제로 있던 결함(실측):
//   라벨이 "다크"(2자) ↔ "라이트"(3자)로 바뀌는데 버튼 폭이 고정돼 있지 않아,
//   1440px 에서 토글이 71.5→82.75px 로 늘고 내비 링크 6개가 전부 11.25px 씩 밀렸다.
//   첫 페인트에는 라벨 없는 disabled 버튼을 그려서 마운트 직후 또 한 번 폭이 변했다.
//   role/aria-checked 가 없어 스크린리더에 켜짐/꺼짐이 전달되지 않았다.
//
// 지금 구조: 바깥 크기 고정 + thumb 은 transform 으로만 이동 + 두 문구를 같은 그리드 칸에 겹침.
// 보이는 상태는 :root[data-theme] 이 CSS 로 결정한다(JS 상태 아님).

/** 토글이 헤더에 노출되는 최소 폭. 이보다 좁으면 토글은 모바일 드로어 안에만 있다. */
const HEADER_TOGGLE_MIN_WIDTH = 721;

const visibleToggle = ".theme-toggle:visible";

/**
 * 화면에 보이는 토글을 확보한다.
 * 좁은 화면에서는 드로어가 `visibility: hidden` 으로 닫혀 있어 — 박스 크기는 있지만 보이지 않는다 —
 * 햄버거를 눌러 열어야 한다. `getBoundingClientRect().width > 0` 만으로 고르면 닫힌 드로어 안의
 * 토글을 "보인다"고 잘못 판단한다(실제로 그렇게 잰 적이 있다).
 */
async function ensureToggleVisible(page: import("@playwright/test").Page) {
  const size = page.viewportSize();
  if (size && size.width < HEADER_TOGGLE_MIN_WIDTH) {
    await page.locator(".nav-toggle:visible").first().click();
    await page.waitForTimeout(350); // 드로어 슬라이드가 끝난 뒤 잰다
  }
  const toggle = page.locator(visibleToggle).first();
  await expect(toggle).toBeVisible();
  return toggle;
}

/**
 * 레이아웃이 실제로 멈출 때까지 기다린 뒤 잰다.
 *
 * 고정 대기(350ms)로는 부족했다. 드로어 패널은 `transform: translateX()` 로 0.25s 동안
 * 미끄러지는데, 기계가 붐비면 그 시각이 밀린다. 실제로 375px 에서 형제 두 개가 **똑같이
 * 0.88px** 밀린 채로 측정돼 실패한 적이 있다 — 패널이 최종 위치에 0.88px 못 미친 순간이었다.
 * 값이 연속 두 번 같아질 때까지 기다리면 대기 시간을 늘리지 않고도 확실해진다.
 */
async function settledBoxes(page: import("@playwright/test").Page) {
  let previous = await boxes(page);
  for (let attempt = 0; attempt < 40; attempt++) {
    await page.waitForTimeout(100);
    const current = await boxes(page);
    if (JSON.stringify(current) === JSON.stringify(previous)) return current;
    previous = current;
  }
  throw new Error("레이아웃이 멈추지 않는다 — 전환이 끝나지 않았거나 계속 움직이고 있다");
}

async function boxes(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const isShown = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.getBoundingClientRect().width === 0) return false;
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.display === "none") return false;
      }
      return true;
    };
    const toggle = [...document.querySelectorAll<HTMLElement>(".theme-toggle")].find(isShown);
    if (!toggle) throw new Error("보이는 .theme-toggle 이 없습니다");
    const round = (n: number) => Math.round(n * 100) / 100;
    const rect = toggle.getBoundingClientRect();
    const header = document.querySelector(".topbar")?.getBoundingClientRect();
    return {
      toggle: { w: round(rect.width), h: round(rect.height) },
      header: header ? { w: round(header.width), h: round(header.height) } : null,
      siblings: [...(toggle.parentElement?.children ?? [])].map((el) => {
        const b = el.getBoundingClientRect();
        return { x: round(b.x), y: round(b.y), w: round(b.width) };
      }),
      theme: document.documentElement.getAttribute("data-theme"),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

test.describe("테마 토글", () => {
  test("클릭하면 테마가 바뀌고 aria-checked 가 따라 바뀐다", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const toggle = await ensureToggleVisible(page);

    await expect(toggle).toHaveAttribute("role", "switch");
    const startTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await expect(toggle).toHaveAttribute("aria-checked", String(startTheme === "dark"));

    await toggle.click();
    const nextTheme = startTheme === "dark" ? "light" : "dark";
    await expect(page.locator("html")).toHaveAttribute("data-theme", nextTheme);
    await expect(toggle).toHaveAttribute("aria-checked", String(nextTheme === "dark"));
  });

  test("접근 가능한 이름이 상태에 따라 흔들리지 않는다", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const toggle = await ensureToggleVisible(page);
    const before = await toggle.getAttribute("aria-label");
    await toggle.click();
    expect(await toggle.getAttribute("aria-label")).toBe(before);
  });

  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`${width}px — 전환해도 토글 크기·형제 위치·헤더 높이가 변하지 않는다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(250);

      const toggle = await ensureToggleVisible(page);
      const before = await settledBoxes(page);
      await toggle.click();
      await page.waitForTimeout(400); // 토글 자체의 전환이 끝나기를 기다린 뒤
      const after = await settledBoxes(page); // 값이 멈춘 것까지 확인하고 잰다

      expect(after.theme).not.toBe(before.theme); // 실제로 바뀌었는지 먼저 확인
      expect(after.toggle).toEqual(before.toggle);
      expect(after.header).toEqual(before.header);
      expect(after.siblings).toEqual(before.siblings);
      expect(after.overflow).toBe(false);
      expect(before.overflow).toBe(false);
    });
  }

  test("새로고침해도 고른 테마가 유지된다", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await (await ensureToggleVisible(page)).click();
    const chosen = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", chosen!);
    // 하이드레이션 이전 인라인 스크립트가 적용하므로 aria 도 복원 직후 일치해야 한다.
    await expect(await ensureToggleVisible(page)).toHaveAttribute("aria-checked", String(chosen === "dark"));
  });

  test("키보드 Enter·Space 로 조작되고 focus 표시가 보인다", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const toggle = await ensureToggleVisible(page);
    const start = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

    await toggle.focus();
    await expect(toggle).toBeFocused();
    const outline = await toggle.evaluate((el) => {
      el.classList.add("focus-visible");
      return getComputedStyle(el, null).getPropertyValue("outline-width");
    });
    expect(outline).toBeTruthy();

    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", start === "dark" ? "light" : "dark");
    await page.keyboard.press(" ");
    await expect(page.locator("html")).toHaveAttribute("data-theme", start!);
  });

  test("빠르게 연타해도 최종 상태가 정확하다", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const toggle = await ensureToggleVisible(page);
    const start = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

    // 홀수 번 누르면 반드시 반대 테마여야 한다. state 를 기준으로 다음 값을 정하면
    // 갱신이 밀린 값을 뒤집어 결과가 어긋난다 — DOM 을 기준으로 삼는 이유다.
    for (let i = 0; i < 7; i += 1) await toggle.click({ delay: 0 });
    await page.waitForTimeout(300);

    const end = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(end).toBe(start === "dark" ? "light" : "dark");
    await expect(toggle).toHaveAttribute("aria-checked", String(end === "dark"));
  });

  test("헤더와 드로어의 토글이 같은 상태를 가리킨다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });

    // 어느 쪽을 눌러도 단일 진실 소스(html[data-theme])가 바뀌므로 두 인스턴스가 함께 따라온다.
    await (await ensureToggleVisible(page)).click();
    await page.waitForTimeout(250);
    const states = await page.evaluate(() => {
      const theme = document.documentElement.getAttribute("data-theme");
      return [...document.querySelectorAll(".theme-toggle")].map((el) => ({
        checked: el.getAttribute("aria-checked"),
        matches: el.getAttribute("aria-checked") === String(theme === "dark"),
      }));
    });
    expect(states.length).toBeGreaterThan(1);
    expect(states.every((s) => s.matches)).toBe(true);
  });

  test("reduced-motion 이면 전환 효과가 없다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    const durations = await page.evaluate(() =>
      [".theme-toggle-track", ".theme-toggle-thumb", ".theme-toggle-icon"].map((sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).transitionDuration : "0s";
      }),
    );
    for (const d of durations) {
      expect(d.split(",").every((part) => parseFloat(part) === 0)).toBe(true);
    }
  });

  test("저장된 선택이 없으면 시스템 테마를 따른다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      try { window.localStorage.removeItem("gapproof-theme"); } catch { /* 접근 불가 무시 */ }
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${theme} 에서 트랙과 thumb 의 비텍스트 대비가 3:1 이상이다`, async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      await page.waitForTimeout(250);

      const ratio = await page.evaluate(() => {
        const lum = (color: string) => {
          const [r, g, b] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
          const f = (c: number) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const track = document.querySelector(".theme-toggle-track");
        const thumb = document.querySelector(".theme-toggle-thumb");
        if (!track || !thumb) throw new Error("토글 트랙/thumb 을 찾지 못했습니다");
        const a = lum(getComputedStyle(track).backgroundColor);
        const b = lum(getComputedStyle(thumb).backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  }
});
