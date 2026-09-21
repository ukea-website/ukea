import { requireAdmin } from '../../lib/server/admin-auth.js';
import { readingTime, sanitizeArticleHtml, slugify } from '../../lib/server/content.js';
import { clean, json, parseBody, requestOriginIsAllowed } from '../../lib/server/http.js';
import { readJson, supabaseFetch } from '../../lib/server/supabase.js';

const statuses = new Set(['draft', 'published', 'scheduled', 'archived']);
const nullable = (value, max) => clean(value, max) || null;

const postPayload = (body, session, existing = null) => {
  const title = clean(body.title, 240);
  const slug = slugify(body.slug || title);
  const status = statuses.has(body.status) ? body.status : 'draft';
  const contentHtml = sanitizeArticleHtml(body.contentHtml);
  const now = new Date().toISOString();
  const publishedAt = status === 'published'
    ? (body.publishedAt || existing?.published_at || now)
    : (body.publishedAt || existing?.published_at || null);
  const scheduledAt = status === 'scheduled' ? (body.scheduledAt || null) : null;

  return {
    title,
    slug,
    excerpt: nullable(body.excerpt, 1000),
    content_html: contentHtml,
    category_id: nullable(body.categoryId, 80),
    featured_image: nullable(body.featuredImage, 1000),
    featured_image_alt: nullable(body.featuredImageAlt, 240),
    status,
    author_id: existing?.author_id || session.user.id,
    published_at: publishedAt,
    scheduled_at: scheduledAt,
    seo_title: nullable(body.seoTitle, 240),
    seo_description: nullable(body.seoDescription, 500),
    seo_keywords: nullable(body.seoKeywords, 500),
    canonical_url: nullable(body.canonicalUrl, 500),
    og_title: nullable(body.ogTitle, 240),
    og_description: nullable(body.ogDescription, 500),
    og_image: nullable(body.ogImage, 1000),
    robots_index: body.robotsIndex !== false,
    robots_follow: body.robotsFollow !== false,
    featured: body.featured === true,
    reading_time: readingTime(contentHtml),
  };
};

export { postPayload };

export default async function handler(request, response) {
  const session = await requireAdmin(request, response);
  if (!session) return;

  if (request.method === 'GET') {
    const page = Math.max(1, Number(request.query?.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(request.query?.pageSize || 20)));
    const search = clean(request.query?.search, 120);
    const status = clean(request.query?.status, 30);
    const category = clean(request.query?.category, 80);
    const params = new URLSearchParams({
      select: 'id,title,slug,excerpt,status,featured_image,published_at,updated_at,post_categories(id,name,slug)',
      order: 'updated_at.desc',
    });
    if (search) params.set('or', `(title.ilike.*${search.replace(/[(),]/g, '')}*,slug.ilike.*${slugify(search)}*)`);
    if (statuses.has(status)) params.set('status', `eq.${status}`);
    if (category) params.set('category_id', `eq.${category}`);
    const start = (page - 1) * pageSize;
    const result = await supabaseFetch(`/rest/v1/posts?${params}`, {
      token: session.accessToken,
      headers: { Prefer: 'count=exact', Range: `${start}-${start + pageSize - 1}` },
    });
    const data = await readJson(result);
    if (!result.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải danh sách bài viết.' });
    const total = Number(result.headers.get('content-range')?.split('/')[1] || 0);
    return json(response, 200, { ok: true, posts: data || [], page, pageSize, total });
  }

  if (request.method === 'POST') {
    if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
    const body = parseBody(request);
    if (!body) return json(response, 400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
    const payload = postPayload(body, session);
    if (!payload.title || !payload.slug) return json(response, 400, { ok: false, message: 'Tiêu đề và đường dẫn bài viết là bắt buộc.' });
    if (payload.status === 'scheduled' && !payload.scheduled_at) return json(response, 400, { ok: false, message: 'Vui lòng chọn thời gian xuất bản.' });

    const result = await supabaseFetch('/rest/v1/posts?select=*', {
      method: 'POST',
      token: session.accessToken,
      headers: { Prefer: 'return=representation' },
      body: payload,
    });
    const data = await readJson(result);
    if (!result.ok) {
      if (data?.code === '23505') return json(response, 409, { ok: false, message: 'Đường dẫn bài viết đã tồn tại.' });
      console.error('Create post failed', result.status, data?.message);
      return json(response, 400, { ok: false, message: 'Không thể tạo bài viết. Vui lòng kiểm tra dữ liệu.' });
    }
    return json(response, 201, { ok: true, post: data?.[0] });
  }

  return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET, POST' });
}
