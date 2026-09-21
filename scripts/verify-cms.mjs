import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import adminApiHandler from '../api/admin-api.js';
import adminPageHandler from '../api/admin-page.js';

dotenv.config({ path: '.env.local', quiet: true });

const url = (process.env.UKEA_SUPABASE_URL || process.env.NEXT_PUBLIC_UKEA_SUPABASE_URL || '').replace(/\/$/, '');
const publicKey = process.env.UKEA_SUPABASE_PUBLISHABLE_KEY || process.env.UKEA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_UKEA_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.UKEA_SUPABASE_SERVICE_ROLE_KEY || process.env.UKEA_SUPABASE_SECRET_KEY;
if (!url || !publicKey || !serviceKey) throw new Error('Missing Supabase test environment variables.');

const call = async (path, { method = 'GET', token = publicKey, key = publicKey, body, headers = {} } = {}) => {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      ...(body != null && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body == null ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
};

const suffix = crypto.randomBytes(5).toString('hex');
const email = `cms-test-${suffix}@ukea.edu.vn`;
const password = `Ukea!${crypto.randomBytes(12).toString('base64url')}`;
const testSlug = `cms-rls-test-${suffix}`;
const testPhone = `090${Math.floor(1000000 + Math.random() * 8999999)}`;
const objectPath = `tests/${testSlug}.png`;
let userId;
let postId;
let leadId;

const mockResponse = () => ({
  statusCode: 200,
  headers: {},
  body: '',
  status(code) { this.statusCode = code; return this; },
  setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; return this; },
  end(body = '') { this.body = body; return this; },
});

try {
  const userCreate = await call('/auth/v1/admin/users', { method: 'POST', token: serviceKey, key: serviceKey, body: { email, password, email_confirm: true } });
  assert.equal(userCreate.response.ok, true, `Create test auth user failed: ${JSON.stringify(userCreate.data)}`);
  userId = userCreate.data.id;

  const profileCreate = await call('/rest/v1/profiles', { method: 'POST', token: serviceKey, key: serviceKey, headers: { Prefer: 'return=minimal' }, body: { id: userId, role: 'editor', full_name: 'CMS RLS Test' } });
  assert.equal(profileCreate.response.ok, true, 'Create editor profile failed');

  const loginResponse = mockResponse();
  await adminApiHandler({ method: 'POST', headers: { host: 'localhost', origin: 'http://localhost' }, query: { action: 'login' }, body: { email, password } }, loginResponse);
  assert.equal(loginResponse.statusCode, 200, `Admin login handler failed: ${loginResponse.body}`);
  assert.equal(Array.isArray(loginResponse.headers['set-cookie']), true, 'Admin login did not set Supabase session cookies');
  const sessionCookie = loginResponse.headers['set-cookie'].map(value => value.split(';')[0]).join('; ');
  const pageResponse = mockResponse();
  await adminPageHandler({ method: 'GET', headers: { cookie: sessionCookie }, query: { path: '' } }, pageResponse);
  assert.equal(pageResponse.statusCode, 200, 'Authorized editor could not open admin shell');
  assert.equal(String(pageResponse.body).includes('class="admin-app"'), true, 'Admin shell was not rendered');
  const anonymousPageResponse = mockResponse();
  await adminPageHandler({ method: 'GET', headers: {}, query: { path: '' } }, anonymousPageResponse);
  assert.equal(anonymousPageResponse.statusCode, 302, 'Anonymous admin request did not redirect');
  assert.equal(anonymousPageResponse.headers.location, '/quan-tri/dang-nhap', 'Anonymous redirect target is incorrect');

  const login = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  assert.equal(login.response.ok, true, 'Temporary editor login failed');
  const accessToken = login.data.access_token;

  const draftCreate = await call('/rest/v1/posts?select=id,slug,status', {
    method: 'POST', token: accessToken, headers: { Prefer: 'return=representation' },
    body: { title: 'CMS RLS Test', slug: testSlug, status: 'draft', author_id: userId, content_html: '<h2>Kiểm thử</h2><p>Nội dung kiểm thử RLS.</p>' },
  });
  assert.equal(draftCreate.response.ok, true, `Editor create draft failed: ${JSON.stringify(draftCreate.data)}`);
  postId = draftCreate.data[0].id;

  const anonymousDraft = await call(`/rest/v1/posts?select=id&id=eq.${postId}`);
  assert.deepEqual(anonymousDraft.data, [], 'Anonymous user could read a draft post');

  const anonymousPostWrite = await call('/rest/v1/posts', { method: 'POST', body: { title: 'Blocked', slug: `${testSlug}-blocked`, status: 'draft' } });
  assert.equal(anonymousPostWrite.response.ok, false, 'Anonymous user could create a post');

  const publish = await call(`/rest/v1/posts?id=eq.${postId}`, {
    method: 'PATCH', token: accessToken, headers: { Prefer: 'return=minimal' }, body: { status: 'published', published_at: new Date().toISOString() },
  });
  assert.equal(publish.response.ok, true, 'Editor publish failed');
  const publicPost = await call(`/rest/v1/posts?select=id&id=eq.${postId}`);
  assert.equal(publicPost.data.length, 1, 'Published post was not publicly readable');

  const leadCreate = await call('/rest/v1/consultation_leads?select=id', {
    method: 'POST', token: serviceKey, key: serviceKey, headers: { Prefer: 'return=representation' },
    body: { full_name: 'CMS Lead Test', phone: testPhone, interest: 'RLS test', source: 'cms-security-test', consent: true, status: 'new' },
  });
  assert.equal(leadCreate.response.ok, true, 'Create test lead failed');
  leadId = leadCreate.data[0].id;

  const anonymousLeadRead = await call(`/rest/v1/consultation_leads?select=id&id=eq.${leadId}`);
  assert.equal(
    !anonymousLeadRead.response.ok || (Array.isArray(anonymousLeadRead.data) && anonymousLeadRead.data.length === 0),
    true,
    'Anonymous user could read leads',
  );
  await call(`/rest/v1/consultation_leads?id=eq.${leadId}`, { method: 'PATCH', body: { status: 'converted' }, headers: { Prefer: 'return=minimal' } });
  await call(`/rest/v1/consultation_leads?id=eq.${leadId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  const leadAfterAnonymousWrites = await call(`/rest/v1/consultation_leads?select=status&id=eq.${leadId}`, { token: serviceKey, key: serviceKey });
  assert.equal(leadAfterAnonymousWrites.data[0].status, 'new', 'Anonymous user changed or deleted a lead');

  const staffLeadRead = await call(`/rest/v1/consultation_leads?select=id&id=eq.${leadId}`, { token: accessToken });
  assert.equal(staffLeadRead.data.length, 1, 'Editor could not read leads');
  const staffLeadUpdate = await call(`/rest/v1/consultation_leads?id=eq.${leadId}`, { method: 'PATCH', token: accessToken, body: { status: 'contacted' }, headers: { Prefer: 'return=minimal' } });
  assert.equal(staffLeadUpdate.response.ok, true, 'Editor could not update lead status');

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1v8AAAAASUVORK5CYII=', 'base64');
  const anonymousUpload = await call(`/storage/v1/object/news-media/${objectPath}`, { method: 'POST', body: png, headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' } });
  assert.equal(anonymousUpload.response.ok, false, 'Anonymous user could upload media');
  const editorUpload = await call(`/storage/v1/object/news-media/${objectPath}`, { method: 'POST', token: accessToken, body: png, headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' } });
  assert.equal(editorUpload.response.ok, true, `Editor upload failed: ${JSON.stringify(editorUpload.data)}`);
  const editorDelete = await call(`/storage/v1/object/news-media/${objectPath}`, { method: 'DELETE', token: accessToken });
  assert.equal(editorDelete.response.ok, true, 'Editor media delete failed');

  console.log('CMS security verified: auth role, post visibility, lead RLS and storage RLS all passed.');
} finally {
  if (postId) await call(`/rest/v1/posts?id=eq.${postId}`, { method: 'DELETE', token: serviceKey, key: serviceKey });
  if (leadId) await call(`/rest/v1/consultation_leads?id=eq.${leadId}`, { method: 'DELETE', token: serviceKey, key: serviceKey });
  await call(`/storage/v1/object/news-media/${objectPath}`, { method: 'DELETE', token: serviceKey, key: serviceKey });
  if (userId) {
    await call(`/rest/v1/profiles?id=eq.${userId}`, { method: 'DELETE', token: serviceKey, key: serviceKey });
    await call(`/auth/v1/admin/users/${userId}`, { method: 'DELETE', token: serviceKey, key: serviceKey });
  }
}
