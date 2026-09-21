import dotenv from 'dotenv';
import postgres from 'postgres';
import handler from '../api/leads.js';

dotenv.config({ path: '.env.local', quiet: true });

const request = {
  method: 'POST',
  body: {
    fullName: 'UKEA Integration Test',
    phone: '0989999999',
    email: 'integration-test@ukea.edu.vn',
    interest: 'Kết nối Supabase',
    source: 'integration-test',
    pageUrl: 'http://localhost/integration-test',
    consent: true,
  },
};

let statusCode = 200;
let responseBody = '';
const response = {
  setHeader() {},
  status(code) {
    statusCode = code;
    return this;
  },
  end(body) {
    responseBody = body;
  },
};

await handler(request, response);

const parsed = JSON.parse(responseBody || '{}');
if (statusCode !== 201 || !parsed.ok) {
  throw new Error(`Lead API verification failed (${statusCode}): ${parsed.message || responseBody}`);
}

const connectionString = process.env.UKEA_POSTGRES_URL_NON_POOLING || process.env.UKEA_POSTGRES_URL;
const sql = postgres(connectionString, { ssl: 'require', max: 1 });

try {
  const deleted = await sql`
    delete from public.consultation_leads
    where source = 'integration-test'
    returning id
  `;
  if (deleted.length < 1) throw new Error('Test lead was not found after insertion.');
  console.log('Supabase verified: insert succeeded and test row was removed.');
} finally {
  await sql.end();
}
