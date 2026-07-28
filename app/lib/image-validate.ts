// 첨부 이미지 검증 — 서버·클라이언트 공용 순수 로직.
//
// 원칙: 확장자와 신고된 MIME은 믿지 않는다. 실제 바이트의 파일 시그니처(매직 넘버)를 확인한다.
// SVG는 스크립트를 담을 수 있고 GIF는 허용 목록 밖이므로 시그니처 단계에서 걸러진다.

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

export type ImageCheck =
  | { ok: true; mime: AllowedImageMime; extension: "png" | "jpg" | "webp" }
  | { ok: false; reason: string };

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

// 바이트에서 실제 형식을 판정한다. 신고된 MIME과 다르면 위조로 본다.
export function detectImageType(bytes: Uint8Array): AllowedImageMime | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // WebP: "RIFF" .... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

const EXTENSION: Record<AllowedImageMime, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function checkImage(bytes: Uint8Array, declaredMime: string, sizeBytes: number): ImageCheck {
  if (sizeBytes <= 0) return { ok: false, reason: "빈 파일은 첨부할 수 없습니다." };
  if (sizeBytes > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: "파일 하나는 5MB 이하여야 합니다." };
  }

  const actual = detectImageType(bytes);
  if (!actual) {
    // SVG·GIF·실행 파일·형식이 깨진 파일이 여기로 떨어진다.
    return { ok: false, reason: "PNG · JPEG · WebP 이미지만 첨부할 수 있습니다." };
  }
  if (declaredMime && declaredMime !== actual) {
    // 확장자만 바꿔 올린 경우 — 실제 내용이 우선이다.
    return { ok: false, reason: "파일 형식이 실제 내용과 일치하지 않습니다." };
  }
  return { ok: true, mime: actual, extension: EXTENSION[actual] };
}

// 저장 경로: {user_id}/{feedback_id}/{uuid}.{ext}
// 사용자별로 폴더가 갈리므로 Storage 정책이 첫 segment만 보고 격리할 수 있다.
export function attachmentPath(
  userId: string,
  feedbackId: string,
  fileId: string,
  extension: string,
): string {
  return `${userId}/${feedbackId}/${fileId}.${extension}`;
}
