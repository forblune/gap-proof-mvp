// Gate 6(#42): TXT·Markdown 첨부 Phase 1 — 검증 순수 함수(Node 테스트 대상).
// 원칙: 파일은 브라우저 안에서 텍스트로만 읽는다(서버 업로드·원본 저장 없음).
// 확장자와 MIME을 함께 확인하고, 통과 못 하면 이유를 사용자 언어로 돌려준다.

export const IMPORT_MAX_BYTES = 200_000; // 약 200KB — 10,000자 입력 상한을 훨씬 덮는 여유
const ALLOWED_EXTENSIONS = [".txt", ".md", ".markdown"];
// 브라우저·OS에 따라 md의 MIME이 비어 오기도 한다 — 빈 값은 확장자 검사로 보완
const ALLOWED_MIME = ["text/plain", "text/markdown", "text/x-markdown", ""];

export type ImportFileMeta = { name: string; type: string; size: number };
export type ImportValidation = { ok: true } | { ok: false; reason: string };

export function validateImportFile(file: ImportFileMeta): ImportValidation {
  const name = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
  if (!hasAllowedExtension) {
    return { ok: false, reason: "지금은 TXT와 Markdown(.md) 파일만 붙일 수 있어요. PDF·DOCX는 다음 단계에서 준비 중이에요." };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, reason: "텍스트 파일이 아닌 것 같아요. 파일 형식을 확인해 주세요." };
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return { ok: false, reason: "파일이 200KB를 넘어요. 필요한 부분만 옮겨 붙여 주세요." };
  }
  if (file.size === 0) {
    return { ok: false, reason: "빈 파일이에요. 내용을 확인해 주세요." };
  }
  return { ok: true };
}

// 미리보기용 절단(표시 전용 — 실제 추가 텍스트는 자르지 않는다)
export function previewText(text: string, max = 600): { preview: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= max) return { preview: trimmed, truncated: false };
  return { preview: trimmed.slice(0, max), truncated: true };
}

// 외부 AI에게 줄 정리 프롬프트(고정 상수 — ChatGPT·Claude·Gemini 공용)
export const AI_ORGANIZE_PROMPT = `지금까지 우리 대화에서 내가 말했던 경험(학교, 일, 아르바이트, 돌봄, 취미, 게임, 독학, 쉬었던 시기 포함)을 정리해 줘.

규칙:
1. 내가 실제로 했다고 말한 행동만 적어 줘. 추측하거나 부풀리지 마.
2. 각 경험을 "언제/무엇을/어떻게 했고/무엇이 남았는지" 순서의 짧은 문단으로 적어 줘.
3. 잘한 것처럼 포장하지 말고 사실 위주로 적어 줘.
4. 이름, 연락처, 주소, 회사명 같은 개인정보는 빼 줘.
5. 확실하지 않은 내용에는 "(확인 필요)"를 붙여 줘.`;
