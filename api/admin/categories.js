import { requireAdmin } from '../../lib/server/admin-auth.js';
import { slugify } from '../../lib/server/content.js';
import { clean, json, parseBody, requestOriginIsAllowed } from '../../lib/server/http.js';
import { readJson, supabaseFetch } from '../../lib/server/supabase.js';

export default async function handler(request, response) {
  const session = await requireAdmin(request, response);
  if (!session) return;

  if (request.method === 'GET') {
    const result = await supabaseFetch('/rest/v1/post_categories?select=*&order=name.asc', { token: session.accessToken });
    const data = await readJson(result);
    if (!result.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải danh mục.' });
    return json(response, 200, { ok: true, categories: data || [] });
  }

  if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
  const body = parseBody(request);
  if (!body) return json(response, 400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
  const id = clean(body.id, 80);

  if (request.method === 'POST' || request.method === 'PUT') {
    const payload = {
      name: clean(body.name, 120),
      slug: slugify(body.slug || body.name),
      description: clean(body.description, 500) || null,
    };
    if (!payload.name || !payload.slug) return json(response, 400, { ok: false, message: 'Tên và slug danh mục là bắt buộc.' });
    const path = request.method === 'POST'
      ? '/rest/v1/post_categories?select=*'
      : `/rest/v1/post_categories?id=eq.${id}&select=*`;
    const result = await supabaseFetch(path, {
      method: request.method === 'POST' ? 'POST' : 'PATCH',
      token: session.accessToken,
      headers: { Prefer: 'return=representation' },
      body: payload,
    });
    const data = await readJson(result);
    if (!result.ok) {
      if (data?.code === '23505') return json(response, 409, { ok: false, message: 'Slug danh mục đã tồn tại.' });
      return json(response, 400, { ok: false, message: 'Không thể lưu danh mục.' });
    }
    return json(response, request.method === 'POST' ? 201 : 200, { ok: true, category: data?.[0] });
  }

  if (request.method === 'DELETE') {
    if (!id) return json(response, 400, { ok: false, message: 'Thiếu ID danh mục.' });
    const result = await supabaseFetch(`/rest/v1/post_categories?id=eq.${id}`, {
      method: 'DELETE',
      token: session.accessToken,
      headers: { Prefer: 'return=minimal' },
    });
    if (!result.ok) return json(response, 400, { ok: false, message: 'Không thể xóa danh mục.' });
    return json(response, 200, { ok: true });
  }

  return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET, POST, PUT, DELETE' });
}
