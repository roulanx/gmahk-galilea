import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
assert.match(index, /GALILEA-CREATIVE-CINEMA-17-1-0/);
assert.match(index, /fetch\('\/api\/gas'/);
assert.match(index, /fetch\('\/api\/quarterly-pdf'/);
assert.match(index, /property="og:image" content="https:\/\/gmahk-galilea\.vercel\.app\/og-galilea-creative-v17\.png/);
assert.doesNotMatch(index, /google\.script\.run/);
assert.doesNotMatch(index, /<\?(?:=|!=|\s)/);
assert.match(index, /data-open-activity/);
assert.match(index, /activity-story-gallery/);
assert.match(index, /devotional-cinema/);
assert.match(index, /v1700-bootstrap/);
assert.match(index, /cacheSet\('v1700-bootstrap',fresh,60000\)/);
assert.match(index, /opening-sanctuary/);
assert.match(index, /Jelajahi ruang digital Galilea/);
assert.match(index, /htmlToShareText/);
assert.match(index, /const fullReading = htmlToShareText\(item\.contentHtml\)/);

const scriptBlocks = [...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.ok(scriptBlocks.length > 0, 'Tidak ditemukan blok JavaScript pada index.html.');
for (const [position, source] of scriptBlocks.entries()) {
  new vm.Script(source, {filename: `index-inline-${position + 1}.js`});
}

const proxy = read('api/gas.js');
const quarterlyPdf = read('api/quarterly-pdf.js');
const bridge = read('apps-script-backend/VercelApi.gs');
const website = read('apps-script-backend/Website.gs');
const admin = read('apps-script-backend/Admin.gs');
const adminHtml = read('apps-script-backend/Admins.html');
new vm.Script(bridge, {filename: 'VercelApi.gs'});
new vm.Script(website, {filename: 'Website.gs'});
new vm.Script(admin, {filename: 'Admin.gs'});
assert.match(website, /daily-reading-v16/);
assert.match(website, /const day = exactDay;/);
assert.doesNotMatch(website, /const day = exactDay \|\| pastDays/);
assert.match(website, /gwActivityPhotos_/);
assert.match(admin, /Foto Kegiatan/);
assert.match(adminHtml, /multiple accept="image\/png/);
assert.match(adminHtml, /GALILEA-ADMIN-CINEMATIC-16-0-0/);
const adminScripts = [...adminHtml.replace(/<\?!=\s*JSON\.stringify\(appUrl\s*\|\|\s*''\)\s*\?>/g, "''").matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.ok(adminScripts.length > 0, 'Tidak ditemukan blok JavaScript pada Admins.html.');
for (const [position, source] of adminScripts.entries()) {
  new vm.Script(source, {filename: `admin-inline-${position + 1}.js`});
}
assert.match(website, /CACHE_SECONDS:\s*60/);
assert.doesNotMatch(quarterlyPdf, /WEBSITE GALILEA\) Tj|Diunduh melalui Website Gereja Galilea/);
assert.match(quarterlyPdf, /JADWAL PELAYANAN JEMAAT/);
const calls = [...index.matchAll(/server\('([^']+)'/g)].map(match => match[1]);
assert.ok(calls.length >= 20, 'Jumlah integrasi viewer lebih sedikit dari yang diharapkan.');
for (const method of new Set(calls)) {
  assert.ok(proxy.includes(`'${method}'`), `Method ${method} belum diizinkan oleh proxy Vercel.`);
  assert.ok(bridge.includes(`${method}: function`), `Method ${method} belum tersedia pada bridge Apps Script.`);
}

const vercel = JSON.parse(read('vercel.json'));
assert.equal(vercel.rewrites[0].source, '/admin');
assert.equal(vercel.rewrites[0].destination, '/api/admin');
assert.deepEqual(vercel.regions, ['sin1']);
assert.ok(vercel.headers.some(item => item.source === '/og-galilea-creative-v17.png'));

const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.start_url, '/');
assert.equal(manifest.lang, 'id');

const envExample = read('.env.example');
for (const key of ['GALILEA_APPS_SCRIPT_API_URL', 'GALILEA_APPS_SCRIPT_ADMIN_URL', 'GALILEA_API_SECRET']) {
  assert.match(envExample, new RegExp(`^${key}=`, 'm'));
}

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
    redirect(code, value) { this.statusCode = code; this.body = value; return this; }
  };
}

const {default: gasHandler} = await import('../api/gas.js');
let response = mockResponse();
await gasHandler({method: 'GET', headers: {}}, response);
assert.equal(response.statusCode, 200);
assert.equal(response.body.ok, true);

process.env.GALILEA_APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec';
process.env.GALILEA_API_SECRET = '12345678901234567890123456789012';
response = mockResponse();
await gasHandler({method: 'POST', headers: {}, body: {method: 'fungsiBerbahaya', args: []}}, response);
assert.equal(response.statusCode, 403);

const nativeFetch = globalThis.fetch;
let forwarded = null;
globalThis.fetch = async (url, options) => {
  forwarded = {url, body: JSON.parse(options.body)};
  return {
    ok: true,
    status: 200,
    async text() { return JSON.stringify({ok: true, data: {title: 'Galilea'}}); }
  };
};
response = mockResponse();
await gasHandler({method: 'POST', headers: {}, body: {method: 'getWebsiteData', args: []}}, response);
globalThis.fetch = nativeFetch;
assert.equal(response.statusCode, 200);
assert.equal(response.body.data.title, 'Galilea');
assert.equal(forwarded.body.method, 'getWebsiteData');
assert.equal(forwarded.body.secret, process.env.GALILEA_API_SECRET);

const {default: adminHandler} = await import('../api/admin.js');
process.env.GALILEA_APPS_SCRIPT_ADMIN_URL = 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec';
response = mockResponse();
adminHandler({method: 'GET'}, response);
assert.equal(response.statusCode, 307);
assert.match(response.body, /page=admin/);

const {default: quarterlyHandler} = await import('../api/quarterly-pdf.js');
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async text() {
    return JSON.stringify({ok: true, data: {
      periodLabel: 'TRIWULAN III · JULI - SEPTEMBER 2026',
      updatedAt: 'Senin, 24 Agustus 2026 · 14.15 WITA',
      sections: [{title: 'Kebaktian Khotbah', records: [{
        dateLabel: 'Sabat, 29 Agustus 2026', time: '09:00',
        fields: [{label: 'Pengkhotbah', value: 'Bpk. G. Sinurat'}, {label: 'Lagu Pujian', value: 'UKSS Eklesia'}]
      }]}]
    }});
  }
});
response = mockResponse();
await quarterlyHandler({method: 'GET'}, response);
globalThis.fetch = nativeFetch;
assert.equal(response.statusCode, 200);
assert.ok(Buffer.isBuffer(response.body));
assert.equal(response.body.subarray(0, 4).toString(), '%PDF');
assert.match(response.headers['Content-Disposition'], /Jadwal-Ibadah-Galilea/);
if (process.env.WRITE_SAMPLE_PDF === '1') fs.writeFileSync('/tmp/galilea-quarterly-sample.pdf', response.body);

console.log(`OK · ${new Set(calls).size} fungsi viewer terhubung ke proxy dan bridge Apps Script.`);
console.log('OK · index.html bebas template Apps Script dan JavaScript berhasil diparse.');
console.log('OK · konfigurasi Vercel, admin route, manifest, dan environment variables lengkap.');
console.log('OK · proxy menolak fungsi di luar allowlist dan /admin diarahkan ke deployment terpisah.');
console.log('OK · PDF triwulan spreadsheet tanpa watermark dan metadata Open Graph WhatsApp tersedia.');
