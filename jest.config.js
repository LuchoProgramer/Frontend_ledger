/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
  moduleNameMapper: {
    // Resuelve alias @/ definido en tsconfig.json
    '^@/(.*)$': '<rootDir>/src/$1',
    // El glue generado por wasm-pack no existe en test env — se mockea
    './calculos_sri_wasm\\.js$': '<rootDir>/src/__tests__/wasm/__mocks__/calculos_sri_wasm.js',
  },
};
