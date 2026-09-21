import { clearAuthCookies, getAdminSession } from '../../lib/server/admin-auth.js';
import { json, requestOriginIsAllowed } from '../../lib/server/http.js';
import { supabaseFetch } from '../../lib/server/supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'POST' });
  if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
  const session = await getAdminSession(request, response);
  if (session) {
    await supabaseFetch('/auth/v1/logout', { method: 'POST', token: session.accessToken }).catch(() => {});
  }
  clearAuthCookies(response);
  return json(response, 200, { ok: true });
}
