// 피드백 제출 — 로그인 필수. 글 전용 또는 글 + 이미지(최대 3장).
//
// 보안·정합 규칙:
//  - Supabase 세션을 서버에서 검증한다. 비로그인은 401이며 어떤 행도 만들지 않는다.
//  - user_id와 status는 요청 본문에서 읽지 않는다. 서버가 세션의 사용자로 채운다.
//  - 요청 본문을 통째로 INSERT 하지 않고 허용 필드만 서버가 조립한다.
//  - 이미지는 확장자·신고 MIME이 아니라 실제 바이트 시그니처로 검증한다.
//  - 업로드가 끝난 뒤 DB 기록이 실패하면 이미 올라간 파일을 지운다(고아 파일 방지).
//  - 피드백 본문·이미지 내용을 로그에 남기지 않는다. IP 원문도 저장하지 않는다.
//  - 첨부 이미지를 Solar·Gemini 등 어떤 AI 제공자에게도 보내지 않는다.

import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "../../lib/supabase";
import { checkRateLimit, clientKey, RATE_LIMIT_WINDOW_SECONDS } from "../../lib/rate-limit";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  attachmentPath,
  checkImage,
} from "../../lib/image-validate";

const BUCKET = "feedback-attachments";
const CATEGORIES = ["bug", "hard_to_use", "wording", "design", "feature_idea", "trust_privacy", "other"];
const MESSAGE_MIN = 5;
const MESSAGE_MAX = 4000;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function readCookies(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      return { name: part.slice(0, index), value: decodeURIComponent(part.slice(index + 1)) };
    });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return json({ error: "unconfigured", message: "피드백 기능이 아직 연결되지 않았습니다." }, 503);
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => readCookies(request),
      // 이 라우트는 세션을 새로 발급하지 않는다(읽기만 한다).
      setAll: () => {},
    },
  });

  // 1) 세션 검증 — 비로그인은 여기서 끝난다.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return json(
      { error: "unauthorized", message: "피드백을 보내려면 로그인해 주십시오." },
      401,
    );
  }

  // 2) 남용 방지 — 저장·업로드 이전에 검사한다.
  const rateDecision = await checkRateLimit("ANALYZE_RATE_LIMITER", await clientKey(request));
  if (rateDecision === "unavailable") {
    return json({ error: "rate_limit_unavailable", message: "잠시 후 다시 시도해 주십시오." }, 503);
  }
  if (rateDecision === "limited") {
    return json(
      { error: "rate_limited", message: "요청이 잠시 몰렸습니다. 1분 뒤에 다시 시도해 주십시오." },
      429,
      { "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) },
    );
  }

  // 3) 입력 검증 — 허용 필드만 꺼내 쓴다.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "invalid_form", message: "요청 형식을 확인해 주십시오." }, 400);
  }

  const category = String(form.get("category") ?? "").trim();
  if (!CATEGORIES.includes(category)) {
    return json({ error: "invalid_category", message: "분류를 선택해 주십시오." }, 400);
  }

  const message = String(form.get("message") ?? "").trim();
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return json(
      { error: "invalid_message", message: `피드백 글은 ${MESSAGE_MIN}자 이상 ${MESSAGE_MAX}자 이하로 적어 주십시오.` },
      400,
    );
  }

  const ratingRaw = form.get("rating");
  let rating: number | null = null;
  if (ratingRaw !== null && String(ratingRaw).trim() !== "") {
    const parsed = Number(ratingRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return json({ error: "invalid_rating", message: "만족도는 1~5점 중에서 선택해 주십시오." }, 400);
    }
    rating = parsed;
  }

  const pagePath = String(form.get("pagePath") ?? "").trim().slice(0, 300) || null;

  const files = form.getAll("attachments").filter((entry): entry is File => entry instanceof File);
  if (files.length > MAX_ATTACHMENTS) {
    return json(
      { error: "too_many_attachments", message: `이미지는 최대 ${MAX_ATTACHMENTS}장까지 첨부할 수 있습니다.` },
      400,
    );
  }

  // 4) 이미지 검증을 저장 이전에 모두 끝낸다 — 하나라도 실패하면 아무것도 만들지 않는다.
  const validated: { bytes: Uint8Array; mime: string; extension: string; size: number }[] = [];
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return json({ error: "attachment_too_large", message: "파일 하나는 5MB 이하여야 합니다." }, 413);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = checkImage(bytes, file.type, bytes.byteLength);
    if (!result.ok) {
      return json({ error: "invalid_attachment", message: result.reason }, 400);
    }
    validated.push({ bytes, mime: result.mime, extension: result.extension, size: bytes.byteLength });
  }

  // 5) 피드백 행 생성 — user_id·status는 서버가 정한다(요청값 무시).
  const { data: inserted, error: insertError } = await supabase
    .from("feedback_submissions")
    .insert({
      user_id: user.id,
      category,
      message,
      rating,
      page_path: pagePath,
      attachment_count: 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("feedback insert failed"); // 본문은 남기지 않는다
    return json({ error: "save_failed", message: "피드백을 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오." }, 500);
  }

  const feedbackId = inserted.id as string;
  const uploadedPaths: string[] = [];

  // 6) 이미지 업로드 → 실패하면 이미 올린 파일과 피드백 행을 되돌린다.
  try {
    for (const item of validated) {
      const path = attachmentPath(user.id, feedbackId, crypto.randomUUID(), item.extension);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, item.bytes, { contentType: item.mime, upsert: false });
      if (uploadError) throw new Error("upload_failed");
      uploadedPaths.push(path);

      const { error: attachError } = await supabase.from("feedback_attachments").insert({
        feedback_id: feedbackId,
        user_id: user.id,
        storage_path: path,
        mime_type: item.mime,
        size_bytes: item.size,
      });
      if (attachError) throw new Error("attach_record_failed");
    }

    if (uploadedPaths.length > 0) {
      // 개수 갱신이 실패하면 성공으로 넘기지 않는다 — 파일은 있는데 개수가 0인 행이 남으면
      // 운영자가 첨부를 못 찾는다. 아래 catch로 보내 파일·행을 함께 되돌린다.
      const { error: countError } = await supabase
        .from("feedback_submissions")
        .update({ attachment_count: uploadedPaths.length })
        .eq("id", feedbackId);
      if (countError) throw new Error("count_update_failed");
    }
  } catch {
    // 고아 파일·반쪽 행을 남기지 않는다.
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }
    await supabase.from("feedback_submissions").delete().eq("id", feedbackId);
    console.error("feedback attachment failed; rolled back");
    return json(
      { error: "attachment_failed", message: "이미지를 저장하지 못했습니다. 글만 다시 보내시거나 잠시 후 다시 시도해 주십시오." },
      500,
    );
  }

  return json({
    id: feedbackId,
    attachmentCount: uploadedPaths.length,
    message: "피드백을 보냈습니다. 읽고 반영하겠습니다.",
  });
}
