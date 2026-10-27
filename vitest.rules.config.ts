import { defineConfig } from 'vitest/config';

// Run with: npm run test:rules (starts the Firestore emulator via firebase emulators:exec).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
