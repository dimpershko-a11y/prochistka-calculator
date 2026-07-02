const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        indexedDB: 'readonly',
        caches: 'readonly',
        self: 'readonly',
        globalThis: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        FileReader: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        sessionStorage: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        CSS: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none'}],
      'no-empty': ['warn', {allowEmptyCatch: true}],
      'no-undef': 'error'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        process: 'readonly'
      }
    }
  }
];
