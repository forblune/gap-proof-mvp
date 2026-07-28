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
]);

export default eslintConfig;
