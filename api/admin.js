const DEFAULT_ADMIN_URL = '';

function resolveAdminUrl() {
  const target = new URL(String(process.env.GALILEA_APPS_SCRIPT_ADMIN_URL || DEFAULT_ADMIN_URL));
  const validHost = target.protocol === 'https:' && target.hostname === 'script.google.com';
  const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(target.pathname);
  if (!validHost || !validPath) throw new Error('URL backend admin belum dikonfigurasi.');
  target.searchParams.set('page', 'admin');
  return target;
}

function page({ready, openPath = ''}) {
  const title = ready ? 'Masuk ke Portal Sekretariat' : 'Portal admin belum tersambung';
  const description = ready
    ? 'Gunakan akun Google yang terdaftar sebagai pengelola. Data jemaat dan alur persetujuan tetap dilindungi oleh pemeriksaan akun serta peran.'
    : 'Alamat deployment Apps Script untuk admin belum tersedia pada deployment Vercel ini.';
  const action = ready
    ? `<a class="button" href="${openPath}">Buka Portal Admin <span>→</span></a>`
    : '<p class="notice">Tambahkan <strong>GALILEA_APPS_SCRIPT_ADMIN_URL</strong> di Vercel, lalu redeploy.</p>';
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${title} · GMAHK Galilea</title>
<style>
:root{--bg:#edf3e9;--surface:rgba(252,253,249,.88);--text:#14251a;--muted:#5b6b60;--line:rgba(31,80,48,.16);--brand:#17472c;--gold:#c7a85c;--shadow:0 30px 90px rgba(17,52,30,.16)}
@media(prefers-color-scheme:dark){:root{--bg:#06120b;--surface:rgba(13,31,20,.9);--text:#f2f7ef;--muted:#b6c4b8;--line:rgba(211,232,207,.16);--brand:#b9d4b0;--gold:#e1c778;--shadow:0 34px 100px rgba(0,0,0,.42)}}
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{display:grid;place-items:center;padding:clamp(18px,5vw,60px);color:var(--text);background:radial-gradient(circle at 82% 14%,color-mix(in srgb,var(--gold) 18%,transparent),transparent 28rem),radial-gradient(circle at 8% 90%,color-mix(in srgb,var(--brand) 16%,transparent),transparent 34rem),var(--bg);font:16px/1.65 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gate{position:relative;width:min(100%,860px);overflow:hidden;padding:clamp(30px,7vw,76px);border:1px solid var(--line);border-radius:clamp(24px,4vw,38px);background:var(--surface);box-shadow:var(--shadow);backdrop-filter:blur(22px)}.gate:after{position:absolute;right:-75px;bottom:-120px;width:300px;height:420px;border:1px solid color-mix(in srgb,var(--gold) 48%,transparent);border-radius:50%;box-shadow:0 0 0 42px color-mix(in srgb,var(--gold) 5%,transparent),0 0 0 86px color-mix(in srgb,var(--brand) 4%,transparent);content:"";transform:rotate(28deg);pointer-events:none}.brand{position:relative;z-index:1;display:flex;align-items:center;gap:14px}.mark{display:grid;width:54px;height:54px;place-items:center;border:1px solid var(--line);border-radius:17px;color:var(--gold);background:color-mix(in srgb,var(--surface) 88%,transparent);font-size:1.55rem}.brand span{display:grid;line-height:1.2}.brand small{color:var(--gold);font-size:.65rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}.brand strong{font-size:.92rem;letter-spacing:.035em}.eyebrow{position:relative;z-index:1;display:block;margin-top:clamp(54px,8vw,92px);color:var(--gold);font-size:.68rem;font-weight:850;letter-spacing:.2em;text-transform:uppercase}h1{position:relative;z-index:1;max-width:690px;margin:14px 0 18px;font-size:clamp(2.7rem,8vw,6.5rem);line-height:.88;letter-spacing:-.06em}p{position:relative;z-index:1;max-width:650px;margin:0;color:var(--muted)}.security{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px;margin:28px 0}.security span{padding:8px 11px;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:color-mix(in srgb,var(--surface) 84%,transparent);font-size:.72rem;font-weight:750}.button{position:relative;z-index:1;display:inline-flex;min-height:54px;align-items:center;justify-content:space-between;gap:28px;padding:0 22px;border-radius:999px;color:#fff;background:#17472c;font-weight:820;text-decoration:none;box-shadow:0 15px 38px rgba(17,67,38,.24)}.button:hover{transform:translateY(-2px)}.button span{font-size:1.35rem}.back{position:relative;z-index:1;display:inline-block;margin-left:16px;color:var(--muted);font-size:.8rem;font-weight:750;text-decoration:none}.notice{padding:18px;border:1px solid color-mix(in srgb,#c34f55 35%,var(--line));border-radius:16px;color:var(--text);background:color-mix(in srgb,#c34f55 8%,var(--surface))}@media(max-width:560px){.gate{padding:30px 24px}.gate:after{opacity:.55}.button{width:100%}.back{display:block;margin:18px 0 0;text-align:center}}
</style></head><body><main class="gate"><div class="brand"><span class="mark" aria-hidden="true">✦</span><span><small>Website Resmi</small><strong>GMAHK GALILEA BALIKPAPAN</strong></span></div><span class="eyebrow">RUANG KERJA PENGELOLA</span><h1>${title}</h1><p>${description}</p><div class="security"><span>Login Google</span><span>Akses berbasis peran</span><span>Jejak aktivitas</span></div>${action}<a class="back" href="/">Kembali ke website</a></main></body></html>`;
}

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const target = resolveAdminUrl();
    if (String(request.query && request.query.open || '') === '1') {
      console.info('[api/admin] forwarding authenticated admin entry');
      return response.redirect(307, target.toString());
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(200).send(page({ready:true, openPath:'/admin?open=1'}));
  } catch (error) {
    console.error('[api/admin] configuration error', {message:String(error && error.message || error)});
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(503).send(page({ready:false}));
  }
}

