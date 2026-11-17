// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Deprecated in favor of ESLint Stylistic, but available until ESLint 11.
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
    },
  },
  {
    // Code rules of the library; tests may write their inputs and expected results in place.
    files: ['projects/ngx-diffwise/src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'max-classes-per-file': ['error', 1],
      'no-nested-ternary': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator=/^[!=]==?$/] > Literal[value='']",
          message: 'Check for empty text with `length === 0`.',
        },
        {
          selector: 'CallExpression > Literal[raw=/^[\'"]/]',
          message: 'Put text in a named constant.',
        },
        {
          selector: 'BinaryExpression[operator=/^[!=]==?$/] > Literal[raw=/^[\'"]/]',
          message: 'Put text in a named constant.',
        },
        {
          selector: "LogicalExpression[operator='??'] > Literal[raw=/^['\"]/]",
          message: 'Put text in a named constant.',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
);
