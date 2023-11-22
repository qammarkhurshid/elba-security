import { env } from '@/common/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const isTest = env.NODE_ENV === 'test';

const client = postgres({
  host: isTest ? env.TEST_POSTGRES_HOST : env.POSTGRES_HOST,
  port: isTest ? env.TEST_POSTGRES_PORT : env.POSTGRES_PORT,
  username: isTest ? env.TEST_POSTGRES_USERNAME : env.POSTGRES_USERNAME,
  password: isTest ? env.TEST_POSTGRES_PASSWORD : env.POSTGRES_PASSWORD,
  db: isTest ? env.TEST_POSTGRES_DATABASE : env.POSTGRES_DATABASE,
});

export const db = drizzle(client);
