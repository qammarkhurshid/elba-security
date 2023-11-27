import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { config } from 'dotenv';

config({ path: '.env.test.local' });

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
