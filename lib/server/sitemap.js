import { PAGES, SITE, SITEMAP_LAST_MODIFIED } from '../../seo/site-config.mjs';

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
  ? String(value)
  : SITEMAP_LAST_MODIFIED;

export const createSitemapXml = (posts = []) => {
  const dynamicEntries = Array.isArray(posts)
    ? posts
      .filter(post => /^[a-z0-9-]+$/.test(String(post?.slug || '')))
      .map(post => ({
        loc: `${SITE.url}/tin-tuc/${post.slug}`,
        lastmod: validDate(String(post.updated_at || '').slice(0, 10)),
      }))
    : [];
  const entries = [
    ...PAGES.map(page => ({ loc: `${SITE.url}${page.path}`, lastmod: SITEMAP_LAST_MODIFIED })),
    ...dynamicEntries,
  ];
  const uniqueEntries = [...new Map(entries.map(entry => [entry.loc, entry])).values()];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueEntries.map(entry => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </url>`).join('\n')}
</urlset>\n`;
};
