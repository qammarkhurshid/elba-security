import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config({ path: '.env.test' });

export default defineConfig({
  test: {
    setupFiles: ['./vitest/setup-test-server.ts', './vitest/setup-database.ts'],
    env: process.env,
    environment: 'edge-runtime',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
