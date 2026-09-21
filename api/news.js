import { clean, json } from '../lib/server/http.js';
import { readJson, supabaseFetch } from '../lib/server/supabase.js';

const publishDuePosts = async () => {
  try {
    await supabaseFetch('/rest/v1/rpc/publish_due_posts', { method: 'POST', service: true, body: {} });
  } catch (error) {
    console.error('Scheduled publish check failed', error?.message);
  }
};

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET' });
  await publishDuePosts();
  const category = clean(request.query?.category, 120);
  const limit = Math.min(24, Math.max(1, Number(request.query?.limit || 12)));
  const offset = Math.max(0, Number(request.query?.offset || 0));
  const categoryRelation = category
    ? 'post_categories!inner(name,slug)'
    : 'post_categories(name,slug)';
  const params = new URLSearchParams({
    select: `id,title,slug,excerpt,featured_image,featured_image_alt,published_at,updated_at,reading_time,${categoryRelation}`,
    status: 'eq.published',
    published_at: `lte.${new Date().toISOString()}`,
    order: 'featured.desc,published_at.desc',
  });
  if (category) params.set('post_categories.slug', `eq.${category}`);
  const result = await supabaseFetch(`/rest/v1/posts?${params}`, {
    headers: { Prefer: 'count=exact', Range: `${offset}-${offset + limit - 1}` },
  });
  const data = await readJson(result);
  if (!result.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải tin tức.' });
  const total = Number(result.headers.get('content-range')?.split('/')[1] || 0);
  return json(response, 200, { ok: true, posts: data || [], total, offset, limit }, { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });
}
