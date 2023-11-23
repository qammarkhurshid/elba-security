import type { Config } from 'drizzle-kit';
import { env } from './src/common/env';

export default {
  schema: './src/schemas/*.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: `${env.POSTGRES_URL}?sslmode=require`,
  },
} satisfies Config;
