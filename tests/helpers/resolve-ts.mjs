// node --test 에서 앱 라우트 모듈을 그대로 import 하기 위한 리졸버.
//
// 앱 코드는 vinext(vite)가 해석하는 확장자 없는 상대 import 를 쓴다
// (예: route.ts 의 `../../lib/supabase`). 순수 node 는 확장자가 없으면 찾지 못하므로,
// 상대 경로가 실패했을 때 같은 경로의 .ts 파일이 실제로 존재하면 그것으로 잇는다.
// 존재 확인 없이 무조건 .ts 를 붙이면 진짜 오타가 잡히지 않는다.
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      try {
        await access(fileURLToPath(candidate));
        return nextResolve(candidate.href, context);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}
