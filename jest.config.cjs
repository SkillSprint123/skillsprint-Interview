/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  testMatch: ['<rootDir>/tests/{unit,integration}/**/*.test.ts'],
  transform: { '^.+\\.(ts|vue)$': '<rootDir>/tests/support/vue-transform.cjs' },
  moduleFileExtensions: ['ts', 'js', 'cjs', 'json', 'vue'],
  moduleNameMapper: {
    '\\.(png|svg|woff2?)(\\?url)?$': '<rootDir>/tests/support/asset.cjs',
  },
  restoreMocks: true,
  coverageProvider: 'babel',
  collectCoverageFrom: ['src/**/*.{ts,vue}', '!src/**/*.d.ts', '!src/**/types.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { statements: 90, branches: 80, functions: 90, lines: 90 },
  },
}
