// 6라운드 심사 자동 FAIL 회귀 방지:
// 캡션이 claim.link 의 "빈 값 여부"로만 갈라져, 링크가 아닌 문장을 넣어도
// "증거등급 Lv.1 근거 연결"이라고 말했다. 배지는 Lv.0 인데 캡션만 Lv.1 이었다.
// 등급을 정하는 것은 isVerifiableLink 이므로 캡션도 같은 기준을 따라야 한다.
import { expect, test } from "@playwright/test";
import { reachClaimStep } from "./journey";

test("링크 칸의 안내 문구가 실제 증거등급과 어긋나지 않는다", async ({ page }) => {
  await reachClaimStep(page);
  const input = page.locator('input[id^="claim-link-"]').first();
  await expect(input).toBeVisible();
  const caption = page.locator('input[id^="claim-link-"]').first()
    .locator("xpath=following-sibling::small").first();

  await input.fill("");
  await expect(caption).toContainText("Lv.0 자기기록");

  // 링크가 아닌 설명 문장 — 등급이 오르지 않으므로 Lv.1 이라고 말하면 안 된다.
  await input.fill("메모장에 정리함");
  await expect(caption).not.toContainText("Lv.1 근거 연결");
  await expect(caption).toContainText("등급이 오르지 않습니다");

  await input.fill("https://github.com/example/repo");
  await expect(caption).toContainText("Lv.1 근거 연결");
});
