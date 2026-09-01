const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

function reply(response, status, message) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return response.status(status).json({ok: false, error: message});
}

function imageType(buffer, header) {
  const declared = String(header || '').split(';')[0].trim().toLowerCase();
  if (/^image\/(?:avif|gif|jpe?g|png|webp)$/.test(declared)) return declared;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (buffer.length >= 6 && /GIF8[79]a/.test(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return '';
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const result = await fetch(url, {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        'User-Agent': 'GMAHK-Galilea-Media-Proxy/1.0'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    if (!result.ok) throw new Error('HTTP ' + result.status);
    const declaredLength = Number(result.headers.get('content-length') || 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error('Gambar terlalu besar');
    const buffer = Buffer.from(await result.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar tidak valid');
    const contentType = imageType(buffer, result.headers.get('content-type'));
    if (!contentType) throw new Error('Respons bukan gambar');
    return {buffer, contentType};
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return reply(response, 405, 'Metode permintaan tidak didukung.');
  }

  const rawId = Array.isArray(request.query && request.query.id) ? request.query.id[0] : request.query && request.query.id;
  const id = String(rawId || '').trim();
  if (!DRIVE_ID_PATTERN.test(id)) return reply(response, 400, 'ID gambar tidak valid.');

  const candidates = [
    `https://lh3.googleusercontent.com/d/${id}=w1200`,
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`,
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=view`
  ];

  for (const url of candidates) {
    try {
      const image = await downloadImage(url);
      response.setHeader('Content-Type', image.contentType);
      response.setHeader('Content-Length', String(image.buffer.length));
      response.setHeader('Content-Disposition', 'inline');
      response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      if (request.method === 'HEAD') return response.status(200).end();
      return response.status(200).send(image.buffer);
    } catch (_) {
      // Coba endpoint resmi Google berikutnya sebelum menampilkan fallback inisial.
    }
  }

  return reply(response, 404, 'Gambar belum dapat diakses.');
}
