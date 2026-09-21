import crypto from 'node:crypto';
import { requireAdmin } from '../../lib/server/admin-auth.js';
import { slugify } from '../../lib/server/content.js';
import { clean, json, parseBody, requestOriginIsAllowed } from '../../lib/server/http.js';
import { publicAssetUrl, readJson, supabaseFetch } from '../../lib/server/supabase.js';

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);
const maxBytes = 4 * 1024 * 1024;

export default async function handler(request, response) {
  const session = await requireAdmin(request, response);
  if (!session) return;

  if (request.method === 'GET') {
    const result = await supabaseFetch('/rest/v1/media_assets?select=*&order=created_at.desc&limit=200', { token: session.accessToken });
    const data = await readJson(result);
    if (!result.ok) return json(response, 503, { ok: false, message: 'Chưa thể tải thư viện media.' });
    return json(response, 200, { ok: true, media: data || [] });
  }

  if (!requestOriginIsAllowed(request)) return json(response, 403, { ok: false, message: 'Yêu cầu không hợp lệ.' });
  const body = parseBody(request);
  if (!body) return json(response, 400, { ok: false, message: 'Dữ liệu không hợp lệ.' });

  if (request.method === 'POST') {
    const mimeType = clean(body.mimeType, 80).toLowerCase();
    const extension = allowedTypes.get(mimeType);
    const sourceName = clean(body.filename, 240);
    const base64 = String(body.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!extension || !sourceName || !base64) return json(response, 400, { ok: false, message: 'Chỉ hỗ trợ JPG, PNG, WebP hoặc AVIF.' });
    let file;
    try {
      file = Buffer.from(base64, 'base64');
    } catch {
      return json(response, 400, { ok: false, message: 'Tệp tải lên không hợp lệ.' });
    }
    if (!file.length || file.length > maxBytes) return json(response, 400, { ok: false, message: 'Ảnh phải nhỏ hơn 4 MB.' });
    const baseName = slugify(sourceName.replace(/\.[^.]+$/, '')) || 'image';
    const objectPath = `${new Date().toISOString().slice(0, 7)}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${baseName}.${extension}`;
    const upload = await supabaseFetch(`/storage/v1/object/news-media/${objectPath}`, {
      method: 'POST',
      token: session.accessToken,
      headers: { 'Content-Type': mimeType, 'x-upsert': 'false' },
      body: file,
    });
    if (!upload.ok) {
      const error = await readJson(upload);
      console.error('Media upload failed', upload.status, error?.message);
      return json(response, 400, { ok: false, message: 'Không thể tải ảnh lên Storage.' });
    }
    const publicUrl = publicAssetUrl(objectPath);
    const metadata = await supabaseFetch('/rest/v1/media_assets?select=*', {
      method: 'POST',
      token: session.accessToken,
      headers: { Prefer: 'return=representation' },
      body: {
        object_path: objectPath,
        public_url: publicUrl,
        filename: sourceName,
        mime_type: mimeType,
        size_bytes: file.length,
        alt_text: clean(body.altText, 240) || null,
        uploaded_by: session.user.id,
      },
    });
    const data = await readJson(metadata);
    if (!metadata.ok) return json(response, 400, { ok: false, message: 'Ảnh đã tải lên nhưng chưa thể lưu metadata.' });
    return json(response, 201, { ok: true, media: data?.[0] });
  }

  if (request.method === 'DELETE') {
    const id = clean(body.id, 80);
    const assetResponse = await supabaseFetch(`/rest/v1/media_assets?select=*&id=eq.${id}&limit=1`, { token: session.accessToken });
    const assetData = await readJson(assetResponse);
    const asset = Array.isArray(assetData) ? assetData[0] : null;
    if (!asset) return json(response, 404, { ok: false, message: 'Không tìm thấy ảnh.' });
    const useQuery = new URLSearchParams({ select: 'id', or: `(featured_image.eq.${asset.public_url},og_image.eq.${asset.public_url})`, limit: '1' });
    const usageResponse = await supabaseFetch(`/rest/v1/posts?${useQuery}`, { token: session.accessToken });
    const usage = await readJson(usageResponse);
    if (Array.isArray(usage) && usage.length) return json(response, 409, { ok: false, message: 'Ảnh đang được bài viết sử dụng và không thể xóa.' });
    const storageDelete = await supabaseFetch(`/storage/v1/object/news-media/${asset.object_path}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (!storageDelete.ok) return json(response, 400, { ok: false, message: 'Không thể xóa ảnh khỏi Storage.' });
    await supabaseFetch(`/rest/v1/media_assets?id=eq.${id}`, { method: 'DELETE', token: session.accessToken });
    return json(response, 200, { ok: true });
  }

  return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' }, { Allow: 'GET, POST, DELETE' });
}
