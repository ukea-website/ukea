import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local', quiet: true });

const connectionString = process.env.UKEA_POSTGRES_URL_NON_POOLING || process.env.UKEA_POSTGRES_URL;

if (!connectionString) {
  throw new Error('Missing UKEA_POSTGRES_URL_NON_POOLING or UKEA_POSTGRES_URL. Run `vercel env pull .env.local --yes` first.');
}

const schemaUrl = new URL('../supabase/schema.sql', import.meta.url);
const schema = await fs.readFile(fileURLToPath(schemaUrl), 'utf8');
const migrationsDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const sql = postgres(connectionString, { ssl: 'require', max: 1 });

try {
  await sql.unsafe(schema);
  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter(file => file.endsWith('.sql'))
    .sort();
  for (const migrationFile of migrationFiles) {
    const migration = await fs.readFile(new URL(`../supabase/migrations/${migrationFile}`, import.meta.url), 'utf8');
    await sql.unsafe(migration);
    console.log(`Applied migration: ${migrationFile}`);
  }
  console.log('Supabase schema is ready for leads and the UKEA CMS.');
} finally {
  await sql.end();
}
