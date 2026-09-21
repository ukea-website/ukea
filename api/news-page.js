import { escapeHtml } from '../lib/server/http.js';
import { readJson, supabaseFetch } from '../lib/server/supabase.js';

const SITE_URL = 'https://ukea.com.vn';
const DEFAULT_OG = `${SITE_URL}/assets/ukea-logo-color.png`;

const send = (response, status, body) => {
  response.status(status);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=60, stale-while-revalidate=600' : 'public, s-maxage=30');
  response.end(body);
};

const layout = ({ title, description, canonical, image, robots, article, status = 200 }) => send(article.response, status, `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${escapeHtml(robots)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" type="image/png" href="/assets/ukea-favicon.png">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:site_name" content="UKEA – UK English Academy">
  <meta property="og:title" content="${escapeHtml(article.ogTitle || title)}">
  <meta property="og:description" content="${escapeHtml(article.ogDescription || description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.ogTitle || title)}">
  <meta name="twitter:description" content="${escapeHtml(article.ogDescription || description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  ${article.jsonLd ? `<script type="application/ld+json">${article.jsonLd}</script>` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&amp;display=swap">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/news.css?v=20260921">
</head>
<body>
  <div id="site-header"></div>
  <main id="main">${article.body}</main>
  <div id="site-footer"></div>
  <script src="/site-v3.js"></script>
  <script src="/nav.js"></script>
  <script src="/consult-modal.js"></script>
  <script src="/header-contact.js"></script>
</body>
</html>`);

export default async function handler(request, response) {
  if (request.method !== 'GET') return send(response, 405, '<h1>Method not allowed</h1>');
  await supabaseFetch('/rest/v1/rpc/publish_due_posts', { method: 'POST', service: true, body: {} }).catch(() => {});
  const slug = String(request.query?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 180);
  const params = new URLSearchParams({
    select: '*,post_categories(name,slug)',
    slug: `eq.${slug}`,
    status: 'eq.published',
    published_at: `lte.${new Date().toISOString()}`,
    limit: '1',
  });
  const result = await supabaseFetch(`/rest/v1/posts?${params}`);
  const data = await readJson(result);
  const post = Array.isArray(data) ? data[0] : null;
  if (!result.ok || !post) {
    return layout({
      title: 'Không tìm thấy bài viết | UKEA',
      description: 'Bài viết không tồn tại hoặc chưa được xuất bản.',
      canonical: `${SITE_URL}/tin-tuc/${slug}`,
      image: DEFAULT_OG,
      robots: 'noindex, nofollow',
      status: 404,
      article: {
        response,
        body: '<section class="section news-not-found"><p class="eyebrow">404</p><h1>Không tìm thấy bài viết</h1><p>Bài viết không tồn tại hoặc chưa được xuất bản.</p><a class="primary" href="/tin-tuc">Quay lại Tin tức</a></section>',
      },
    });
  }

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || 'Tin tức Oxford Test of English từ UKEA.';
  const canonical = post.canonical_url || `${SITE_URL}/tin-tuc/${post.slug}`;
  const image = post.og_image || post.featured_image || DEFAULT_OG;
  const publishedDate = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(post.published_at));
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description,
    image: [image],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: 'UKEA – UK English Academy' },
    publisher: { '@type': 'Organization', name: 'UKEA – UK English Academy', logo: { '@type': 'ImageObject', url: DEFAULT_OG } },
    mainEntityOfPage: canonical,
  }).replaceAll('<', '\\u003c');
  const featured = post.featured_image
    ? `<figure class="article-featured"><img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.featured_image_alt || post.title)}" loading="eager"></figure>`
    : '';
  const category = post.post_categories?.name || 'Tin tức';
  const body = `<article class="public-article">
    <nav class="article-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><a href="/tin-tuc">Tin tức</a><span>/</span><span aria-current="page">${escapeHtml(post.title)}</span></nav>
    <header><p class="eyebrow">${escapeHtml(category)}</p><h1>${escapeHtml(post.title)}</h1><p class="article-meta">${escapeHtml(publishedDate)} · ${Number(post.reading_time || 1)} phút đọc</p>${post.excerpt ? `<p class="article-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}</header>
    ${featured}
    <div class="article-content">${post.content_html}</div>
    <footer><a class="secondary" href="/tin-tuc">← Xem tất cả tin tức</a></footer>
  </article>`;

  return layout({
    title,
    description,
    canonical,
    image,
    robots: `${post.robots_index ? 'index' : 'noindex'}, ${post.robots_follow ? 'follow' : 'nofollow'}, max-image-preview:large`,
    article: { response, body, ogTitle: post.og_title, ogDescription: post.og_description, jsonLd },
  });
}
