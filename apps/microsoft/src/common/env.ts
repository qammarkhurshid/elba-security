import { z } from 'zod';
import { config } from 'dotenv';

config();

const envVariables = z.object({
  ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MICROSOFT_TPAC_APP_CLIENT_ID: z.string().min(1),
  MICROSOFT_TPAC_APP_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_TPAC_APP_REDIRECT_URI: z.string().min(1),
  POSTGRES_URL: z.string().min(1),
  POSTGRES_DATABASE: z.string().min(1),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_PRISMA_URL: z.string().min(1),
  POSTGRES_URL_NON_POOLING: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  ELBA_API_BASE_URL: z.string().min(1),
  ELBA_SOURCE_ID: z.string().min(1),
});

export const env = envVariables.parse(process.env);
