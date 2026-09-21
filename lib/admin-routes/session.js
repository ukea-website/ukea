import { getAdminSession } from '../server/admin-auth.js';
import { json } from '../server/http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET' });
  const session = await getAdminSession(request, response);
  if (!session) return json(response, 401, { ok: false, message: 'Chưa đăng nhập.' });
  return json(response, 200, {
    ok: true,
    user: { id: session.user.id, email: session.user.email },
    profile: session.profile,
  });
}
