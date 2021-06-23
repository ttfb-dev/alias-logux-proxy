module.exports = {
  // extends: ['airbnb-base', 'prettier'],
  extends: ['prettier'],

  env: {
    node: true,
    es6: true,
  },

  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },

  plugins: ['simple-import-sort', 'import'],

  rules: {
    'linebreak-style': 0,
    'import/prefer-default-export': 0,
    'react/prop-types': 0,
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Node.js builtins. You could also generate this regex if you use a `.js` config.
          // For example: `^(${require("module").builtinModules.join("|")})(/|$)`
          [
            '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)',
          ],
          // Packages.
          ['^@?\\w'],
          // Internal packages.
          ['^(@|@company|utils|config|vendored-lib)(/.*|$)'],
          // Side effect imports.
          ['^\\u0000'],
          // Parent imports. Put `..` last.
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          // Other relative imports. Put same-folder imports and `.` last.
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
  },
};
