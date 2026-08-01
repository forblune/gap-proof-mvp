import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // vinext 빌드 산출물 — 생성 코드라 린트 대상이 아니다.
    // (빌드 뒤에 린트를 돌리면 여기서만 수백 건이 나와 실제 문제를 덮는다.)
    "dist/**",
    ".claude/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 이 저장소는 페이지 이동을 전부 일반 <a> 로 한다 — 의도된 선택이다.
      // 서버 렌더링 페이지 사이를 완전한 문서 이동으로 넘겨야 데모의 클라이언트 상태가
      // 확실히 초기화되고(특히 /demo 를 벗어날 때), 라우팅 방식이 화면마다 갈리지 않는다.
      // 규칙이 잡아내는 곳은 홈("/") 링크 2건뿐이라, 그 2건만 next/link 로 바꾸면
      // 오히려 이동 방식이 화면마다 달라진다. 그래서 규칙 자체를 끈다.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
