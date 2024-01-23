import { z } from 'zod';

const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());

export const env = z
  .object({
    DROPBOX_CLIENT_ID: z.string(),
    DROPBOX_CLIENT_SECRET: z.string(),
    DROPBOX_CONCURRENT_DP_SYNC_JOBS: zEnvInt(),
    DROPBOX_DP_JOB_BATCH_SIZE: zEnvInt(),
    DROPBOX_REDIRECT_URI: z.string(),
    ELBA_API_BASE_URL: z.string(),
    ELBA_REDIRECT_URL: z.string(),
    ELBA_API_KEY: z.string(),
    ELBA_SOURCE_ID: z.string(),
    ELBA_WEBHOOK_SECRET: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DATABASE: z.string(),
    POSTGRES_URL: z.string(),
    VERCEL_ENV: z.string().optional(),
    ELBA_REGION: z.string(),
  })
  .parse(process.env);
