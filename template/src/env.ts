import { z } from 'zod';

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_HOST: z.string().min(1),
    DATABASE_PORT: z.coerce.number().int().positive(),
    DATABASE_USER: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_DATABASE: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
