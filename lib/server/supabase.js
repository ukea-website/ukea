const first = (...values) => values.find(Boolean);

export const getSupabaseConfig = () => {
  const url = first(process.env.UKEA_SUPABASE_URL, process.env.NEXT_PUBLIC_UKEA_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publicKey = first(
    process.env.UKEA_SUPABASE_PUBLISHABLE_KEY,
    process.env.UKEA_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_UKEA_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_UKEA_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const serviceKey = first(process.env.UKEA_SUPABASE_SERVICE_ROLE_KEY, process.env.UKEA_SUPABASE_SECRET_KEY);
  if (!url || !publicKey) throw new Error('Supabase URL/publishable key is not configured.');
  return { url: url.replace(/\/$/, ''), publicKey, serviceKey };
};
export const supabaseFetch = async (path, options = {}) => {
  const { url, publicKey, serviceKey } = getSupabaseConfig();
  const apiKey = options.service ? serviceKey : publicKey;
  if (!apiKey) throw new Error('Supabase server secret is not configured.');
  const headers = new Headers(options.headers || {});
  headers.set('apikey', apiKey);
  headers.set('Authorization', `Bearer ${options.token || apiKey}`);
  if (options.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  return fetch(`${url}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body == null || options.body instanceof Uint8Array || Buffer.isBuffer(options.body)
      ? options.body
      : JSON.stringify(options.body),
  });
};

export const readJson = async response => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const publicAssetUrl = objectPath => {
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/news-media/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
};
