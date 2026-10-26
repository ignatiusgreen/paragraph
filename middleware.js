// Password-protects the project archive (/archive, /archive/*, archive.html, archive-*.html)
// with a sign-in page styled like the site. The password is NOT stored here:
// set ARCHIVE_PASSWORD in Vercel → Settings → Environments → Production → Environment Variables.
export const config = { matcher: ['/archive(.*)'] };

const COOKIE = 'pg_archive';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

async function tokenFor(password) {
  const data = new TextEncoder().encode('paragraph-archive:' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const all = request.headers.get('cookie') || '';
  const match = all.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

export default async function middleware(request) {
  const password = process.env.ARCHIVE_PASSWORD;
  if (!password) {
    return new Response('The archive is locked until a password is set.', { status: 503 });
  }
  const token = await tokenFor(password);
  if (readCookie(request, COOKIE) === token) return; // already signed in: show the page

  const url = new URL(request.url);
  if (request.method === 'POST') {
    let given = '';
    try { given = String((await request.formData()).get('password') || ''); } catch (e) {}
    if (given === password) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname + url.search,
          'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=${THIRTY_DAYS}; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return signInPage(true, 401);
  }
  return signInPage(false, 401);
}

function signInPage(wrong, status) {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Archive — Paragraph</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Chivo:wght@300;400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;1,8..60,300&display=swap" rel="stylesheet">
<style>
  :root{--bg:#000;--fg:#f4f1ea;--muted:#8d8a83;--accent:#a99a6b;--line:#3a3833;--error:#d98c7a}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{background:var(--bg);color:var(--fg);font-family:"Chivo",system-ui,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
  header{display:flex;justify-content:space-between;align-items:center;padding:28px clamp(20px,4vw,56px)}
  header a{color:var(--fg);text-decoration:none}
  .mark{font-family:"Source Serif 4",serif;font-size:30px;line-height:1}
  nav{display:flex;gap:clamp(18px,3vw,40px)}
  nav a{font-size:11px;letter-spacing:.28em;text-transform:uppercase;opacity:.85}
  nav a:hover{opacity:1}
  main{flex:1;display:flex;align-items:center;justify-content:center;padding:24px 20px 80px}
  .card{width:100%;max-width:440px;text-align:center}
  .rule{width:64px;height:2px;margin:0 auto 34px;background:linear-gradient(90deg,#3f8f8f,#a99a6b,#c4523d,#3f6fa8)}
  .label{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--accent)}
  h1{font-family:"Source Serif 4",serif;font-weight:300;font-size:clamp(26px,3.4vw,34px);line-height:1.3;margin:18px 0 40px}
  h1 em{font-style:italic}
  label{position:absolute;left:-9999px}
  input{width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--fg);font:inherit;font-size:18px;letter-spacing:.06em;text-align:center;padding:12px 4px;outline:none;transition:border-color .2s}
  input:focus{border-bottom-color:var(--accent)}
  button{margin-top:34px;background:transparent;color:var(--fg);border:1px solid var(--fg);font:inherit;font-size:11px;letter-spacing:.3em;text-transform:uppercase;padding:15px 38px;cursor:pointer;transition:background .2s,color .2s}
  button:hover,button:focus-visible{background:var(--fg);color:#000}
  .error{color:var(--error);font-size:13px;letter-spacing:.04em;margin-top:16px;min-height:18px}
  .back{display:inline-block;margin-top:44px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);text-decoration:none}
  .back:hover{color:var(--fg)}
</style></head>
<body>
<header>
  <a class="mark" href="/" aria-label="Paragraph home">¶</a>
  <nav><a href="/entertainment">Film &amp; TV</a><a href="/brand">Branded</a><a href="/about">About</a></nav>
</header>
<main>
  <form class="card" method="post">
    <div class="rule" aria-hidden="true"></div>
    <div class="label">Archive</div>
    <h1>This collection is <em>private.</em><br>Enter the password to continue.</h1>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" placeholder="Password" autocomplete="current-password" autofocus required>
    <div class="error" role="alert">${wrong ? 'That password isn’t right. Please try again.' : ''}</div>
    <button type="submit">Enter</button>
    <div><a class="back" href="/">← Back to Paragraph</a></div>
  </form>
</main>
</body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
