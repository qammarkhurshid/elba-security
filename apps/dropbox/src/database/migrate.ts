const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config();

const isTest = process.env.NODE_ENV === 'test';
const sql = postgres({
  host: isTest ? process.env.TEST_POSTGRES_HOST : process.env.POSTGRES_HOST,
  port: isTest ? process.env.TEST_POSTGRES_PORT : process.env.POSTGRES_PORT,
  username: isTest ? process.env.TEST_POSTGRES_USERNAME : process.env.POSTGRES_USERNAME,
  password: isTest ? process.env.TEST_POSTGRES_PASSWORD : process.env.POSTGRES_PASSWORD,
  db: isTest ? process.env.TEST_POSTGRES_DATABASE : process.env.POSTGRES_DATABASE,
});

const db = drizzle(sql);

async function main() {
  console.log('Migrating database...');
  await migrate(db, { migrationsFolder: './drizzle' }).finally(sql.end);
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
