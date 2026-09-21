import { requireAdmin } from '../../lib/server/admin-auth.js';
import { clean, json, parseBody, requestOriginIsAllowed } from '../../lib/server/http.js';
import { readJson, supabaseFetch } from '../../lib/server/supabase.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set(['new', 'contacted', 'consulting', 'converted', 'closed']);

export default async function handler(request, response) {
  const session = await requireAdmin(request, response);
  if (!session) return;
  const id = String(request.query?.id || '');
  if (!uuidPattern.test(id)) return json(response, 400, { ok: false, message: 'ID đăng ký không hợp lệ.' });

  if (request.method === 'GET') {
    const [leadResponse, notesResponse] = await Promise.all([
      supabaseFetch(`/rest/v1/consultation_leads?select=*&id=eq.${id}&limit=1`, { token: session.accessToken }),
      supabaseFetch(`/rest/v1/lead_notes?select=id,content,created_at,created_by,profiles(full_name)&lead_id=eq.${id}&order=created_at.desc`, { token: session.accessToken }),
    ]);
    const leadData = await readJson(leadResponse);
    const notes = await readJson(notesResponse);
    if (!leadResponse.ok || !notesResponse.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải đăng ký.' });
    const lead = Array.isArray(leadData) ? leadData[0] : null;
    if (!lead) return json(response, 404, { ok: false, message: 'Không tìm thấy đăng ký.' });
    return json(response, 200, { ok: true, lead, notes: notes || [] });
  }

  if (request.method === 'PUT') {
    if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
    const body = parseBody(request);
    if (!body) return json(response, 400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
    const status = clean(body.status, 30);
    const note = clean(body.note, 4000);
    const notes = clean(body.notes, 4000);
    if (status && !statuses.has(status)) return json(response, 400, { ok: false, message: 'Trạng thái không hợp lệ.' });

    if (status || Object.prototype.hasOwnProperty.call(body, 'notes')) {
      const updateResponse = await supabaseFetch(`/rest/v1/consultation_leads?id=eq.${id}&select=*`, {
        method: 'PATCH',
        token: session.accessToken,
        headers: { Prefer: 'return=representation' },
        body: { ...(status ? { status } : {}), ...(Object.prototype.hasOwnProperty.call(body, 'notes') ? { notes: notes || null } : {}) },
      });
      if (!updateResponse.ok) return json(response, 400, { ok: false, message: 'Không thể cập nhật đăng ký.' });
    }

    if (note) {
      const noteResponse = await supabaseFetch('/rest/v1/lead_notes', {
        method: 'POST',
        token: session.accessToken,
        headers: { Prefer: 'return=minimal' },
        body: { lead_id: id, content: note, created_by: session.user.id },
      });
      if (!noteResponse.ok) return json(response, 400, { ok: false, message: 'Không thể lưu ghi chú.' });
    }
    return json(response, 200, { ok: true });
  }

  return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET, PUT' });
}
