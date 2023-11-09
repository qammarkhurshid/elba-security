import { env } from '#src/common/env';
import type { Config } from 'drizzle-kit';

export default {
  schema: './app/schemas/*.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: env.POSTGRES_URL + '?sslmode=require',
  },
} satisfies Config;
