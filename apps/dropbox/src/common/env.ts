import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());

export const env = createEnv({
  client: {},
  server: {
    // CRON_SECRET: z.string(),
    // ELBA_API_BASE_URL: z.string().url(),
    // ELBA_SOURCE_ID: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: zEnvInt(),
    POSTGRES_USERNAME: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DATABASE: z.string(),
    TEST_POSTGRES_PORT: zEnvInt(),
    TEST_POSTGRES_HOST: z.string(),
    TEST_POSTGRES_DATABASE: z.string(),
    TEST_POSTGRES_USERNAME: z.string(),
    TEST_POSTGRES_PASSWORD: z.string(),
    // MAX_CONCURRENT_USERS_SYNC_JOBS: zEnvInt(),
    // MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC_JOBS: zEnvInt(),
    // USERS_SYNC_FREQUENCY: zEnvInt(),
    // USERS_SYNC_BATCH_SIZE: zEnvInt(),
    // USERS_SYNC_MAX_RETRY: zEnvInt(),
    // THIRD_PARTY_APPS_SYNC_FREQUENCY: zEnvInt(),
    DROPBOX_CLIENT_ID: z.string(),
    DROPBOX_CLIENT_SECRET: z.string(),
    DROPBOX_CONCURRENT_DP_SYNC_JOBS: zEnvInt(),
    DROPBOX_DP_JOB_BATCH_SIZE: zEnvInt(),
    DROPBOX_REDIRECT_URI: z.string(),
    ELBA_API_BASE_URL: z.string(),
    NODE_ENV: z.string(),
  },
  // @ts-expect-error process.env is not typed according to .env
  runtimeEnv: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV,
  },
});
