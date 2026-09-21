import { requireAdmin } from '../../lib/server/admin-auth.js';
import { json } from '../../lib/server/http.js';
import { readJson, supabaseFetch } from '../../lib/server/supabase.js';

const count = async (token, table, filter = '') => {
  const response = await supabaseFetch(`/rest/v1/${table}?select=id${filter}`, {
    token,
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  if (!response.ok) throw new Error(`Count failed for ${table}`);
  return Number(response.headers.get('content-range')?.split('/')[1] || 0);
};

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET' });
  const session = await requireAdmin(request, response);
  if (!session) return;

  try {
    const [totalPosts, publishedPosts, draftPosts, newLeads, todayLeads] = await Promise.all([
      count(session.accessToken, 'posts'),
      count(session.accessToken, 'posts', '&status=eq.published'),
      count(session.accessToken, 'posts', '&status=eq.draft'),
      count(session.accessToken, 'consultation_leads', '&status=eq.new'),
      count(session.accessToken, 'consultation_leads', `&created_at=gte.${encodeURIComponent(new Date(new Date().setHours(0, 0, 0, 0)).toISOString())}`),
    ]);

    const postQuery = new URLSearchParams({
      select: 'id,title,status,updated_at,post_categories(name)',
      order: 'updated_at.desc',
      limit: '6',
    });
    const leadQuery = new URLSearchParams({
      select: 'id,full_name,phone,interest,status,created_at',
      order: 'created_at.desc',
      limit: '6',
    });
    const [postResponse, leadResponse] = await Promise.all([
      supabaseFetch(`/rest/v1/posts?${postQuery}`, { token: session.accessToken }),
      supabaseFetch(`/rest/v1/consultation_leads?${leadQuery}`, { token: session.accessToken }),
    ]);
    if (!postResponse.ok || !leadResponse.ok) throw new Error('Recent data query failed');

    return json(response, 200, {
      ok: true,
      stats: { totalPosts, publishedPosts, draftPosts, newLeads, todayLeads },
      recentPosts: await readJson(postResponse),
      recentLeads: await readJson(leadResponse),
    });
  } catch (error) {
    console.error('Admin dashboard error', error?.message);
    return json(response, 503, { ok: false, message: 'Chưa thể tải dữ liệu tổng quan.' });
  }
}
