import fs from 'node:fs/promises';
import path from 'node:path';
import { PAGES, SITE } from '../seo/site-config.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const jsonLd = page => {
  const nodes = [];

  if (page.home) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': ['Organization', 'EducationalOrganization'],
      name: SITE.name,
      legalName: SITE.legalName,
      url: SITE.url,
      logo: `${SITE.url}/assets/ukea-logo-color.png`,
      telephone: SITE.telephone,
      email: SITE.email,
      address: {
        '@type': 'PostalAddress',
        ...SITE.address,
      },
    });
  }

  if (page.breadcrumbs) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumbs.map(([name, route], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        item: `${SITE.url}${route}`,
      })),
    });
  }

  return nodes.map((node, index) => `<script id="seo-jsonld-${index + 1}" type="application/ld+json">${JSON.stringify(node).replaceAll('<', '\\u003c')}</script>`).join('\n  ');
};

const metadataBlock = page => {
  const canonical = `${SITE.url}${page.path}`;
  const image = `${SITE.url}${SITE.defaultOgImage}`;
  const structuredData = jsonLd(page);
  const structuredDataBlock = structuredData ? `\n  ${structuredData}` : '';
  return `<!-- SEO:START -->
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${SITE.locale}">
  <meta property="og:site_name" content="${escapeHtml(SITE.name)}">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1774">
  <meta property="og:image:height" content="887">
  <meta property="og:image:alt" content="Logo UKEA – UK English Academy">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(page.title)}">
  <meta name="twitter:description" content="${escapeHtml(page.description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&amp;display=swap">${structuredDataBlock}
  <!-- SEO:END -->`;
};

const imageDimensions = new Map([
  ['assets/module-report-card-sample.png', [1241, 1754]],
  ['assets/ote-advanced-certificate-sample.png', [1241, 1754]],
  ['assets/ote-certificate-sample.png', [1241, 1754]],
]);

const addImageDimensions = html => html.replace(/<img\b[^>]*>/gi, tag => {
  const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const dimensions = imageDimensions.get(src);
  if (!dimensions) return tag;
  const [width, height] = dimensions;
  let next = tag;
  if (!/\bwidth=/i.test(next)) next = next.replace(/>$/, ` width="${width}">`);
  if (!/\bheight=/i.test(next)) next = next.replace(/>$/, ` height="${height}">`);
  if (/\bloading=["']lazy["']/i.test(next) && !/\bdecoding=/i.test(next)) next = next.replace(/>$/, ' decoding="async">');
  return next;
});

for (const page of PAGES) {
  const filePath = path.join(dist, page.file);
  let html = await fs.readFile(filePath, 'utf8');

  html = html.replace(/\s*<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->\s*/g, '\n');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);

  const descriptionTag = `<meta name="description" content="${escapeHtml(page.description)}">`;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, descriptionTag);
  } else {
    html = html.replace(/<title>/i, `${descriptionTag}\n    <title>`);
  }

  html = html.replace(/<\/head>/i, `  ${metadataBlock(page)}\n</head>`);
  html = addImageDimensions(html);
  await fs.writeFile(filePath, html);
}

const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /quan-tri
Disallow: /quan-tri/

Sitemap: ${SITE.url}/sitemap.xml
`;

const manifest = {
  name: SITE.name,
  short_name: 'UKEA',
  description: 'Thông tin và tư vấn Oxford Test of English tại Việt Nam.',
  lang: SITE.language,
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#1b1464',
  icons: [{ src: '/assets/ukea-favicon.png', sizes: '1254x1254', type: 'image/png' }],
};

await Promise.all([
  fs.writeFile(path.join(dist, 'robots.txt'), robots),
  fs.writeFile(path.join(dist, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`),
  fs.mkdir(path.join(dist, 'admin'), { recursive: true }).then(() => Promise.all([
    fs.copyFile(path.join(root, 'node_modules', 'quill', 'dist', 'quill.js'), path.join(dist, 'admin', 'quill.js')),
    fs.copyFile(path.join(root, 'node_modules', 'quill', 'dist', 'quill.snow.css'), path.join(dist, 'admin', 'quill.snow.css')),
  ])),
]);

console.log(`SEO build complete: ${PAGES.length} pages, robots.txt, dynamic sitemap config and manifest generated.`);
