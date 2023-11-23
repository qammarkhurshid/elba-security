import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import 'dotenv/config';
import postgres from 'postgres';

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_POSTGRES_CONNECTION_URL
    : process.env.POSTGRES_CONNECTION_URL;

const migrationClient = postgres(connectionString as string);

async function postgresMigrate() {
  try {
    const db = drizzle(migrationClient);

    console.log('Migrating...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Done!');
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

postgresMigrate();
