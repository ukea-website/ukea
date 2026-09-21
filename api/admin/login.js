import { getProfile, passwordLogin, setAuthCookies } from '../../lib/server/admin-auth.js';
import { clean, json, parseBody, requestOriginIsAllowed } from '../../lib/server/http.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'POST' });
  if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
  const body = parseBody(request);
  if (!body) return json(response, 400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
  const email = clean(body.email, 200).toLowerCase();
  const password = String(body.password || '');
  if (!email || password.length < 6) return json(response, 400, { ok: false, message: 'Vui lòng nhập email và mật khẩu.' });

  try {
    const login = await passwordLogin(email, password);
    if (!login.response.ok || !login.data?.access_token || !login.data?.user?.id) {
      return json(response, 401, { ok: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }
    const profileResult = await getProfile(login.data.access_token, login.data.user.id);
    if (!profileResult.response.ok || !profileResult.profile || !['admin', 'editor'].includes(profileResult.profile.role)) {
      return json(response, 403, { ok: false, message: 'Tài khoản chưa được cấp quyền quản trị.' });
    }
    setAuthCookies(response, login.data);
    return json(response, 200, { ok: true, profile: profileResult.profile });
  } catch (error) {
    console.error('Admin login failed', error?.message);
    return json(response, 500, { ok: false, message: 'Không thể đăng nhập lúc này. Vui lòng thử lại.' });
  }
}
