import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

const envFileName = process.argv.at(2);

if (!envFileName) {
  throw new Error(
    'Could not find environment file. Please specify the path to the environment file as the first argument.\nUsage: npx ts-node ./src/database/migrate.ts <env-file>'
  );
}

// Load the specified environment file
dotenv.config({ path: envFileName });

const client = postgres(process.env.POSTGRES_URL as string);

(async () => {
  try {
    const db = drizzle(client);

    console.log('Migrating...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Done!');
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
