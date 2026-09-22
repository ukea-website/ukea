import { xml } from '../lib/server/http.js';
import { readJson, supabaseFetch } from '../lib/server/supabase.js';
import { createSitemapXml } from '../lib/server/sitemap.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).setHeader('Allow', 'GET').end();
    return;
  }
  let posts = [];
  try {
    await supabaseFetch('/rest/v1/rpc/publish_due_posts', { method: 'POST', service: true, body: {} }).catch(() => {});
    const params = new URLSearchParams({
      select: 'slug,updated_at',
      status: 'eq.published',
      published_at: `lte.${new Date().toISOString()}`,
      order: 'published_at.desc',
    });
    const result = await supabaseFetch(`/rest/v1/posts?${params}`);
    if (result.ok) {
      const data = await readJson(result);
      posts = Array.isArray(data) ? data : [];
    } else {
      console.error('Sitemap posts query failed', result.status);
    }
  } catch (error) {
    console.error('Sitemap Supabase fallback activated', error?.message);
  }
  return xml(response, 200, createSitemapXml(posts));
}
