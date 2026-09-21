import categories from '../lib/admin-routes/categories.js';
import dashboard from '../lib/admin-routes/dashboard.js';
import lead from '../lib/admin-routes/lead.js';
import leads from '../lib/admin-routes/leads.js';
import login from '../lib/admin-routes/login.js';
import logout from '../lib/admin-routes/logout.js';
import media from '../lib/admin-routes/media.js';
import post from '../lib/admin-routes/post.js';
import posts from '../lib/admin-routes/posts.js';
import preview from '../lib/admin-routes/preview.js';
import session from '../lib/admin-routes/session.js';
import { clean, json } from '../lib/server/http.js';

const routes = {
  categories,
  dashboard,
  lead,
  leads,
  login,
  logout,
  media,
  post,
  posts,
  preview,
  session,
};

export default async function handler(request, response) {
  const action = clean(request.query?.action, 40).replace(/^\/+|\/+$/g, '');
  const route = routes[action];
  if (!route) return json(response, 404, { ok: false, message: 'Không tìm thấy chức năng quản trị.' });
  return route(request, response);
}
