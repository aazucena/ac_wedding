import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['src/**/*.{ts,vue}'],
    rules: {
      // Vue SFC files in this project are single-word by design (interface.vue, display.vue)
      'vue/multi-word-component-names': 'off',
      // emoji-mart's Picker has no TypeScript types for constructor options
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
