const BUILD = 'GALILEA-INSTAGRAM-31.5.0';
const DEFAULT_API_VERSION = 'v25.0';
const DEFAULT_USERNAME = 'advent.galilea';

function reply(response, status, body, cacheable) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cacheable
    ? 'public, s-maxage=300, stale-while-revalidate=86400'
    : 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Galilea-Build', BUILD);
  return response.status(status).json(body);
}

function clean(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength || 500);
}

function instagramUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || !/(^|\.)instagram\.com$/i.test(url.hostname)) return '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function publishedLabel(timestamp) {
  const parsed = Date.parse(String(timestamp || ''));
  if (!Number.isFinite(parsed)) return '';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(parsed));
}

function mediaTime(item) {
  const parsed = Date.parse(String(item && item.timestamp || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isReel(item) {
  const product = clean(item && item.media_product_type, 30).toUpperCase();
  const permalink = instagramUrl(item && item.permalink);
  return product === 'REELS' || /\/reel\//i.test(permalink);
}

function reelPayload(item, username) {
  const permalink = instagramUrl(item && item.permalink);
  const match = permalink && new URL(permalink).pathname.match(/^\/reel\/([^/]+)/i);
  if (!match) return null;
  const shortcode = clean(match[1], 80);
  return {
    id: clean(item.id, 120),
    username: clean(item.username || username, 40),
    caption: clean(item.caption, 1200),
    permalink,
    embedUrl: 'https://www.instagram.com/reel/' + encodeURIComponent(shortcode) + '/embed/',
    timestamp: clean(item.timestamp, 80),
    publishedLabel: publishedLabel(item.timestamp)
  };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return reply(response, 405, {ok: false, error: 'Metode permintaan tidak didukung.'}, false);
  }

  const token = clean(process.env.INSTAGRAM_ACCESS_TOKEN, 4096);
  const accountId = clean(process.env.INSTAGRAM_ACCOUNT_ID || 'me', 120);
  const username = clean(process.env.INSTAGRAM_USERNAME || DEFAULT_USERNAME, 40);
  const version = /^v\d+\.\d+$/.test(clean(process.env.INSTAGRAM_API_VERSION, 20))
    ? clean(process.env.INSTAGRAM_API_VERSION, 20)
    : DEFAULT_API_VERSION;
  const host = clean(process.env.INSTAGRAM_GRAPH_HOST, 80) === 'graph.facebook.com'
    ? 'graph.facebook.com'
    : 'graph.instagram.com';

  if (!token) {
    return reply(response, 503, {
      ok: false,
      configured: false,
      error: 'Koneksi Instagram resmi sedang disiapkan.'
    }, false);
  }

  const endpoint = new URL('https://' + host + '/' + version + '/' + encodeURIComponent(accountId) + '/media');
  endpoint.searchParams.set('fields', 'id,username,caption,media_type,media_product_type,permalink,timestamp');
  endpoint.searchParams.set('limit', '50');
  endpoint.searchParams.set('access_token', token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const upstream = await fetch(endpoint, {
      headers: {'Accept': 'application/json', 'User-Agent': BUILD},
      signal: controller.signal
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload || !Array.isArray(payload.data)) {
      const message = payload && payload.error && payload.error.message;
      throw new Error(clean(message, 180) || 'Instagram API belum dapat dihubungkan.');
    }

    const latest = payload.data.filter(isReel).sort((a, b) => mediaTime(b) - mediaTime(a))[0];
    const reel = reelPayload(latest, username);
    if (!reel) return reply(response, 404, {ok: false, error: 'Belum ada Reel publik yang dapat ditampilkan.'}, true);
    return reply(response, 200, {ok: true, reel, source: 'Instagram API', updatedAt: new Date().toISOString()}, true);
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return reply(response, timedOut ? 504 : 502, {
      ok: false,
      error: timedOut ? 'Koneksi Instagram membutuhkan waktu terlalu lama.' : clean(error && error.message, 220)
    }, false);
  } finally {
    clearTimeout(timer);
  }
}
