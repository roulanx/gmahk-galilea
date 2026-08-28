const PUBLIC_METHODS = new Set([
  'downloadQuarterlySchedulePdf',
  'findMemberSchedule',
  'getAdventTheme',
  'getAwrBorneoMedia',
  'getBibleBook',
  'getBibleBooks',
  'getBibleChapter',
  'getDailyDevotional',
  'getGalileaDownloadArchives',
  'getHymnalCatalog',
  'getHymnalSong',
  'getPersonalEvangelism',
  'getSabbathDiscussionVideos',
  'getSabbathLessonDetail',
  'getSabbathResourceDetail',
  'getSabbathResources',
  'getSabbathSchoolLibrary',
  'getWebsiteData',
  'searchWebsite',
  'submitServiceRequest',
  'translateViewerTexts'
]);

const BUILD = 'GALILEA-VERCEL-BRIDGE-17.1.0';
const MAX_REQUEST_BYTES = 180000;
const DEFAULT_API_URL = '';

function reply(response, status, body) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Galilea-Build', BUILD);
  return response.status(status).json(body);
}

function parseBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string' && request.body.trim()) return JSON.parse(request.body);
  return {};
}

function backendUrl(rawValue) {
  const url = new URL(String(rawValue || ''));
  const validHost = url.protocol === 'https:' && url.hostname === 'script.google.com';
  const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname);
  if (!validHost || !validPath) throw new Error('GALILEA_APPS_SCRIPT_API_URL belum valid. Gunakan URL deployment API yang berakhir /exec.');
  return url.toString();
}

export default async function handler(request, response) {
  if (request.method === 'GET') {
    return reply(response, 200, {
      ok: true,
      service: 'Galilea Vercel API Bridge',
      build: BUILD,
      configured: Boolean((process.env.GALILEA_APPS_SCRIPT_API_URL || DEFAULT_API_URL) && process.env.GALILEA_API_SECRET)
    });
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return reply(response, 405, {ok: false, error: 'Metode permintaan tidak didukung.'});
  }

  try {
    const configuredUrl = backendUrl(process.env.GALILEA_APPS_SCRIPT_API_URL || DEFAULT_API_URL);
    const secret = String(process.env.GALILEA_API_SECRET || '');
    if (secret.length < 32) throw new Error('GALILEA_API_SECRET belum dipasang atau terlalu pendek.');

    const rawLength = Number(request.headers['content-length'] || 0);
    if (rawLength > MAX_REQUEST_BYTES) return reply(response, 413, {ok: false, error: 'Permintaan terlalu besar.'});

    const body = parseBody(request);
    const method = String(body.method || '');
    const args = Array.isArray(body.args) ? body.args : [];
    if (!PUBLIC_METHODS.has(method)) return reply(response, 403, {ok: false, error: 'Fungsi tidak diizinkan pada viewer publik.'});
    if (args.length > 20 || JSON.stringify(args).length > MAX_REQUEST_BYTES) {
      return reply(response, 413, {ok: false, error: 'Parameter permintaan terlalu besar.'});
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    let upstream;
    try {
      upstream = await fetch(configuredUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Accept': 'application/json',
          'User-Agent': BUILD
        },
        body: JSON.stringify({secret, method, args}),
        redirect: 'follow',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (_) {
      const looksLikeHtml = /^\s*</.test(text);
      throw new Error(looksLikeHtml
        ? 'Backend Apps Script mengirim halaman HTML. Pasang VercelApi.gs lalu deploy versi terbaru.'
        : 'Respons backend tidak dapat dibaca.');
    }

    if (!upstream.ok || !payload || payload.ok !== true) {
      return reply(response, upstream.ok ? 502 : upstream.status, {
        ok: false,
        error: payload && payload.error ? payload.error : 'Backend Galilea belum dapat dihubungi.'
      });
    }

    return reply(response, 200, {ok: true, data: payload.data, meta: payload.meta || null});
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return reply(response, timedOut ? 504 : 500, {
      ok: false,
      error: timedOut
        ? 'Backend membutuhkan waktu terlalu lama. Silakan coba lagi.'
        : String(error && error.message ? error.message : error || 'Terjadi gangguan pada API Galilea.')
    });
  }
}
