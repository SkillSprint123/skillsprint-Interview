import parser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vue from 'eslint-plugin-vue'

// Oxlint checks scripts; keep the existing Vue rules that require template parsing.
export default defineConfig(...vue.configs['flat/essential'], {
  files: ['**/*.vue'],
  languageOptions: { parserOptions: { parser } },
})
