const DEFAULT_ADMIN_URL =
  'https://script.google.com/macros/s/AKfycbxOkCVxWcipB8IY6Y9ToTuWfJ-XQAM5VBJLx33qeuuUU8jmaVJjCitgimo50Mq15n_68Q/exec';

function resolveAdminUrl() {
  const raw = process.env.GALILEA_APPS_SCRIPT_ADMIN_URL || DEFAULT_ADMIN_URL;
  const target = new URL(String(raw || ''));
  const validHost = target.protocol === 'https:' && target.hostname === 'script.google.com';
  const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(target.pathname);
  if (!validHost || !validPath) throw new Error('URL backend admin belum dikonfigurasi.');
  target.searchParams.set('page', 'admin');
  return target;
}

function page({ready, openPath = ''}) {
  const title = ready ? 'Masuk ke Portal Sekretariat' : 'Portal admin belum tersambung';
  const description = ready
    ? 'Gunakan akun Google yang terdaftar sebagai pengelola. Data jemaat, persetujuan warta, dan jadwal ibadah dilindungi oleh autentikasi Google serta verifikasi peran.'
    : 'Alamat deployment Apps Script untuk admin belum tersedia pada deployment Vercel ini.';
  const action = ready
    ? `<div class="actions">
        <a class="button primary" href="${openPath}">Buka Portal Admin <span>→</span></a>
        <a class="button secondary" href="${openPath}" target="_blank" rel="noopener">Buka di Tab Baru ↗</a>
      </div>`
    : '<p class="notice">Tambahkan <strong>GALILEA_APPS_SCRIPT_ADMIN_URL</strong> di Vercel, lalu redeploy.</p>';
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${title} · GMAHK Galilea</title>
<style>
:root{--bg:#eef2ea;--surface:rgba(253,254,251,.92);--text:#132018;--muted:#4f6055;--line:rgba(25,65,39,.14);--brand:#17472c;--brand-soft:#dceadc;--gold:#aa8447;--shadow:0 30px 90px rgba(17,52,30,.15)}
@media(prefers-color-scheme:dark){:root{--bg:#06120b;--surface:rgba(12,28,18,.92);--text:#f2f7ef;--muted:#b3c3b5;--line:rgba(209,232,205,.15);--brand:#a8c99f;--brand-soft:#173623;--gold:#ddbe78;--shadow:0 34px 100px rgba(0,0,0,.45)}}
*{box-sizing:border-box}html,body{min-height:100%;margin:0}
body{display:grid;place-items:center;padding:clamp(18px,5vw,60px);color:var(--text);background:radial-gradient(circle at 82% 14%,color-mix(in srgb,var(--gold) 18%,transparent),transparent 28rem),radial-gradient(circle at 8% 90%,color-mix(in srgb,var(--brand) 16%,transparent),transparent 34rem),var(--bg);font:16px/1.65 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.gate{position:relative;width:min(100%,880px);overflow:hidden;padding:clamp(32px,6vw,72px);border:1px solid var(--line);border-radius:clamp(24px,3.5vw,36px);background:var(--surface);box-shadow:var(--shadow);backdrop-filter:blur(24px)}
.gate:after{position:absolute;right:-75px;bottom:-120px;width:300px;height:420px;border:1px solid color-mix(in srgb,var(--gold) 48%,transparent);border-radius:50%;box-shadow:0 0 0 42px color-mix(in srgb,var(--gold) 5%,transparent),0 0 0 86px color-mix(in srgb,var(--brand) 4%,transparent);content:"";transform:rotate(28deg);pointer-events:none}
.brand{position:relative;z-index:1;display:flex;align-items:center;gap:14px}
.mark{display:grid;width:52px;height:52px;place-items:center;border:1px solid var(--line);border-radius:16px;color:var(--gold);background:color-mix(in srgb,var(--surface) 88%,transparent);font-size:1.5rem}
.brand span{display:grid;line-height:1.2}
.brand small{color:var(--gold);font-size:.65rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}
.brand strong{font-size:.94rem;letter-spacing:.03em}
.eyebrow{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;margin-top:clamp(44px,6vw,72px);color:var(--gold);font-size:.68rem;font-weight:850;letter-spacing:.18em;text-transform:uppercase}
.eyebrow:before{width:20px;height:2px;border-radius:2px;content:"";background:currentColor}
h1{position:relative;z-index:1;max-width:700px;margin:14px 0 16px;font-size:clamp(2.4rem,6.5vw,4.8rem);line-height:.92;letter-spacing:-.05em}
p{position:relative;z-index:1;max-width:660px;margin:0;color:var(--muted);font-size:1.02rem}
.security{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 32px}
.security span{padding:7px 12px;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:color-mix(in srgb,var(--surface) 84%,transparent);font-size:.73rem;font-weight:750}
.actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.button{display:inline-flex;min-height:52px;align-items:center;justify-content:center;gap:14px;padding:0 24px;border-radius:999px;font-weight:800;font-size:.9rem;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease}
.button.primary{color:#fff;background:#17472c;box-shadow:0 14px 34px rgba(17,67,38,.24)}
@media(prefers-color-scheme:dark){.button.primary{color:#07140b;background:#a8c99f}}
.button.secondary{color:var(--text);border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 90%,transparent)}
.button:hover{transform:translateY(-2px)}
.button span{font-size:1.25rem}
.back{position:relative;z-index:1;display:inline-block;margin-top:20px;color:var(--muted);font-size:.82rem;font-weight:700;text-decoration:none}
.back:hover{color:var(--text);text-decoration:underline}
.notice{padding:18px;border:1px solid color-mix(in srgb,#c34f55 35%,var(--line));border-radius:16px;color:var(--text);background:color-mix(in srgb,#c34f55 8%,var(--surface))}
@media(max-width:560px){.gate{padding:28px 20px}.actions{flex-direction:column}.button{width:100%}.back{display:block;text-align:center}}
</style></head><body><main class="gate"><div class="brand"><span class="mark" aria-hidden="true">✦</span><span><small>Website Resmi</small><strong>GMAHK GALILEA BALIKPAPAN</strong></span></div><span class="eyebrow">RUANG KERJA PENGELOLA</span><h1>${title}</h1><p>${description}</p><div class="security"><span>Google Authentication</span><span>Role-Based Permissions</span><span>Audit Logging</span><span>Multi-Device Ready</span></div>${action}<a class="back" href="/">← Kembali ke website utama</a></main></body></html>`;
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
    return response.status(200).send(page({ready: true, openPath: '/admin?open=1'}));
  } catch (error) {
    console.error('[api/admin] configuration error', {message: String(error && error.message || error)});
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(503).send(page({ready: false}));
  }
}

