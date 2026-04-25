// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from "globals";
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ['**/forge.config.ts', '**/vite.*.config.ts', '**/dist', '**/.vite', '**/node_modules', 'licenseFile.mjs'] },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
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
