import { getAdminSession } from '../lib/server/admin-auth.js';
import { escapeHtml, html } from '../lib/server/http.js';

const redirect = (response, location) => {
  response.status(302);
  response.setHeader('Location', location);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.end();
};

const documentShell = ({ title, body, script }) => `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="same-origin">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/png" href="/assets/ukea-favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&amp;display=swap">
  <link rel="stylesheet" href="/admin/quill.snow.css">
  <link rel="stylesheet" href="/admin/admin.css?v=20260921">
</head>
<body>
${body}
<script src="/admin/quill.js"></script>
<script type="module" src="${script}"></script>
</body>
</html>`;

const loginPage = documentShell({
  title: 'Đăng nhập quản trị | UKEA',
  script: '/admin/login.js',
  body: `<main class="admin-login-shell">
    <section class="admin-login-card" aria-labelledby="login-title">
      <img src="/assets/ukea-logo-color.png" alt="UKEA – UK English Academy" width="1774" height="887">
      <p class="admin-eyebrow">HỆ THỐNG QUẢN TRỊ</p>
      <h1 id="login-title">Đăng nhập</h1>
      <p class="admin-muted">Sử dụng tài khoản Supabase Auth đã được cấp quyền quản trị UKEA.</p>
      <form id="admin-login-form" novalidate>
        <label for="admin-email">Email</label>
        <input id="admin-email" name="email" type="email" autocomplete="username" required>
        <label for="admin-password">Mật khẩu</label>
        <input id="admin-password" name="password" type="password" autocomplete="current-password" minlength="6" required>
        <button class="admin-button admin-button--primary" type="submit">Đăng nhập</button>
        <p id="login-message" class="form-feedback" role="status" aria-live="polite"></p>
      </form>
      <a class="admin-back-link" href="/">← Quay lại website</a>
    </section>
  </main>`,
});

const appPage = session => documentShell({
  title: 'Quản trị nội dung | UKEA',
  script: '/admin/admin.js',
  body: `<div class="admin-app" data-role="${escapeHtml(session.profile.role)}">
    <div class="admin-overlay" data-sidebar-close hidden></div>
    <aside class="admin-sidebar" id="admin-sidebar" aria-label="Điều hướng quản trị">
      <div class="admin-brand">
        <img src="/assets/ukea-logo-color.png" alt="UKEA" width="1774" height="887">
        <button class="admin-icon-button admin-sidebar-close" type="button" aria-label="Đóng menu" data-sidebar-close>×</button>
      </div>
      <nav>
        <a href="/quan-tri" data-admin-route="dashboard">Tổng quan</a>
        <a href="/quan-tri/bai-viet" data-admin-route="posts">Bài viết</a>
        <a href="/quan-tri/danh-muc" data-admin-route="categories">Danh mục</a>
        <a href="/quan-tri/media" data-admin-route="media">Media</a>
        <a href="/quan-tri/dang-ky" data-admin-route="leads">Đăng ký tư vấn</a>
      </nav>
      <div class="admin-sidebar-bottom">
        <a href="/" target="_blank" rel="noopener">Xem website ↗</a>
        <button type="button" id="admin-logout">Đăng xuất</button>
      </div>
    </aside>
    <div class="admin-main-shell">
      <header class="admin-topbar">
        <button class="admin-icon-button admin-menu-button" type="button" aria-label="Mở menu" aria-controls="admin-sidebar" aria-expanded="false">☰</button>
        <div><strong>${escapeHtml(session.profile.full_name || session.user.email)}</strong><span>${session.profile.role === 'admin' ? 'Quản trị viên' : 'Biên tập viên'}</span></div>
      </header>
      <main id="admin-content" tabindex="-1"><div class="admin-loading">Đang tải dữ liệu…</div></main>
    </div>
  </div>
  <div id="admin-toast" class="admin-toast" role="status" aria-live="polite"></div>
  <div id="admin-dialog-root"></div>`,
});

export default async function handler(request, response) {
  if (request.method !== 'GET') return html(response, 405, '<h1>Method not allowed</h1>');
  const path = String(request.query?.path || '').replace(/^\/+|\/+$/g, '');
  const login = path === 'dang-nhap';
  const session = await getAdminSession(request, response);

  if (login) {
    if (session) return redirect(response, '/quan-tri');
    return html(response, 200, loginPage);
  }
  if (!session) return redirect(response, '/quan-tri/dang-nhap');
  return html(response, 200, appPage(session));
}
