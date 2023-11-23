import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { config } from 'dotenv';

config({ path: '.env.test' });

export default defineConfig({
  test: {
    setupFiles: ['./vitest/setup-test-server.ts', './vitest/setup-database.ts'],
    env: process.env,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
