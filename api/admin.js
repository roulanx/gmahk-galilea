const DEFAULT_ADMIN_URL = '';

export default function handler(request, response) {
  try {
    const target = new URL(String(process.env.GALILEA_APPS_SCRIPT_ADMIN_URL || DEFAULT_ADMIN_URL));
    if (target.protocol !== 'https:' || target.hostname !== 'script.google.com' || !/\/exec$/.test(target.pathname)) {
      throw new Error('URL backend admin belum dikonfigurasi.');
    }
    target.searchParams.set('page', 'admin');
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    return response.redirect(307, target.toString());
  } catch (error) {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.status(503).send('<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin belum tersambung</title><style>body{display:grid;min-height:100vh;margin:0;place-items:center;padding:24px;color:#172019;background:#f2f5ef;font:16px/1.6 system-ui}.box{max-width:620px;padding:34px;border:1px solid #d7dfd5;border-radius:24px;background:#fff;box-shadow:0 22px 70px rgba(26,47,32,.12)}h1{font-size:clamp(32px,7vw,58px);line-height:1;margin:0 0 18px}</style><main class="box"><h1>Portal admin belum tersambung.</h1><p>Tambahkan environment variable <strong>GALILEA_APPS_SCRIPT_ADMIN_URL</strong> di Vercel, lalu lakukan redeploy.</p></main></html>');
  }
}
