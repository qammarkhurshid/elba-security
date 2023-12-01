import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  test: {
    // setupFiles: ['./vitest/setup-database.ts'],
    env: process.env,
    environment: 'edge-runtime',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
