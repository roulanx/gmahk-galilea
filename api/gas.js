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

const BUILD = 'GALILEA-VERCEL-BRIDGE-17.3.0';
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


const DEVOTIONAL_API = 'https://sabbath-school.adventech.io/api/v2';
const DEVOTIONAL_SITE = 'https://sabbath-school.adventech.io';

function witaDateKey(value) {
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function dateNumber(value) {
  const raw = String(value || '').trim();
  let match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return Number(match[3] + match[2].padStart(2, '0') + match[1].padStart(2, '0'));
  match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? Number(match[1] + match[2].padStart(2, '0') + match[3].padStart(2, '0')) : 0;
}

function cleanText(value) {
  return String(value == null ? '' : value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#038;/gi, '&')
    .replace(/&quot;|&#8220;|&#8221;/gi, '"')
    .replace(/&#039;|&apos;|&#8216;|&#8217;/gi, "'")
    .replace(/&hellip;|&#8230;/gi, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, limit) {
  const text = cleanText(value);
  return text.length > limit ? text.slice(0, limit - 1).trimEnd() + '…' : text;
}

function sanitizeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:style|id|class)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript:|data:text\/html)[\s\S]*?\2/gi, '')
    .trim();
}

function renderBible(value) {
  if (typeof value === 'string') return sanitizeHtml(value);
  const seen = new Set();
  const parts = [];
  for (const group of Array.isArray(value) ? value : []) {
    const verses = group && group.verses && typeof group.verses === 'object' ? group.verses : {};
    for (const html of Object.values(verses)) {
      const plain = cleanText(html);
      if (!plain || seen.has(plain) || parts.length >= 8) continue;
      seen.add(plain);
      parts.push(sanitizeHtml(html));
    }
  }
  return parts.join('<hr>');
}

function longDateLabel(dateKey) {
  const date = new Date(dateKey + 'T12:00:00+08:00');
  const label = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function fetchOfficialJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const result = await fetch(url, {
      headers: {'Accept': 'application/json', 'User-Agent': BUILD},
      redirect: 'follow',
      signal: controller.signal
    });
    if (!result.ok) throw new Error('HTTP ' + result.status);
    return await result.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getOfficialDailyDevotional(dateValue) {
  const dateKey = witaDateKey(dateValue);
  const [yearText, monthText] = dateKey.split('-');
  const year = Number(yearText);
  const quarter = Math.floor((Number(monthText) - 1) / 3) + 1;
  const periodId = year + '-' + String(quarter).padStart(2, '0');
  const quarterlyPayload = await fetchOfficialJson(DEVOTIONAL_API + '/in/quarterlies/' + periodId + '/index.json');
  const quarterly = quarterlyPayload.quarterly || quarterlyPayload || {};
  const lessons = Array.isArray(quarterly.lessons) ? quarterly.lessons : (Array.isArray(quarterlyPayload.lessons) ? quarterlyPayload.lessons : []);
  const target = dateNumber(dateKey);
  const lesson = lessons.find(item => {
    const start = dateNumber(item.start_date || item.startDate);
    const end = dateNumber(item.end_date || item.endDate || item.start_date || item.startDate);
    return start && start <= target && end >= target;
  });
  if (!lesson) throw new Error('Pelajaran Advent untuk tanggal WITA hari ini belum ditemukan.');

  const lessonId = String(lesson.id || lesson.index || lesson.number || '').replace(/\D/g, '').padStart(2, '0');
  if (!lessonId || lessonId === '00') throw new Error('Nomor pelajaran harian tidak valid.');
  const base = DEVOTIONAL_API + '/in/quarterlies/' + periodId + '/lessons/' + lessonId;
  const detailPayload = await fetchOfficialJson(base + '/index.json');
  const lessonDetail = detailPayload.lesson && typeof detailPayload.lesson === 'object' ? detailPayload.lesson : detailPayload;
  const days = Array.isArray(detailPayload.days) ? detailPayload.days : (Array.isArray(lessonDetail.days) ? lessonDetail.days : []);

  let day = days.find(item => dateNumber(item.date) === target) || null;
  let reading = null;
  if (day) {
    const dayId = String(day.id || day.index || '').replace(/\D/g, '').padStart(2, '0');
    if (dayId && dayId !== '00') {
      const payload = await fetchOfficialJson(base + '/days/' + dayId + '/read/index.json');
      reading = payload && payload.read ? payload.read : payload;
    }
  } else {
    const candidates = await Promise.all(days.map(async (item, index) => {
      const dayId = String(item.id || item.index || index + 1).replace(/\D/g, '').padStart(2, '0');
      try {
        const payload = await fetchOfficialJson(base + '/days/' + dayId + '/read/index.json');
        const value = payload && payload.read ? payload.read : payload;
        return {day: item, dayId, reading: value};
      } catch (_) {
        return null;
      }
    }));
    const exact = candidates.find(item => item && dateNumber(item.reading && item.reading.date || item.day && item.day.date) === target);
    if (exact) {
      day = Object.assign({}, exact.day, {id: exact.dayId});
      reading = exact.reading;
    }
  }

  reading = reading || day || {};
  const readingDate = dateNumber(reading.date || day && day.date);
  if (!day || readingDate !== target) throw new Error('Bacaan Advent yang tersedia belum cocok dengan tanggal WITA hari ini.');
  const contentHtml = sanitizeHtml(reading.content || day.content || '');
  const bibleHtml = renderBible(reading.bible || day.bible || '');
  if (!contentHtml) throw new Error('Isi bacaan Advent hari ini masih kosong.');

  const dayId = String(day.id || day.index || '').replace(/\D/g, '').padStart(2, '0');
  const title = cleanText(reading.title || day.title || lessonDetail.title || lesson.title || 'Renungan Pagi');
  const scripture = truncate(bibleHtml, 190);
  return {
    id: 'adventech-' + periodId + '-' + lessonId + '-' + dayId,
    format: 'text',
    requestedDate: dateKey,
    contentDate: dateKey,
    title,
    todayLabel: longDateLabel(dateKey),
    contentDateLabel: longDateLabel(dateKey),
    scripture,
    summary: truncate(contentHtml, 420),
    contentHtml: (bibleHtml ? '<div class="devotional-scripture">' + bibleHtml + '</div>' : '') + contentHtml,
    videoId: '', thumbnailUrl: '', embedUrl: '', watchUrl: '',
    isArchive: false,
    isPending: false,
    source: 'Adventech Sabbath School · Bahasa Indonesia',
    sourceUrl: DEVOTIONAL_SITE,
    lessonTitle: cleanText(lessonDetail.title || lesson.title || ''),
    lessonNumber: Number(String(lessonDetail.id || lessonDetail.number || lessonId).replace(/\D/g, '')) || Number(lessonId),
    attribution: 'Materi Advent harian · Dibagikan melalui Website Gereja Galilea'
  };
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
    const rawLength = Number(request.headers['content-length'] || 0);
    if (rawLength > MAX_REQUEST_BYTES) return reply(response, 413, {ok: false, error: 'Permintaan terlalu besar.'});

    const body = parseBody(request);
    const method = String(body.method || '');
    const args = Array.isArray(body.args) ? body.args : [];
    if (!PUBLIC_METHODS.has(method)) return reply(response, 403, {ok: false, error: 'Fungsi tidak diizinkan pada viewer publik.'});
    if (args.length > 20 || JSON.stringify(args).length > MAX_REQUEST_BYTES) {
      return reply(response, 413, {ok: false, error: 'Parameter permintaan terlalu besar.'});
    }

    if (method === 'getDailyDevotional') {
      try {
        const devotional = await getOfficialDailyDevotional(args[0]);
        response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
        return reply(response, 200, {ok: true, data: devotional, meta: {source: 'adventech-direct', build: BUILD}});
      } catch (devotionalError) {
        return reply(response, 502, {
          ok: false,
          error: 'Renungan Pagi teks hari ini belum dapat dimuat dari sumber resmi. ' +
            String(devotionalError && devotionalError.message ? devotionalError.message : devotionalError || '')
        });
      }
    }

    const configuredUrl = backendUrl(process.env.GALILEA_APPS_SCRIPT_API_URL || DEFAULT_API_URL);
    const secret = String(process.env.GALILEA_API_SECRET || '');
    if (secret.length < 32) throw new Error('GALILEA_API_SECRET belum dipasang atau terlalu pendek.');

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
