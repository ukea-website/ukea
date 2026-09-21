import { requireAdmin } from '../server/admin-auth.js';
import { escapeHtml } from '../server/http.js';
import { readJson, supabaseFetch } from '../server/supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).setHeader('Allow', 'GET').end();
    return;
  }
  const session = await requireAdmin(request, response);
  if (!session) return;
  const id = String(request.query?.id || '');
  const result = await supabaseFetch(`/rest/v1/posts?select=*,post_categories(name)&id=eq.${encodeURIComponent(id)}&limit=1`, { token: session.accessToken });
  const data = await readJson(result);
  const post = Array.isArray(data) ? data[0] : null;
  if (!result.ok || !post) {
    response.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').end('<h1>Không tìm thấy bài viết</h1>');
    return;
  }
  response.status(200);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.end(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Xem trước: ${escapeHtml(post.title)}</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/news.css"></head><body><main><article class="public-article"><p class="eyebrow">BẢN XEM TRƯỚC · ${escapeHtml(post.post_categories?.name || 'Chưa có danh mục')}</p><h1>${escapeHtml(post.title)}</h1>${post.excerpt ? `<p class="article-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}${post.featured_image ? `<figure class="article-featured"><img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.featured_image_alt || post.title)}"></figure>` : ''}<div class="article-content">${post.content_html}</div></article></main></body></html>`);
}
