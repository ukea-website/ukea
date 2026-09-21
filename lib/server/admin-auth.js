import { json, parseCookies, setCookies } from './http.js';
import { getSupabaseConfig, readJson, supabaseFetch } from './supabase.js';

const ACCESS_COOKIE = 'ukea_sb_access';
const REFRESH_COOKIE = 'ukea_sb_refresh';

export const setAuthCookies = (response, session) => {
  const maxAge = Number(session.expires_in || 3600);
  setCookies(response, [
    { name: ACCESS_COOKIE, value: session.access_token, options: { maxAge } },
    { name: REFRESH_COOKIE, value: session.refresh_token, options: { maxAge: 60 * 60 * 24 * 30 } },
  ]);
};
export const clearAuthCookies = response => setCookies(response, [
  { name: ACCESS_COOKIE, value: '', options: { maxAge: 0 } },
  { name: REFRESH_COOKIE, value: '', options: { maxAge: 0 } },
]);

export const passwordLogin = async (email, password) => {
  const { url, publicKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publicKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { response, data: await readJson(response) };
};

const refresh = async refreshToken => {
  const { url, publicKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: publicKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return { response, data: await readJson(response) };
};

const getUser = async token => {
  const response = await supabaseFetch('/auth/v1/user', { token });
  return { response, data: await readJson(response) };
};

export const getProfile = async (token, userId) => {
  const query = new URLSearchParams({ select: 'id,role,full_name,created_at,updated_at', id: `eq.${userId}`, limit: '1' });
  const response = await supabaseFetch(`/rest/v1/profiles?${query}`, { token });
  const data = await readJson(response);
  return { response, profile: Array.isArray(data) ? data[0] : null, data };
};

export const getAdminSession = async (request, response) => {
  const cookies = parseCookies(request);
  let accessToken = cookies[ACCESS_COOKIE];
  const refreshToken = cookies[REFRESH_COOKIE];
  if (!accessToken && !refreshToken) return null;

  let userResult = accessToken ? await getUser(accessToken) : { response: { ok: false } };
  if (!userResult.response.ok && refreshToken) {
    const refreshed = await refresh(refreshToken);
    if (!refreshed.response.ok || !refreshed.data?.access_token) return null;
    accessToken = refreshed.data.access_token;
    setAuthCookies(response, refreshed.data);
    userResult = await getUser(accessToken);
  }

  if (!userResult.response.ok || !userResult.data?.id) return null;
  const profileResult = await getProfile(accessToken, userResult.data.id);
  if (!profileResult.response.ok || !profileResult.profile || !['admin', 'editor'].includes(profileResult.profile.role)) return null;

  return { user: userResult.data, profile: profileResult.profile, accessToken };
};

export const requireAdmin = async (request, response, roles = ['admin', 'editor']) => {
  const session = await getAdminSession(request, response);
  if (!session) {
    json(response, 401, { ok: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    return null;
  }
  if (!roles.includes(session.profile.role)) {
    json(response, 403, { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
    return null;
  }
  return session;
};
