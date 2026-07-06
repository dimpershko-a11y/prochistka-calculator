const js = require('@eslint/js');

module.exports = [
  {ignores: ['assets/vendor/**']},
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
        CSS: 'readonly',
        File: 'readonly',
        html2pdf: 'readonly'
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
  },
  {
    // Файлы приложения загружаются последовательно и разделяют глобальную область:
    // пофайловый no-undef здесь даёт только ложные срабатывания (реальные опечатки ловит tests/e2e.js).
    files: ['assets/js/**/*.js'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  },
  {
    // e2e-скрипт исполняет код и в Node, и внутри страницы (page.evaluate) — глобалы страницы не видны ESLint.
    files: ['tests/e2e.js'],
    rules: {
      'no-undef': 'off'
    }
  }
];
