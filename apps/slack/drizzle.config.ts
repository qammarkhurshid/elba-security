import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL as never,
    // host: process.env.POSTGRES_HOST as never,
    // port: process.env.POSTGRES_PORT as never,
    // user: process.env.POSTGRES_USER as never,
    // password: process.env.POSTGRES_PASSWORD as never,
    // database: process.env.POSTGRES_DATABASE as never,
  },
  verbose: true,
  strict: true,
} satisfies Config;
