import { requireAdmin } from '../server/admin-auth.js';
import { clean, json } from '../server/http.js';
import { readJson, supabaseFetch } from '../server/supabase.js';

const statuses = new Set(['new', 'contacted', 'consulting', 'converted', 'closed']);
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET' });
  const session = await requireAdmin(request, response);
  if (!session) return;

  const page = Math.max(1, Number(request.query?.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(request.query?.pageSize || 25)));
  const search = clean(request.query?.search, 120).replace(/[(),]/g, '');
  const status = clean(request.query?.status, 30);
  const source = clean(request.query?.source, 80);
  const from = clean(request.query?.from, 30);
  const to = clean(request.query?.to, 30);
  const sort = request.query?.sort === 'oldest' ? 'created_at.asc' : 'created_at.desc';
  const format = request.query?.format === 'csv' ? 'csv' : 'json';
  const params = new URLSearchParams({
    select: 'id,full_name,phone,email,interest,test_type,message,source,page_url,status,notes,created_at,updated_at,utm_source,utm_medium,utm_campaign',
    order: sort,
  });
  if (search) params.set('or', `(full_name.ilike.*${search}*,phone.ilike.*${search}*,email.ilike.*${search}*)`);
  if (statuses.has(status)) params.set('status', `eq.${status}`);
  if (source) params.set('source', `eq.${source}`);
  if (from) params.set('created_at', `gte.${new Date(`${from}T00:00:00+07:00`).toISOString()}`);
  if (to) params.append('created_at', `lte.${new Date(`${to}T23:59:59+07:00`).toISOString()}`);

  const start = format === 'csv' ? 0 : (page - 1) * pageSize;
  const end = format === 'csv' ? 4999 : start + pageSize - 1;
  const result = await supabaseFetch(`/rest/v1/consultation_leads?${params}`, {
    token: session.accessToken,
    headers: { Prefer: 'count=exact', Range: `${start}-${end}` },
  });
  const data = await readJson(result);
  if (!result.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải danh sách đăng ký.' });

  if (format === 'csv') {
    const headers = ['Họ tên', 'Số điện thoại', 'Email', 'Nhu cầu', 'Loại bài thi', 'Nguồn', 'Trang gửi', 'Trạng thái', 'Ngày đăng ký'];
    const rows = (data || []).map(lead => [lead.full_name, lead.phone, lead.email, lead.interest, lead.test_type, lead.source, lead.page_url, lead.status, lead.created_at]);
    const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    response.status(200);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="ukea-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    response.setHeader('Cache-Control', 'no-store');
    return response.end(csv);
  }

  const total = Number(result.headers.get('content-range')?.split('/')[1] || 0);
  return json(response, 200, { ok: true, leads: data || [], page, pageSize, total });
}
