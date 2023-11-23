import { env } from '@/common/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const isTest = env.NODE_ENV === 'test';
const connectionString = isTest ? env.TEST_POSTGRES_CONNECTION_URL : env.POSTGRES_CONNECTION_URL;
const client = postgres(connectionString);

// TODO: remove this later
function main() {
  console.log({
    'Connected Environment': env.NODE_ENV,
    'Connected Database': isTest ? env.TEST_POSTGRES_DATABASE : env.POSTGRES_DATABASE,
  });
}

main();

export const db = drizzle(client);
