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
const sql = postgres(connectionString, { ssl: 'require', max: 1 });

try {
  await sql.unsafe(schema);
  console.log('Supabase schema is ready: public.consultation_leads');
} finally {
  await sql.end();
}
