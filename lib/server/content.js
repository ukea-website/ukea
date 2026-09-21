import sanitizeHtml from 'sanitize-html';

export const slugify = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 180);

export const sanitizeArticleHtml = value => sanitizeHtml(String(value || ''), {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'figure', 'figcaption', 'span', 'code', 'pre',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    span: ['class'],
    p: ['class'],
  },
  allowedClasses: {
    span: ['ql-*'],
    p: ['ql-*'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    h1: 'h2',
    a: (tagName, attributes) => ({
      tagName,
      attribs: {
        ...attributes,
        ...(attributes.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
      },
    }),
    img: (tagName, attributes) => ({
      tagName,
      attribs: { ...attributes, loading: 'lazy' },
    }),
  },
  exclusiveFilter: frame => frame.tag === 'script' || frame.tag === 'style',
});

export const readingTime = html => {
  const words = sanitizeHtml(String(html || ''), { allowedTags: [], allowedAttributes: {} })
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};
