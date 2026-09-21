export const json = (response, status, body, headers = {}) => {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  response.end(JSON.stringify(body));
};

export const html = (response, status, body, headers = {}) => {
  response.status(status);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  response.end(body);
};

export const xml = (response, status, body) => {
  response.status(status);
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  response.end(body);
};

export const parseBody = request => {
  if (request.body == null) return {};
  if (typeof request.body === 'object') return request.body;
  try {
    return JSON.parse(request.body);
  } catch {
    return null;
  }
};

export const parseCookies = request => Object.fromEntries(
  String(request.headers.cookie || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separator = part.indexOf('=');
      const name = separator >= 0 ? part.slice(0, separator) : part;
      const value = separator >= 0 ? part.slice(separator + 1) : '';
      return [decodeURIComponent(name), decodeURIComponent(value)];
    }),
);

const cookie = (name, value, options = {}) => {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.maxAge != null) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure !== false) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  return parts.join('; ');
};

export const setCookies = (response, cookies) => {
  response.setHeader('Set-Cookie', cookies.map(item => cookie(item.name, item.value, item.options)));
};

export const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const requestOriginIsAllowed = request => {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

export const clean = (value, maxLength = 1000) => String(value ?? '').trim().slice(0, maxLength);
