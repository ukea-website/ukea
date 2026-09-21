const MAX_LENGTHS = {
  fullName: 120,
  phone: 30,
  email: 160,
  interest: 120,
  source: 80,
  pageUrl: 500,
};

const clean = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);

const json = (response, status, body) => {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { ok: false, message: 'Phương thức không được hỗ trợ.' });
  }

  const supabaseUrl = process.env.UKEA_SUPABASE_URL
    || process.env.NEXT_PUBLIC_UKEA_SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.UKEA_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_UKEA_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return json(response, 503, { ok: false, message: 'Hệ thống lưu dữ liệu chưa được cấu hình.' });
  }

  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return json(response, 400, { ok: false, message: 'Dữ liệu gửi lên không hợp lệ.' });
    }
  }

  body ??= {};

  // Honeypot: bots often fill hidden fields that real users never see.
  if (body.website) return json(response, 200, { ok: true });

  const lead = {
    full_name: clean(body.fullName, MAX_LENGTHS.fullName),
    phone: clean(body.phone, MAX_LENGTHS.phone),
    email: clean(body.email, MAX_LENGTHS.email) || null,
    interest: clean(body.interest, MAX_LENGTHS.interest) || 'Chưa xác định',
    source: clean(body.source, MAX_LENGTHS.source) || 'website',
    page_url: clean(body.pageUrl, MAX_LENGTHS.pageUrl) || null,
    consent: body.consent === true,
  };

  if (!lead.full_name || !lead.phone || !lead.consent) {
    return json(response, 400, { ok: false, message: 'Vui lòng nhập họ tên, số điện thoại và xác nhận đồng ý.' });
  }

  if (!/^[0-9+().\s-]{8,30}$/.test(lead.phone)) {
    return json(response, 400, { ok: false, message: 'Số điện thoại chưa đúng định dạng.' });
  }

  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return json(response, 400, { ok: false, message: 'Địa chỉ email chưa đúng định dạng.' });
  }

  try {
    const result = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/consultation_leads`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(lead),
    });

    if (!result.ok) {
      const details = await result.text();
      console.error('Supabase lead insert failed', result.status, details.slice(0, 500));
      return json(response, 503, {
        ok: false,
        message: result.status === 404
          ? 'Bảng dữ liệu Supabase chưa được khởi tạo.'
          : 'Chưa thể lưu đăng ký lúc này. Vui lòng thử lại sau.',
      });
    }

    return json(response, 201, { ok: true, message: 'Đăng ký đã được ghi nhận.' });
  } catch (error) {
    console.error('Lead API error', error);
    return json(response, 500, { ok: false, message: 'Có lỗi kết nối. Vui lòng thử lại sau.' });
  }
}
