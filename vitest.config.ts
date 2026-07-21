import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.{ts,tsx}', 'src/lib/__tests__/**/*.test.{ts,tsx}', 'src/components/**/__tests__/**/*.test.{ts,tsx}'],
    testTimeout: 15000,
    environment: 'node',
    globals: true,
    setupFiles: ["./src/__tests__/vitest-bun-polyfills.ts"],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mock server-only for tests to prevent "cannot be imported from Client Component" errors
      'server-only': path.resolve(__dirname, './src/__tests__/__mocks__/server-only.ts'),
    },
  },
});
