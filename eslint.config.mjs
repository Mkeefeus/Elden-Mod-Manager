// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from "globals";

export default tseslint.config(
  { ignores: ['**/forge.config.ts', '**/vite.*.config.ts', '**/dist', '**/.vite', '**/node_modules', 'licenseFile.js'] },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: './',
      },
    },
  },
  eslintConfigPrettier,
   {
      languageOptions: {
          globals: {
              ...globals.browser,
              ...globals.node,
          },
  
          parser: tseslint.parser
      }
    }
);
