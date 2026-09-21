import { requireAdmin } from '../../lib/server/admin-auth.js';
import { json, parseBody, requestOriginIsAllowed } from '../../lib/server/http.js';
import { readJson, supabaseFetch } from '../../lib/server/supabase.js';
import { postPayload } from './posts.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  const session = await requireAdmin(request, response);
  if (!session) return;
  const id = String(request.query?.id || '');
  if (!uuidPattern.test(id)) return json(response, 400, { ok: false, message: 'ID bài viết không hợp lệ.' });

  const select = '*,post_categories(id,name,slug)';
  const currentResponse = await supabaseFetch(`/rest/v1/posts?select=${encodeURIComponent(select)}&id=eq.${id}&limit=1`, { token: session.accessToken });
  const currentData = await readJson(currentResponse);
  const current = Array.isArray(currentData) ? currentData[0] : null;
  if (!currentResponse.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải bài viết.' });
  if (!current) return json(response, 404, { ok: false, message: 'Không tìm thấy bài viết.' });

  if (request.method === 'GET') return json(response, 200, { ok: true, post: current });

  if (request.method === 'PUT') {
    if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
    const body = parseBody(request);
    if (!body) return json(response, 400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
    const payload = postPayload(body, session, current);
    if (!payload.title || !payload.slug) return json(response, 400, { ok: false, message: 'Tiêu đề và đường dẫn bài viết là bắt buộc.' });
    const result = await supabaseFetch(`/rest/v1/posts?id=eq.${id}&select=*`, {
      method: 'PATCH',
      token: session.accessToken,
      headers: { Prefer: 'return=representation' },
      body: payload,
    });
    const data = await readJson(result);
    if (!result.ok) {
      if (data?.code === '23505') return json(response, 409, { ok: false, message: 'Đường dẫn bài viết đã tồn tại.' });
      console.error('Update post failed', result.status, data?.message);
      return json(response, 400, { ok: false, message: 'Không thể cập nhật bài viết.' });
    }
    return json(response, 200, { ok: true, post: data?.[0] });
  }

  return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET, PUT' });
}
