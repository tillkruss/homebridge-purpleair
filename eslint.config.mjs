import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2018,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stylistic': stylistic,
    },
    rules: {
      ...tseslint.configs['eslint-recommended'].overrides[0].rules,
      ...tseslint.configs.recommended.rules,
      'quotes': ['warn', 'single'],
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'semi': 'off',
      'comma-dangle': ['warn', 'always-multiline'],
      'dot-notation': 'off',
      'eqeqeq': 'warn',
      'curly': ['warn', 'all'],
      'brace-style': ['warn'],
      'prefer-arrow-callback': ['warn'],
      'max-len': ['warn', 140],
      'no-console': ['warn'],
      'no-non-null-assertion': 'off',
      'comma-spacing': ['error'],
      'no-multi-spaces': ['warn', { ignoreEOLComments: true }],
      'no-trailing-spaces': ['warn'],
      'no-useless-assignment': 'off',
      'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@stylistic/semi': ['warn'],
      '@stylistic/member-delimiter-style': ['warn'],
    },
  },
];
