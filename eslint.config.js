import prettierConfig from 'eslint-config-prettier';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * eslint -> 기본 ESLint 권장 규칙 설정
 * tseslint -> typescript 설정 적용 (eslint를 ts 파일에 적용하기 위해 필요)
 * prettierConfig -> eslint와 prettier 충돌 시 prettier 우선 적용 설정
 * eslintPluginPrettierRecommended -> .prettierrc.json 설정 적용
 */
export default [
  ...eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  eslintPluginPrettierRecommended,
];
