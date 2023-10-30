import { z } from 'zod';

/**
 * Toggle environment variables
 * 'true' or '1' will evaluate to true
 * 'false' or '0' will evaluate to false
 */
const toggle = z
  .enum(['true', 'false', '0', '1'])
  .transform((v) => v === 'true' || v === '1');

const envVariables = z.object({
  DB_AUTH_TOKEN: z.string().min(1),
  DB_URL: z.string().min(1),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  RUNTIME: z.enum(['bun', 'edge']).default('bun'),
  MICROSOFT_TPAC_APP_CLIENT_ID: z.string().min(1),
  MICROSOFT_TPAC_APP_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_TPAC_APP_REDIRECT_URI: z.string().min(1),
  ZEPLO_SECRET_KEY: z.string().min(1),
  POSTGRES_URL: z.string().min(1),
  POSTGRES_DATABASE: z.string().min(1),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_PRISMA_URL: z.string().min(1),
  POSTGRES_URL_NON_POOLING: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
});

export const env = envVariables.parse(process.env);
