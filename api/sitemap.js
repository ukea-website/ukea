import { PAGES, SITE, SITEMAP_LAST_MODIFIED } from '../seo/site-config.mjs';
import { xml } from '../lib/server/http.js';
import { readJson, supabaseFetch } from '../lib/server/supabase.js';

const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).setHeader('Allow', 'GET').end();
    return;
  }
  await supabaseFetch('/rest/v1/rpc/publish_due_posts', { method: 'POST', service: true, body: {} }).catch(() => {});
  const params = new URLSearchParams({
    select: 'slug,updated_at',
    status: 'eq.published',
    published_at: `lte.${new Date().toISOString()}`,
    order: 'published_at.desc',
  });
  const result = await supabaseFetch(`/rest/v1/posts?${params}`);
  const posts = result.ok ? (await readJson(result) || []) : [];
  const entries = [
    ...PAGES.map(page => ({ loc: `${SITE.url}${page.path}`, lastmod: SITEMAP_LAST_MODIFIED })),
    ...posts.map(post => ({ loc: `${SITE.url}/tin-tuc/${post.slug}`, lastmod: String(post.updated_at).slice(0, 10) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </url>`).join('\n')}
</urlset>\n`;
  return xml(response, 200, body);
}
