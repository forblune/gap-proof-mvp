import { test, expect } from "@playwright/test";

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
