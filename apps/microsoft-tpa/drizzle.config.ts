import type { Config } from 'drizzle-kit';
import { env } from 'src/env';

export default {
  schema: './src/db/schemas/*.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: env.POSTGRES_URL + '?sslmode=require',
  },
  verbose: true,
  strict: true,
} satisfies Config;
