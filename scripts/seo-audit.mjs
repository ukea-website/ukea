import fs from 'node:fs/promises';
import path from 'node:path';
import { PAGES, SITE } from '../seo/site-config.mjs';

const dist = path.join(process.cwd(), 'dist');
const errors = [];
const titles = new Set();
const descriptions = new Set();
const configuredFiles = new Set(PAGES.map(page => page.file));
const htmlFiles = (await fs.readdir(dist)).filter(file => file.endsWith('.html'));

for (const file of htmlFiles) {
  if (!configuredFiles.has(file)) errors.push(`${file}: missing from SEO page config`);
}

for (const page of PAGES) {
  const html = await fs.readFile(path.join(dist, page.file), 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim();
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) errors.push(`${page.file}: missing title`);
  else if (titles.has(title)) errors.push(`${page.file}: duplicate title`);
  else titles.add(title);

  if (!description) errors.push(`${page.file}: missing meta description`);
  else if (descriptions.has(description)) errors.push(`${page.file}: duplicate meta description`);
  else descriptions.add(description);

  if (canonical !== `${SITE.url}${page.path}`) errors.push(`${page.file}: invalid canonical ${canonical || '(missing)'}`);
  if (h1Count !== 1) errors.push(`${page.file}: expected one H1, found ${h1Count}`);
  if (!html.includes('property="og:title"')) errors.push(`${page.file}: missing Open Graph metadata`);
  if (!html.includes('name="twitter:card"')) errors.push(`${page.file}: missing Twitter metadata`);

  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    if (!/\balt=["'][^"']*["']/i.test(tag)) errors.push(`${page.file}: image missing alt`);
    if (!/\bwidth=["']?\d+/i.test(tag) || !/\bheight=["']?\d+/i.test(tag)) errors.push(`${page.file}: content image missing dimensions`);
  }

  for (const href of [...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map(match => match[1])) {
    if (/^(?:https?:|mailto:|tel:|#|\/)/i.test(href)) continue;
    const target = href.split(/[?#]/)[0];
    if (!target || target.endsWith('.css') || target.endsWith('.png') || target.endsWith('.pdf')) continue;
    const targetPath = path.join(dist, target);
    try {
      await fs.access(targetPath);
    } catch {
      errors.push(`${page.file}: broken internal link ${href}`);
    }
  }
}

const [robots, sitemap] = await Promise.all([
  fs.readFile(path.join(dist, 'robots.txt'), 'utf8'),
  fs.readFile(path.join(dist, 'sitemap.xml'), 'utf8'),
]);

if (!robots.includes(`Sitemap: ${SITE.url}/sitemap.xml`)) errors.push('robots.txt: invalid sitemap URL');
if (!robots.includes('Disallow: /quan-tri')) errors.push('robots.txt: admin rule missing');

for (const page of PAGES) {
  if (!sitemap.includes(`<loc>${SITE.url}${page.path}</loc>`)) errors.push(`sitemap.xml: missing ${page.path}`);
}

if (/vercel\.app|localhost|\/api\/|\/quan-tri/.test(sitemap)) errors.push('sitemap.xml: contains a forbidden URL');

if (errors.length) {
  console.error(`SEO audit failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`SEO audit passed: ${PAGES.length} public pages, unique metadata, valid canonicals, links, images, robots and sitemap.`);
}
