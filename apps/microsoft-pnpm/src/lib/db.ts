import { sql } from '@vercel/postgres';
import { drizzle as drizzleVercel } from 'drizzle-orm/vercel-postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/common/env';

const localClient = postgres({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  db: env.POSTGRES_DATABASE,
});

export const db = env.ENV === 'development' ? drizzle(localClient) : drizzleVercel(sql);
