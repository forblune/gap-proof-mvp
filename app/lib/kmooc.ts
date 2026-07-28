// K-MOOC 강좌정보 API (공공데이터포털, 국가평생교육진흥원) 서버 전용 모듈.
//
// 보안 규칙:
//  - Endpoint는 비밀이 아니므로 아래 공개 상수로 관리한다.
//  - 인증키는 서버에서만 읽는다: readServerEnv("KMOOC_SERVICE_KEY").
//  - 키 값·길이·앞뒤 문자, 키가 포함된 요청 URL을 로그·에러 메시지·응답에 절대 담지 않는다
//    (maskKey/safeErrorText를 반드시 거쳐서 기록한다).
//
// 인정 규칙: 여기서 가져오는 것은 "학습 자료 후보"일 뿐이다. 강좌를 찾았다는 사실은
// 어떤 인정도 만들지 않으며, 증거등급을 올리지 않는다(recognition.ts 참고).

export const KMOOC_BASE_ENDPOINT = "https://apis.data.go.kr/B552881/kmooc_v2_0";

// 공공데이터포털 Swagger UI에서 확인해야 하는 값. 확인 전까지는 호출을 시도하지 않는다
// (잘못된 경로로 호출해 봐야 404만 받고, 사용자에게는 없는 결과를 보여 주게 된다).
// 확인되면 이 배열에 실제 오퍼레이션 이름을 넣는 것만으로 활성화된다.
export const KMOOC_OPERATIONS: { courseList: string | null } = {
  courseList: null, // TODO(운영자 확인 필요): 포털 명세의 강좌목록 오퍼레이션 경로
};

export function isKmoocConfigured(): boolean {
  return Boolean(KMOOC_OPERATIONS.courseList);
}

// 어떤 문자열에서든 인증키를 지운다. 로그·에러·응답 기록 전에 반드시 통과시킨다.
export function maskKey(text: string, key: string | undefined): string {
  if (!text) return "";
  if (!key) return text;
  return text.split(key).join("[REDACTED]").replace(/serviceKey=[^&\s"']+/gi, "serviceKey=[REDACTED]");
}

// 에러 객체에서 사람이 볼 수 있는 최소 정보만 뽑는다(스택·URL·키 제외).
export function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "Error";
}

export type KmoocCourse = {
  id: string;
  title: string;
  org: string | null;
  url: string | null;
};

// 공공데이터포털 표준 응답 봉투(response.body.items[...])를 관대하게 읽는다.
// 필드 이름이 명세와 달라도 흔한 후보를 순서대로 시도하고, 없으면 그 항목을 버린다.
export function normalizeCourses(raw: unknown): KmoocCourse[] {
  const pick = (source: Record<string, unknown>, names: string[]): string | null => {
    for (const name of names) {
      const value = source[name];
      if (typeof value === "string" && value.trim()) return value.trim().slice(0, 200);
      if (typeof value === "number") return String(value);
    }
    return null;
  };

  const container = raw as Record<string, unknown> | null;
  const body = (container?.response as Record<string, unknown> | undefined)?.body as
    | Record<string, unknown>
    | undefined;
  const itemsHolder = (body?.items ?? container?.items ?? raw) as unknown;
  const list = Array.isArray(itemsHolder)
    ? itemsHolder
    : Array.isArray((itemsHolder as Record<string, unknown>)?.item)
      ? ((itemsHolder as Record<string, unknown>).item as unknown[])
      : [];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const title = pick(item, ["courseName", "course_name", "title", "name", "subjectName"]);
      if (!title) return null;
      const id = pick(item, ["courseId", "course_id", "id", "seq"]) ?? title;
      return {
        id,
        title,
        org: pick(item, ["orgName", "org_name", "univName", "provider", "institution"]),
        url: pick(item, ["courseUrl", "url", "link", "detailUrl"]),
      } satisfies KmoocCourse;
    })
    .filter((course): course is KmoocCourse => course !== null)
    .slice(0, 10);
}
