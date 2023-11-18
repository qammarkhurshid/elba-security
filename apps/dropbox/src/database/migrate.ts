const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const dotenv = require('dotenv');
dotenv.config();

const sql = postgres({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  db: process.env.POSTGRES_DATABASE,
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
