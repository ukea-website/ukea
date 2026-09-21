import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local', quiet: true });

const connectionString = process.env.UKEA_POSTGRES_URL_NON_POOLING || process.env.UKEA_POSTGRES_URL;
if (!connectionString) throw new Error('Missing Supabase Postgres connection string.');

const sql = postgres(connectionString, { ssl: 'require', max: 1 });

try {
  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  const columns = await sql`
    select table_name, column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `;
  const policies = await sql`
    select tablename, policyname, roles, cmd
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `;
  const buckets = await sql`
    select id, name, public, file_size_limit, allowed_mime_types
    from storage.buckets
    order by id
  `;

  console.log(JSON.stringify({ tables, columns, policies, buckets }, null, 2));
} finally {
  await sql.end();
}
