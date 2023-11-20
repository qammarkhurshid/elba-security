import { z } from 'zod';

const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());

export const env = z
  .object({
    NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL: z.string().url(),
    VERCEL_ENV: z.string().optional(),
    CRON_SECRET: z.string(),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string(),
    POSTGRES_URL: z.string().optional(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: zEnvInt(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DATABASE: z.string(),
    POSTGRES_PROXY: zEnvInt(),
    GITHUB_APP_ID: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    MAX_CONCURRENT_USERS_SYNC_JOBS: zEnvInt(),
    MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC_JOBS: zEnvInt(),
    USERS_SYNC_BATCH_SIZE: zEnvInt(),
    USERS_SYNC_MAX_RETRY: zEnvInt(),
    THIRD_PARTY_APPS_SYNC_BATCH_SIZE: zEnvInt(),
    THIRD_PARTY_APPS_MAX_RETRY: zEnvInt(),
  })
  .parse(process.env);
