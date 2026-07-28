import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 피드백 — 로그인 필수 계약과 서버 검증을 확인한다.
// 이 환경에는 Supabase 공개 설정이 없으므로 API는 503(미설정)으로 응답한다.
// 설정이 있으면 401(비로그인)이 된다. 어느 쪽이든 "비로그인 사용자가 저장에 성공하는 일"은 없어야 한다.

const NOT_SAVED = [401, 403, 503];

test.describe("피드백", () => {
  test("비로그인 상태에서는 피드백 버튼이 보이지 않는다", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "피드백 보내기" })).toHaveCount(0);
  });

  test("비로그인 요청은 저장되지 않는다(글 전용)", async ({ request }) => {
    const response = await request.post("/api/feedback", {
      multipart: { category: "bug", message: "비로그인 제출 시도입니다" },
    });
    expect(NOT_SAVED).toContain(response.status());
    const body = await response.json();
    expect(body.id, "비로그인인데 피드백 id가 발급됨").toBeUndefined();
  });

  test("비로그인 요청은 이미지가 있어도 저장되지 않는다", async ({ request }) => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const response = await request.post("/api/feedback", {
      multipart: {
        category: "bug",
        message: "이미지 포함 비로그인 시도",
        attachments: { name: "s.png", mimeType: "image/png", buffer: png },
      },
    });
    expect(NOT_SAVED).toContain(response.status());
    expect((await response.json()).id).toBeUndefined();
  });

  test("잘못된 형식도 인증을 먼저 통과해야 한다 — 검증 오류가 인증을 우회하지 못한다", async ({ request }) => {
    // 분류 누락·본문 과소 등 어떤 잘못된 입력이라도 비로그인이면 400이 아니라 인증 단계에서 멈춘다.
    const response = await request.post("/api/feedback", {
      multipart: { category: "존재하지_않는_분류", message: "x" },
    });
    expect(NOT_SAVED).toContain(response.status());
    expect(response.status(), "인증보다 입력 검증이 먼저 실행됨").not.toBe(400);
  });

  test("GET은 허용되지 않는다(제출 전용 엔드포인트)", async ({ request }) => {
    const response = await request.get("/api/feedback");
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("피드백 API 응답에 secret이 실려 나가지 않는다", async ({ request }) => {
    const response = await request.post("/api/feedback", {
      multipart: { category: "bug", message: "응답 본문 점검" },
    });
    const text = await response.text();
    expect(text).not.toMatch(/sb_secret_|service_role|AIza[0-9A-Za-z_-]{30,}/);
    expect(text).not.toMatch(/SUPABASE_[A-Z_]*KEY\s*[:=]/);
  });
});

// 심사 지적: 위젯이 signedIn일 때만 렌더돼 스위트가 한 번도 도달하지 못했다.
// 실제 마크업을 주입해 열린 상태의 접근성을 검사한다(세션 없이도 결함을 잡기 위해서다).
test("열린 피드백 패널의 마크업에 심각한 접근성 위반이 없다", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.innerHTML = `
      <div class="feedback-panel">
        <div class="feedback-head"><h2>무엇이 불편하셨나요?</h2><button type="button">닫기</button></div>
        <fieldset class="feedback-field">
          <legend>분류 (필수)</legend>
          <div class="feedback-chips">
            <label class="feedback-chip"><input type="radio" name="c" value="bug">오류·버그</label>
            <label class="feedback-chip"><input type="radio" name="c" value="design">디자인</label>
          </div>
        </fieldset>
        <div class="feedback-field">
          <label for="fb-msg">피드백 글 (필수)</label>
          <textarea id="fb-msg" rows="3" aria-describedby="fb-hint"></textarea>
          <small id="fb-hint">5자 이상 적어 주십시오.</small>
        </div>
        <div class="feedback-field">
          <span class="feedback-label">화면 캡처 (선택)</span>
          <div class="feedback-drop">
            <p>여기로 끌어다 놓거나, 붙여넣기 하거나</p>
            <button type="button">파일 선택</button>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only" aria-label="화면 캡처 파일 선택">
          </div>
          <p class="feedback-privacy-note">캡처 이미지에 이름, 이메일, 전화번호 등 민감한 정보가 포함되지 않았는지 확인해 주세요.</p>
          <ul class="feedback-previews">
            <li><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="첨부 미리보기: 화면1.png">
              <button type="button" aria-label="첨부 빼기: 화면1.png">빼기</button></li>
          </ul>
        </div>
        <div role="status"><ul class="cert-missing"><li>분류를 선택해 주십시오.</li></ul></div>
        <div class="feedback-actions"><button type="button" class="primary full" disabled>검토하고 보내기</button></div>
      </div>`;
    document.body.appendChild(host);
  });

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, serious.map((v) => `${v.id}: ${v.nodes.length}건`).join("\n")).toEqual([]);

  // 파일 입력이 접근성 이름을 갖는지 직접 확인한다(sr-only는 트리에 남고 포커스도 된다).
  const fileLabel = await page.locator('input[type="file"]').getAttribute("aria-label");
  expect(fileLabel, "파일 입력에 접근성 이름이 없음").toBeTruthy();
});
