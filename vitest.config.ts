import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/lib/__tests__/**/*.test.ts'],
    testTimeout: 15000,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
