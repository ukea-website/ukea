const content = document.querySelector('#admin-content');
const toastNode = document.querySelector('#admin-toast');
const role = document.querySelector('.admin-app')?.dataset.role;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const formatDate = (value, withTime = false) => value ? new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value)) : '—';
const labels = {
  draft: 'Bản nháp', published: 'Đã xuất bản', scheduled: 'Đã lên lịch', archived: 'Đã lưu trữ',
  new: 'Mới', contacted: 'Đã liên hệ', consulting: 'Đang tư vấn', converted: 'Đã chuyển đổi', closed: 'Đã đóng',
};
const statusBadge = status => `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(labels[status] || status)}</span>`;

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  });
  if (response.status === 401) {
    window.location.replace('/quan-tri/dang-nhap');
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }
  const type = response.headers.get('content-type') || '';
  const data = type.includes('json') ? await response.json().catch(() => ({})) : await response.text();
  if (!response.ok) throw new Error(data?.message || 'Không thể hoàn thành yêu cầu.');
  return data;
};

let toastTimer;
const toast = (message, error = false) => {
  clearTimeout(toastTimer);
  toastNode.textContent = message;
  toastNode.classList.toggle('is-error', error);
  toastNode.classList.add('is-visible');
  toastTimer = setTimeout(() => toastNode.classList.remove('is-visible'), 3200);
};

const confirmAction = ({ title, message, confirmLabel = 'Xác nhận', danger = false }) => new Promise(resolve => {
  const root = document.querySelector('#admin-dialog-root');
  root.innerHTML = `<div class="admin-dialog-backdrop" role="presentation"><section class="admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><div class="admin-dialog-actions"><button class="admin-button" type="button" data-cancel>Hủy</button><button class="admin-button ${danger ? 'admin-button--danger' : 'admin-button--primary'}" type="button" data-confirm>${escapeHtml(confirmLabel)}</button></div></section></div>`;
  const finish = value => { root.innerHTML = ''; resolve(value); };
  root.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
  root.querySelector('[data-confirm]').addEventListener('click', () => finish(true));
  root.querySelector('[data-confirm]').focus();
});

const pageHeader = (title, description, actions = '') => `<header class="admin-page-header"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions ? `<div class="admin-actions">${actions}</div>` : ''}</header>`;
const emptyState = message => `<div class="admin-empty"><p>${escapeHtml(message)}</p></div>`;

const setupShell = () => {
  const sidebar = document.querySelector('.admin-sidebar');
  const overlay = document.querySelector('.admin-overlay');
  const menu = document.querySelector('.admin-menu-button');
  const close = () => { sidebar.classList.remove('is-open'); overlay.hidden = true; menu.setAttribute('aria-expanded', 'false'); };
  menu?.addEventListener('click', () => { sidebar.classList.add('is-open'); overlay.hidden = false; menu.setAttribute('aria-expanded', 'true'); });
  document.querySelectorAll('[data-sidebar-close]').forEach(button => button.addEventListener('click', close));
  document.querySelector('#admin-logout')?.addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => {});
    window.location.replace('/quan-tri/dang-nhap');
  });
};

const routeName = () => {
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/quan-tri') return 'dashboard';
  if (path === '/quan-tri/bai-viet') return 'posts';
  if (path === '/quan-tri/bai-viet/tao-moi') return 'post-editor';
  if (/^\/quan-tri\/bai-viet\/[0-9a-f-]+$/i.test(path)) return 'post-editor';
  if (path === '/quan-tri/danh-muc') return 'categories';
  if (path === '/quan-tri/media') return 'media';
  if (path === '/quan-tri/dang-ky') return 'leads';
  if (/^\/quan-tri\/dang-ky\/[0-9a-f-]+$/i.test(path)) return 'lead-detail';
  return 'not-found';
};

const markCurrentNav = route => {
  const group = route.startsWith('post') ? 'posts' : route.startsWith('lead') ? 'leads' : route;
  document.querySelectorAll('[data-admin-route]').forEach(link => link.toggleAttribute('aria-current', link.dataset.adminRoute === group));
};

const renderDashboard = async () => {
  content.innerHTML = pageHeader('Tổng quan', 'Dữ liệu bài viết và đăng ký tư vấn từ Supabase.') + '<div class="admin-loading">Đang tải dữ liệu…</div>';
  const data = await api('/api/admin/dashboard');
  const stats = [
    ['Tổng bài viết', data.stats.totalPosts], ['Đã xuất bản', data.stats.publishedPosts], ['Bản nháp', data.stats.draftPosts],
    ['Đăng ký mới', data.stats.newLeads], ['Đăng ký hôm nay', data.stats.todayLeads],
  ];
  content.innerHTML = `${pageHeader('Tổng quan', 'Dữ liệu bài viết và đăng ký tư vấn từ Supabase.')}
    <section class="admin-stats">${stats.map(([label, value]) => `<article class="admin-stat"><span>${label}</span><strong>${value}</strong></article>`).join('')}</section>
    <section class="admin-grid-2">
      <article class="admin-card"><h2>Bài viết gần đây</h2>${data.recentPosts.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Tiêu đề</th><th>Danh mục</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>${data.recentPosts.map(post => `<tr><td><a href="/quan-tri/bai-viet/${post.id}">${escapeHtml(post.title)}</a></td><td>${escapeHtml(post.post_categories?.name || '—')}</td><td>${statusBadge(post.status)}</td><td>${formatDate(post.updated_at)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('Chưa có bài viết.')}</article>
      <article class="admin-card"><h2>Đăng ký gần đây</h2>${data.recentLeads.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Họ tên</th><th>Điện thoại</th><th>Nhu cầu</th><th>Trạng thái</th></tr></thead><tbody>${data.recentLeads.map(lead => `<tr><td><a href="/quan-tri/dang-ky/${lead.id}">${escapeHtml(lead.full_name)}</a></td><td><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td><td>${escapeHtml(lead.interest)}</td><td>${statusBadge(lead.status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('Chưa có đăng ký tư vấn.')}</article>
    </section>`;
};

let categoryCache;
const loadCategories = async () => {
  if (!categoryCache) categoryCache = (await api('/api/admin/categories')).categories;
  return categoryCache;
};

const renderPosts = async () => {
  const categories = await loadCategories();
  content.innerHTML = `${pageHeader('Bài viết', 'Tạo, xuất bản và quản lý nội dung tin tức.', '<a class="admin-button admin-button--primary" href="/quan-tri/bai-viet/tao-moi">+ Tạo bài viết</a>')}
    <form class="admin-toolbar" id="post-filters">
      <div class="admin-field"><label for="post-search">Tìm kiếm</label><input id="post-search" name="search" type="search" placeholder="Tiêu đề hoặc slug"></div>
      <div class="admin-field"><label for="post-status">Trạng thái</label><select id="post-status" name="status"><option value="">Tất cả</option>${['draft','published','scheduled','archived'].map(value => `<option value="${value}">${labels[value]}</option>`).join('')}</select></div>
      <div class="admin-field"><label for="post-category">Danh mục</label><select id="post-category" name="category"><option value="">Tất cả</option>${categories.map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('')}</select></div>
      <button class="admin-button" type="submit">Lọc</button>
    </form><div id="post-results"><div class="admin-loading">Đang tải bài viết…</div></div>`;
  let page = 1;
  const load = async () => {
    const form = document.querySelector('#post-filters');
    const query = new URLSearchParams(new FormData(form));
    query.set('page', page);
    const data = await api(`/api/admin/posts?${query}`);
    const target = document.querySelector('#post-results');
    target.innerHTML = data.posts.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Ảnh</th><th>Tiêu đề</th><th>Danh mục</th><th>Trạng thái</th><th>Ngày đăng</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>${data.posts.map(post => `<tr><td>${post.featured_image ? `<img class="admin-table-thumb" src="${escapeHtml(post.featured_image)}" alt="">` : '—'}</td><td><strong>${escapeHtml(post.title)}</strong><br><small>/${escapeHtml(post.slug)}</small></td><td>${escapeHtml(post.post_categories?.name || '—')}</td><td>${statusBadge(post.status)}</td><td>${formatDate(post.published_at)}</td><td>${formatDate(post.updated_at)}</td><td><a href="/quan-tri/bai-viet/${post.id}">Chỉnh sửa</a></td></tr>`).join('')}</tbody></table></div>
      <div class="admin-pagination"><span>${data.total} bài viết</span><div><button class="admin-button" data-prev ${page <= 1 ? 'disabled' : ''}>Trước</button><button class="admin-button" data-next ${(page * data.pageSize) >= data.total ? 'disabled' : ''}>Sau</button></div></div>` : emptyState('Không tìm thấy bài viết phù hợp.');
    target.querySelector('[data-prev]')?.addEventListener('click', () => { page -= 1; load(); });
    target.querySelector('[data-next]')?.addEventListener('click', () => { page += 1; load(); });
  };
  document.querySelector('#post-filters').addEventListener('submit', event => { event.preventDefault(); page = 1; load(); });
  await load();
};

const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
const fileAsDataUrl = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
const chooseMedia = async () => {
  const result = await api('/api/admin/media');
  return new Promise(resolve => {
    const root = document.querySelector('#admin-dialog-root');
    root.innerHTML = `<div class="admin-dialog-backdrop"><section class="admin-dialog admin-dialog--media" role="dialog" aria-modal="true" aria-labelledby="media-dialog-title"><h2 id="media-dialog-title">Chọn ảnh từ thư viện</h2>${result.media.length ? `<div class="media-picker-grid">${result.media.map(item => `<button class="media-picker-item" type="button" data-media-id="${item.id}"><img src="${escapeHtml(item.public_url)}" alt="${escapeHtml(item.alt_text || item.filename)}"><span>${escapeHtml(item.filename)}</span></button>`).join('')}</div>` : emptyState('Chưa có ảnh trong thư viện.')}<div class="admin-dialog-actions"><button class="admin-button" type="button" data-cancel>Đóng</button></div></section></div>`;
    const finish = item => { root.innerHTML = ''; resolve(item); };
    root.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
    root.querySelectorAll('[data-media-id]').forEach(button => button.addEventListener('click', () => finish(result.media.find(item => item.id === button.dataset.mediaId))));
  });
};

const renderPostEditor = async () => {
  const id = location.pathname.split('/').pop();
  const editing = id !== 'tao-moi';
  const [categories, postData] = await Promise.all([loadCategories(), editing ? api(`/api/admin/post?id=${encodeURIComponent(id)}`) : Promise.resolve({ post: null })]);
  const post = postData.post;
  const oldSlug = post?.slug || '';
  content.innerHTML = `${pageHeader(editing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết', editing ? 'Cập nhật nội dung, trạng thái và metadata SEO.' : 'Soạn nội dung mới cho chuyên mục Tin tức.', `${editing ? `<a class="admin-button" href="/api/admin/preview?id=${id}" target="_blank" rel="noopener">Xem trước ↗</a>` : ''}<a class="admin-button" href="/quan-tri/bai-viet">← Bài viết</a>`)}
    <form id="post-form" class="post-editor-layout" novalidate>
      <section class="post-editor-main">
        <article class="admin-card">
          <div class="admin-field"><label for="post-title">Tiêu đề bài viết</label><input class="post-title-input" id="post-title" name="title" placeholder="Nhập tiêu đề bài viết..." required value="${escapeHtml(post?.title || '')}"></div>
          <div class="admin-field"><label for="post-excerpt">Mô tả ngắn</label><textarea id="post-excerpt" name="excerpt" maxlength="1000" placeholder="Tóm tắt nội dung bài viết">${escapeHtml(post?.excerpt || '')}</textarea></div>
        </article>
        <article class="admin-card"><h2>Nội dung</h2><div id="editor-toolbar"><span class="ql-formats"><button class="ql-undo" type="button" aria-label="Hoàn tác">↶</button><button class="ql-redo" type="button" aria-label="Làm lại">↷</button></span><span class="ql-formats"><select class="ql-header" aria-label="Kiểu đoạn"><option selected></option><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option></select></span><span class="ql-formats"><button class="ql-bold" type="button"></button><button class="ql-italic" type="button"></button><button class="ql-underline" type="button"></button></span><span class="ql-formats"><button class="ql-list" value="ordered" type="button"></button><button class="ql-list" value="bullet" type="button"></button><button class="ql-blockquote" type="button"></button></span><span class="ql-formats"><button class="ql-link" type="button"></button><button class="ql-image" type="button"></button><button class="ql-divider" type="button" aria-label="Đường phân cách">―</button><button class="ql-clean" type="button"></button></span></div><div id="post-editor"></div></article>
        <article class="admin-card"><h2>Tối ưu SEO</h2>
          <div class="admin-field"><label for="seo-title">SEO title</label><input id="seo-title" name="seoTitle" maxlength="240" value="${escapeHtml(post?.seo_title || '')}"><div class="char-counter" data-counter="seo-title" data-max="60"></div></div>
          <div class="admin-field"><label for="seo-description">Meta description</label><textarea id="seo-description" name="seoDescription" maxlength="500">${escapeHtml(post?.seo_description || '')}</textarea><div class="char-counter" data-counter="seo-description" data-max="160"></div></div>
          <div class="admin-field"><label for="seo-keywords">Từ khóa</label><input id="seo-keywords" name="seoKeywords" value="${escapeHtml(post?.seo_keywords || '')}"></div>
          <div class="admin-field"><label for="canonical-url">Canonical URL</label><input id="canonical-url" name="canonicalUrl" type="url" value="${escapeHtml(post?.canonical_url || '')}" placeholder="Để trống để dùng URL bài viết"></div>
          <div class="admin-grid-2"><label class="admin-check"><input id="robots-index" name="robotsIndex" type="checkbox" ${post?.robots_index === false ? '' : 'checked'}> Robots index</label><label class="admin-check"><input id="robots-follow" name="robotsFollow" type="checkbox" ${post?.robots_follow === false ? '' : 'checked'}> Robots follow</label></div>
          <div class="admin-field"><label for="og-title">OG title</label><input id="og-title" name="ogTitle" value="${escapeHtml(post?.og_title || '')}"></div>
          <div class="admin-field"><label for="og-description">OG description</label><textarea id="og-description" name="ogDescription">${escapeHtml(post?.og_description || '')}</textarea></div>
          <div class="admin-field"><label for="og-image">OG image URL</label><input id="og-image" name="ogImage" type="url" value="${escapeHtml(post?.og_image || '')}"></div>
          <div class="seo-preview"><span class="url" id="seo-preview-url"></span><h3 id="seo-preview-title"></h3><p id="seo-preview-description"></p></div>
        </article>
      </section>
      <aside class="post-editor-side">
        <article class="admin-card"><h2>Xuất bản</h2>
          <div class="admin-field"><label for="post-status">Trạng thái</label><select id="post-status" name="status">${['draft','published','scheduled','archived'].map(value => `<option value="${value}" ${post?.status === value ? 'selected' : ''}>${labels[value]}</option>`).join('')}</select></div>
          <div class="admin-field"><label for="post-category">Danh mục</label><select id="post-category" name="categoryId"><option value="">Chưa chọn</option>${categories.map(category => `<option value="${category.id}" ${post?.category_id === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select></div>
          <div class="admin-field"><label for="published-at">Ngày đăng</label><input id="published-at" name="publishedAt" type="datetime-local" value="${post?.published_at ? new Date(post.published_at).toISOString().slice(0,16) : ''}"></div>
          <div class="admin-field"><label for="scheduled-at">Lên lịch xuất bản</label><input id="scheduled-at" name="scheduledAt" type="datetime-local" value="${post?.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0,16) : ''}"></div>
          <label class="admin-check"><input id="post-featured" name="featured" type="checkbox" ${post?.featured ? 'checked' : ''}> Bài nổi bật</label>
          <div class="admin-actions"><button class="admin-button" type="button" data-save-draft>Lưu nháp</button><button class="admin-button admin-button--primary" type="submit">${editing ? 'Cập nhật' : 'Xuất bản'}</button></div>
          <p class="form-feedback" id="post-message" role="status"></p>
        </article>
        <article class="admin-card"><h2>Đường dẫn</h2><div class="admin-field"><label for="post-slug">Slug</label><input id="post-slug" name="slug" required value="${escapeHtml(post?.slug || '')}"><small>https://ukea.com.vn/tin-tuc/<span id="slug-preview"></span></small></div><p id="slug-warning" class="form-feedback"></p></article>
        <article class="admin-card"><h2>Ảnh đại diện</h2><div class="image-preview" id="image-preview">${post?.featured_image ? `<img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.featured_image_alt || '')}">` : '<span>Chưa có ảnh</span>'}</div><input id="featured-image" name="featuredImage" type="hidden" value="${escapeHtml(post?.featured_image || '')}"><div class="admin-field"><label for="featured-image-alt">ALT text</label><input id="featured-image-alt" name="featuredImageAlt" value="${escapeHtml(post?.featured_image_alt || '')}"></div><div class="admin-actions"><label class="admin-button" for="featured-file">Tải ảnh</label><input id="featured-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden><button class="admin-button" type="button" data-select-media>Thư viện</button><button class="admin-button" type="button" data-remove-image>Xóa ảnh</button></div></article>
      </aside>
    </form>`;

  if (!window.Quill) throw new Error('Không thể tải trình soạn thảo.');
  if (!window.__ukeaDividerRegistered) {
    const BlockEmbed = Quill.import('blots/block/embed');
    class DividerBlot extends BlockEmbed { static blotName = 'divider'; static tagName = 'hr'; }
    Quill.register(DividerBlot);
    window.__ukeaDividerRegistered = true;
  }
  const quill = new Quill('#post-editor', {
    theme: 'snow',
    placeholder: 'Viết nội dung bài viết…',
    modules: { toolbar: { container: '#editor-toolbar', handlers: {
      undo() { this.quill.history.undo(); }, redo() { this.quill.history.redo(); }, divider() { const range = this.quill.getSelection(true); this.quill.insertEmbed(range.index, 'divider', true, Quill.sources.USER); this.quill.setSelection(range.index + 1); },
    } }, history: { delay: 700, maxStack: 100, userOnly: true } },
    formats: ['header','bold','italic','underline','strike','list','blockquote','link','image','divider'],
  });
  if (post?.content_html) quill.clipboard.dangerouslyPasteHTML(post.content_html);

  const form = document.querySelector('#post-form');
  const titleInput = document.querySelector('#post-title');
  const slugInput = document.querySelector('#post-slug');
  let slugTouched = editing;
  const updateSeoPreview = () => {
    const slug = slugInput.value || slugify(titleInput.value);
    document.querySelector('#slug-preview').textContent = slug;
    document.querySelector('#seo-preview-url').textContent = `https://ukea.com.vn/tin-tuc/${slug}`;
    document.querySelector('#seo-preview-title').textContent = document.querySelector('#seo-title').value || titleInput.value || 'Tiêu đề bài viết';
    document.querySelector('#seo-preview-description').textContent = document.querySelector('#seo-description').value || document.querySelector('#post-excerpt').value || 'Mô tả bài viết sẽ xuất hiện tại đây.';
    const changedPublishedSlug = editing && post.status === 'published' && slug !== oldSlug;
    document.querySelector('#slug-warning').textContent = changedPublishedSlug ? 'Thay đổi đường dẫn có thể ảnh hưởng SEO và các liên kết hiện tại.' : '';
    document.querySelectorAll('[data-counter]').forEach(node => { const input = document.querySelector(`#${node.dataset.counter}`); const length = input.value.length; node.textContent = `${length}/${node.dataset.max} ký tự khuyến nghị`; node.classList.toggle('is-over', length > Number(node.dataset.max)); });
  };
  titleInput.addEventListener('input', () => { if (!slugTouched) slugInput.value = slugify(titleInput.value); updateSeoPreview(); });
  slugInput.addEventListener('input', () => { slugTouched = true; slugInput.value = slugify(slugInput.value); updateSeoPreview(); });
  ['seo-title','seo-description','post-excerpt'].forEach(id => document.querySelector(`#${id}`).addEventListener('input', updateSeoPreview));
  updateSeoPreview();

  document.querySelector('#featured-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast('Ảnh phải nhỏ hơn 4 MB.', true);
    try {
      toast('Đang tải ảnh lên…');
      const dataBase64 = await fileAsDataUrl(file);
      const result = await api('/api/admin/media', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, dataBase64, altText: document.querySelector('#featured-image-alt').value }) });
      document.querySelector('#featured-image').value = result.media.public_url;
      document.querySelector('#image-preview').innerHTML = `<img src="${escapeHtml(result.media.public_url)}" alt="">`;
      toast('Đã tải ảnh lên Supabase Storage.');
    } catch (error) { toast(error.message, true); }
  });
  document.querySelector('[data-remove-image]').addEventListener('click', () => { document.querySelector('#featured-image').value = ''; document.querySelector('#image-preview').innerHTML = '<span>Chưa có ảnh</span>'; });
  document.querySelector('[data-select-media]').addEventListener('click', async () => {
    const item = await chooseMedia();
    if (!item) return;
    document.querySelector('#featured-image').value = item.public_url;
    if (!document.querySelector('#featured-image-alt').value) document.querySelector('#featured-image-alt').value = item.alt_text || '';
    document.querySelector('#image-preview').innerHTML = `<img src="${escapeHtml(item.public_url)}" alt="">`;
  });

  const collect = statusOverride => {
    const data = Object.fromEntries(new FormData(form));
    return {
      ...data,
      status: statusOverride || data.status,
      contentHtml: quill.root.innerHTML,
      robotsIndex: document.querySelector('#robots-index').checked,
      robotsFollow: document.querySelector('#robots-follow').checked,
      featured: document.querySelector('#post-featured').checked,
      publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
    };
  };
  const save = async statusOverride => {
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const payload = collect(statusOverride);
    if (payload.status === 'scheduled' && !payload.scheduledAt) return toast('Vui lòng chọn thời gian xuất bản.', true);
    if (payload.status === 'archived' && post?.status !== 'archived') {
      const confirmed = await confirmAction({ title: 'Lưu trữ bài viết?', message: 'Bài viết sẽ ngừng xuất hiện trên website và sitemap.', confirmLabel: 'Lưu trữ', danger: true });
      if (!confirmed) return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(editing ? `/api/admin/post?id=${id}` : '/api/admin/posts', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      toast(payload.status === 'published' ? 'Đã xuất bản bài viết.' : payload.status === 'draft' ? 'Đã lưu bản nháp.' : 'Cập nhật thành công.');
      if (!editing) window.location.replace(`/quan-tri/bai-viet/${result.post.id}`);
    } catch (error) { toast(error.message, true); }
    finally { button.disabled = false; }
  };
  form.addEventListener('submit', event => { event.preventDefault(); save(); });
  document.querySelector('[data-save-draft]').addEventListener('click', () => save('draft'));
};

const renderCategories = async () => {
  const load = async () => {
    categoryCache = null;
    const categories = await loadCategories();
    content.innerHTML = `${pageHeader('Danh mục', 'Quản lý danh mục bài viết từ Supabase.')}
      <section class="admin-grid-2"><article class="admin-card"><h2 id="category-form-title">Thêm danh mục</h2><form id="category-form"><input type="hidden" name="id"><div class="admin-field"><label for="category-name">Tên danh mục</label><input id="category-name" name="name" required></div><div class="admin-field"><label for="category-slug">Slug</label><input id="category-slug" name="slug"></div><div class="admin-field"><label for="category-description">Mô tả</label><textarea id="category-description" name="description"></textarea></div><div class="admin-actions"><button class="admin-button admin-button--primary" type="submit" data-category-save>Thêm danh mục</button><button class="admin-button" type="button" data-category-cancel hidden>Hủy sửa</button></div></form></article>
      <article class="admin-card"><h2>Danh mục hiện có</h2><div class="category-list">${categories.map(category => `<div class="category-row"><div><strong>${escapeHtml(category.name)}</strong><br><small>/${escapeHtml(category.slug)}</small></div><span>${escapeHtml(category.description || '')}</span><div class="admin-actions"><button class="admin-button" type="button" data-edit-category="${category.id}">Sửa</button><button class="admin-button admin-button--danger" type="button" data-delete-category="${category.id}">Xóa</button></div></div>`).join('') || emptyState('Chưa có danh mục.')}</div></article></section>`;
    const name = document.querySelector('#category-name'); const slug = document.querySelector('#category-slug'); let touched = false;
    name.addEventListener('input', () => { if (!touched) slug.value = slugify(name.value); }); slug.addEventListener('input', () => { touched = true; slug.value = slugify(slug.value); });
    const form = document.querySelector('#category-form');
    const resetCategoryForm = () => { form.reset(); form.elements.id.value = ''; touched = false; document.querySelector('#category-form-title').textContent = 'Thêm danh mục'; document.querySelector('[data-category-save]').textContent = 'Thêm danh mục'; document.querySelector('[data-category-cancel]').hidden = true; };
    document.querySelectorAll('[data-edit-category]').forEach(button => button.addEventListener('click', () => { const category = categories.find(item => item.id === button.dataset.editCategory); form.elements.id.value = category.id; form.elements.name.value = category.name; form.elements.slug.value = category.slug; form.elements.description.value = category.description || ''; touched = true; document.querySelector('#category-form-title').textContent = 'Sửa danh mục'; document.querySelector('[data-category-save]').textContent = 'Cập nhật'; document.querySelector('[data-category-cancel]').hidden = false; form.elements.name.focus(); }));
    document.querySelector('[data-category-cancel]').addEventListener('click', resetCategoryForm);
    form.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget)); try { await api('/api/admin/categories', { method: payload.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); toast(payload.id ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.'); load(); } catch (error) { toast(error.message, true); } });
    document.querySelectorAll('[data-delete-category]').forEach(button => button.addEventListener('click', async () => { if (!await confirmAction({ title: 'Xóa danh mục?', message: 'Bài viết thuộc danh mục này sẽ chuyển sang trạng thái chưa có danh mục.', confirmLabel: 'Xóa', danger: true })) return; try { await api('/api/admin/categories', { method: 'DELETE', body: JSON.stringify({ id: button.dataset.deleteCategory }) }); toast('Đã xóa danh mục.'); load(); } catch (error) { toast(error.message, true); } }));
  };
  await load();
};

const renderMedia = async () => {
  const load = async () => {
    const data = await api('/api/admin/media');
    content.innerHTML = `${pageHeader('Media', 'Ảnh được lưu trong Supabase Storage bucket news-media.', '<label class="admin-button admin-button--primary" for="media-upload">+ Tải ảnh</label><input id="media-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden>')}
      ${data.media.length ? `<section class="media-grid">${data.media.map(item => `<article class="media-card"><img src="${escapeHtml(item.public_url)}" alt="${escapeHtml(item.alt_text || item.filename)}" loading="lazy"><div class="media-card-body"><strong title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</strong><small>${Math.ceil(item.size_bytes / 1024)} KB · ${formatDate(item.created_at)}</small><div class="media-actions"><button type="button" data-copy="${escapeHtml(item.public_url)}">Copy URL</button><button type="button" data-delete-media="${item.id}">Xóa</button></div></div></article>`).join('')}</section>` : emptyState('Chưa có ảnh trong thư viện.')}`;
    document.querySelector('#media-upload').addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; try { const dataBase64 = await fileAsDataUrl(file); await api('/api/admin/media', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, dataBase64 }) }); toast('Đã tải ảnh lên.'); load(); } catch (error) { toast(error.message, true); } });
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => { await navigator.clipboard.writeText(button.dataset.copy); toast('Đã sao chép URL.'); }));
    document.querySelectorAll('[data-delete-media]').forEach(button => button.addEventListener('click', async () => { if (!await confirmAction({ title: 'Xóa ảnh?', message: 'Ảnh đang được bài viết sử dụng sẽ không thể xóa.', confirmLabel: 'Xóa', danger: true })) return; try { await api('/api/admin/media', { method: 'DELETE', body: JSON.stringify({ id: button.dataset.deleteMedia }) }); toast('Đã xóa ảnh.'); load(); } catch (error) { toast(error.message, true); } }));
  };
  await load();
};

const renderLeads = async () => {
  content.innerHTML = `${pageHeader('Đăng ký tư vấn', 'Quản lý lead gửi từ các form public.', '<button class="admin-button" type="button" id="export-leads">Xuất CSV</button>')}
    <form class="admin-toolbar" id="lead-filters"><div class="admin-field"><label for="lead-search">Tìm kiếm</label><input id="lead-search" name="search" type="search" placeholder="Tên, điện thoại, email"></div><div class="admin-field"><label for="lead-status">Trạng thái</label><select id="lead-status" name="status"><option value="">Tất cả</option>${['new','contacted','consulting','converted','closed'].map(value => `<option value="${value}">${labels[value]}</option>`).join('')}</select></div><div class="admin-field"><label for="lead-source">Nguồn</label><select id="lead-source" name="source"><option value="">Tất cả</option><option value="consultation-page">Trang đăng ký</option><option value="consultation-modal">Popup tư vấn</option></select></div><div class="admin-field"><label for="lead-sort">Sắp xếp</label><select id="lead-sort" name="sort"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select></div><div class="admin-field"><label for="lead-from">Từ ngày</label><input id="lead-from" name="from" type="date"></div><div class="admin-field"><label for="lead-to">Đến ngày</label><input id="lead-to" name="to" type="date"></div><button class="admin-button" type="submit">Lọc</button></form><div id="lead-results"><div class="admin-loading">Đang tải đăng ký…</div></div>`;
  let page = 1;
  const queryFromForm = () => new URLSearchParams(new FormData(document.querySelector('#lead-filters')));
  const load = async () => {
    const query = queryFromForm(); query.set('page', page);
    const data = await api(`/api/admin/leads?${query}`);
    const target = document.querySelector('#lead-results');
    target.innerHTML = data.leads.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Họ tên</th><th>Điện thoại</th><th>Email</th><th>Nhu cầu</th><th>Nguồn</th><th>Ngày đăng ký</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${data.leads.map(lead => `<tr><td>${escapeHtml(lead.full_name)}</td><td><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td><td>${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : '—'}</td><td>${escapeHtml(lead.interest)}</td><td>${escapeHtml(lead.source)}</td><td>${formatDate(lead.created_at, true)}</td><td>${statusBadge(lead.status)}</td><td><a href="/quan-tri/dang-ky/${lead.id}">Chi tiết</a></td></tr>`).join('')}</tbody></table></div><div class="admin-pagination"><span>${data.total} đăng ký</span><div><button class="admin-button" data-prev ${page <= 1 ? 'disabled' : ''}>Trước</button><button class="admin-button" data-next ${(page * data.pageSize) >= data.total ? 'disabled' : ''}>Sau</button></div></div>` : emptyState('Không tìm thấy đăng ký phù hợp.');
    target.querySelector('[data-prev]')?.addEventListener('click', () => { page -= 1; load(); }); target.querySelector('[data-next]')?.addEventListener('click', () => { page += 1; load(); });
  };
  document.querySelector('#lead-filters').addEventListener('submit', event => { event.preventDefault(); page = 1; load(); });
  document.querySelector('#export-leads').addEventListener('click', async () => { const query = queryFromForm(); query.set('format', 'csv'); try { const response = await fetch(`/api/admin/leads?${query}`, { credentials: 'same-origin' }); if (!response.ok) throw new Error('Không thể xuất CSV.'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = Object.assign(document.createElement('a'), { href: url, download: `ukea-leads-${new Date().toISOString().slice(0,10)}.csv` }); link.click(); URL.revokeObjectURL(url); } catch (error) { toast(error.message, true); } });
  await load();
};

const renderLeadDetail = async () => {
  const id = location.pathname.split('/').pop();
  const data = await api(`/api/admin/lead?id=${id}`);
  const lead = data.lead;
  const fields = [['Họ tên', lead.full_name], ['Điện thoại', `<a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a>`], ['Email', lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : '—'], ['Nhu cầu', escapeHtml(lead.interest)], ['Loại bài thi', escapeHtml(lead.test_type || '—')], ['Tin nhắn', escapeHtml(lead.message || '—')], ['Nguồn', escapeHtml(lead.source)], ['Trang gửi', lead.page_url ? `<a href="${escapeHtml(lead.page_url)}" target="_blank" rel="noopener">${escapeHtml(lead.page_url)}</a>` : '—'], ['Ngày gửi', formatDate(lead.created_at, true)]];
  content.innerHTML = `${pageHeader('Chi tiết đăng ký', 'Cập nhật trạng thái và lưu lịch sử chăm sóc.', '<a class="admin-button" href="/quan-tri/dang-ky">← Danh sách</a>')}
    <section class="admin-grid-2"><article class="admin-card"><h2>Thông tin học viên</h2><div class="lead-detail-grid">${fields.map(([label, value]) => `<div class="lead-detail-item"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div></article><article class="admin-card"><h2>Chăm sóc</h2><form id="lead-update"><div class="admin-field"><label for="detail-status">Trạng thái</label><select id="detail-status" name="status">${['new','contacted','consulting','converted','closed'].map(value => `<option value="${value}" ${lead.status === value ? 'selected' : ''}>${labels[value]}</option>`).join('')}</select></div><div class="admin-field"><label for="detail-notes">Ghi chú tổng quan</label><textarea id="detail-notes" name="notes">${escapeHtml(lead.notes || '')}</textarea></div><div class="admin-field"><label for="detail-note">Thêm ghi chú lịch sử</label><textarea id="detail-note" name="note" placeholder="Nội dung trao đổi hoặc bước tiếp theo"></textarea></div><button class="admin-button admin-button--primary" type="submit">Cập nhật</button></form><div class="lead-notes"><h3>Lịch sử ghi chú</h3>${data.notes.length ? data.notes.map(note => `<article class="lead-note"><p>${escapeHtml(note.content)}</p><small>${escapeHtml(note.profiles?.full_name || 'Nhân viên UKEA')} · ${formatDate(note.created_at, true)}</small></article>`).join('') : '<p class="admin-muted">Chưa có ghi chú.</p>'}</div></article></section>`;
  document.querySelector('#lead-update').addEventListener('submit', async event => { event.preventDefault(); try { await api(`/api/admin/lead?id=${id}`, { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); toast('Cập nhật thành công.'); renderLeadDetail(); } catch (error) { toast(error.message, true); } });
};

const renderNotFound = () => { content.innerHTML = `${pageHeader('Không tìm thấy trang', 'Đường dẫn quản trị không tồn tại.')}<a class="admin-button admin-button--primary" href="/quan-tri">Về Tổng quan</a>`; };

const start = async () => {
  setupShell();
  const route = routeName();
  markCurrentNav(route);
  try {
    if (route === 'dashboard') await renderDashboard();
    else if (route === 'posts') await renderPosts();
    else if (route === 'post-editor') await renderPostEditor();
    else if (route === 'categories') await renderCategories();
    else if (route === 'media') await renderMedia();
    else if (route === 'leads') await renderLeads();
    else if (route === 'lead-detail') await renderLeadDetail();
    else renderNotFound();
    content.focus({ preventScroll: true });
  } catch (error) {
    console.error(error);
    content.innerHTML = `${pageHeader('Không thể tải dữ liệu', 'Đã xảy ra lỗi khi kết nối Supabase.')}<div class="admin-card"><p>${escapeHtml(error.message)}</p><button class="admin-button" type="button" onclick="location.reload()">Thử lại</button></div>`;
  }
};

start();
