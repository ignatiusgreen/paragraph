// Private project archive.
// - The full archive (/archive, archive.html) needs the password.
// - Single projects or groups of projects can be shared with signed links, made at /archive/links.
// The password is NOT stored here: set ARCHIVE_PASSWORD in Vercel (Settings → Environments → Production).
// Changing the password signs everyone out AND turns off every shared link made with the old one.
export const config = { matcher: ['/archive(.*)'] };

const FULL = 'pg_archive';      // cookie: signed in with the password
const GRANT = 'pg_share';       // cookie: projects opened from shared links
const THIRTY_DAYS = 60 * 60 * 24 * 30;

const PROJECTS = [
 {
  "slug": "panini",
  "title": "Panini",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1723850457394-9OQNTXQARAWITKOGUF8B/Kobe+1.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756499538?app_id=122963&muted=0&autopause=0",
    "title": "Panini - Kobe"
   },
   {
    "src": "https://player.vimeo.com/video/756499635?h=b54f6d1dc0&app_id=122963&muted=0&autopause=0",
    "title": "Panini - KD"
   }
  ]
 },
 {
  "slug": "google",
  "title": "Google",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731449518521-LQFML01I9H4O8CRVXVL6/Google_Burtzorg.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756471529?h=01c626f63d&app_id=122963&muted=0&autopause=0",
    "title": "Google - Buurtzorg"
   }
  ]
 },
 {
  "slug": "hancock",
  "title": "Hancock Health",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731518186643-F0WMPBUPV18EFW711YX6/Hancock+Health+-+Mayo+Clinic+1.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/998835219?h=86baa33c2c&app_id=122963&muted=0&autopause=0",
    "title": "Hancock Health - Mayo Clinic"
   },
   {
    "src": "https://player.vimeo.com/video/998756130?h=214f1c7288&app_id=122963&muted=0&autopause=0",
    "title": "Hancock Health - Network"
   }
  ]
 },
 {
  "slug": "paypal",
  "title": "Paypal",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1728594648724-BZ8AVDRHTHJ9GDBQGJY3/PayPal+Daymond+John.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756503866?app_id=122963&muted=0&autopause=0",
    "title": "PayPal - Daymond Johnson"
   }
  ]
 },
 {
  "slug": "royal-caribbean",
  "title": "Royal Caribbean",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1728593843345-OS13MYXWD6RK1JOPCPKH/Royal+4+B+.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/998808760?h=93fde589af&app_id=122963&muted=0&autopause=0",
    "title": "Royal Caribbean - Safety Film Trailer"
   }
  ]
 },
 {
  "slug": "power-bar",
  "title": "Power Bar",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731518741449-HR4AOSJVTLVZLM0YD2R3/Powerbar.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/41106764?app_id=122963&muted=0&autopause=0",
    "title": "PowerBar Manifesto"
   }
  ]
 },
 {
  "slug": "brightcove",
  "title": "Brightcove",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731519259125-J31M6RAWP8V9WUQ4NTAI/Brightcove.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756450173?app_id=122963&muted=0&autopause=0",
    "title": "Brightcove - Play"
   }
  ]
 },
 {
  "slug": "aarp",
  "title": "AARP",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731519368713-R8T621XTJPQVQGQSA338/AARP+Ace+Your+Retirement+1.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756437973?app_id=122963&muted=0&autopause=0",
    "title": "AARP - Ace Your Retirement - Travel"
   },
   {
    "src": "https://player.vimeo.com/video/756437888?app_id=122963&muted=0&autopause=0",
    "title": "AARP - Ace Your Retirement - House"
   }
  ]
 },
 {
  "slug": "banfield",
  "title": "Banfield",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731519940357-VZZE1AHZBUUOP313J1FO/Banfield_6.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803256201?h=9c8f55e851&app_id=122963&muted=0&autopause=0",
    "title": "Banfield \"Love at First Sight\""
   },
   {
    "src": "https://player.vimeo.com/video/803261256?h=8130968feb&app_id=122963&muted=0&autopause=0",
    "title": "Banfield \"Therapy\""
   },
   {
    "src": "https://player.vimeo.com/video/756435121?app_id=122963&muted=0&autopause=0",
    "title": "Banfield - \"Late Adopters\""
   }
  ]
 },
 {
  "slug": "goal-zero",
  "title": "Goal Zero",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731520862814-7XY60K7EPGY94HZVUEXZ/Goal+Zero.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/72383349?app_id=122963&muted=0&autopause=0",
    "title": "Goal Zero \"Freedom\" with Alex Honnold"
   }
  ]
 },
 {
  "slug": "trifexis",
  "title": "Trifexis",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731521441955-7HBS1DBVFEJPDHW4OEO8/Trifexis+7.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756515469?app_id=122963&muted=0&autopause=0",
    "title": "Trifexis - Going Out"
   },
   {
    "src": "https://player.vimeo.com/video/756515017?h=ee1c36e671&app_id=122963&muted=0&autopause=0",
    "title": "Trifexis - Around the House"
   }
  ]
 },
 {
  "slug": "stanton",
  "title": "Stanton Optical",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731522252913-LGNTTQJL4M4Q9499TLU1/Stanton+Optical+Book+Club.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756514677?app_id=122963&muted=0&autopause=0",
    "title": "Stanton Optical - Book Club"
   },
   {
    "src": "https://player.vimeo.com/video/149922867?app_id=122963&muted=0&autopause=0",
    "title": "Stanton Optical - Date Night"
   }
  ]
 },
 {
  "slug": "uber",
  "title": "Uber - Grammys",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731523217769-MEOB92HPD2SV7SUSM1BD/UBER_Grammys_1.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756516594?h=c37543148d&app_id=122963&muted=0&autopause=0",
    "title": "Uber - Khalid's Road to the Grammys"
   },
   {
    "src": "https://player.vimeo.com/video/756516488?h=3dd7be8f80&app_id=122963&muted=0&autopause=0",
    "title": "Uber - Julia Michaels' Road to the Grammys"
   }
  ]
 },
 {
  "slug": "airtable",
  "title": "Airtable",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731524719619-PPILSDNSAF9JYI1NKKYZ/Airtable+This+Is+How+2b.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/802890453?h=a4996e09a6&app_id=122963&muted=0&autopause=0",
    "title": "AirTable \"Content Powerhouse\""
   },
   {
    "src": "https://player.vimeo.com/video/802890501?h=c695f6e3bd&app_id=122963&muted=0&autopause=0",
    "title": "AirTable \"One Good Chair\""
   },
   {
    "src": "https://player.vimeo.com/video/802890593?app_id=122963&muted=0&autopause=0",
    "title": "AirTable \"The Launch\""
   }
  ]
 },
 {
  "slug": "assassins",
  "title": "Assassin's Creed",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731526389413-2T7E5DKDFKMINQ68Q46F/Assassins+Creed.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/77801760?app_id=122963&muted=0&autopause=0",
    "title": "Assassins Creed III: Fan Video"
   }
  ]
 },
 {
  "slug": "uberville",
  "title": "Uber - Uberville",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731525669329-328NGQ489AB1MA8K5YKI/Uberville+Winter.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756516463?app_id=122963&muted=0&autopause=0",
    "title": "Uber - Uberville-Winter"
   },
   {
    "src": "https://player.vimeo.com/video/756516382?app_id=122963&muted=0&autopause=0",
    "title": "Uber- Uberville"
   }
  ]
 },
 {
  "slug": "toyota",
  "title": "Toyota",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731526703124-U0XXS9L3N2V0TLNVBCYP/Toyota+Kayak.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756515532?app_id=122963&muted=0&autopause=0",
    "title": "Toyota - Kayak"
   },
   {
    "src": "https://player.vimeo.com/video/756515491?app_id=122963&muted=0&autopause=0",
    "title": "Toyota - Keep It Wild"
   }
  ]
 },
 {
  "slug": "redbull",
  "title": "Redbull",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731517275161-9529AJFXXGT2STQFOOCZ/Redbull+-+Leader+in+the+Lane.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803253074?h=49d7ab0f6d&app_id=122963&muted=0&autopause=0",
    "title": "RedBull \"Leader in the Lane\" Teaser"
   }
  ]
 },
 {
  "slug": "ride",
  "title": "Ride",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731526866012-8WFF11RIHOCOQXR1P1GI/Ride+-+Not+a+Phone+Booth.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756513931?app_id=122963&muted=0&autopause=0",
    "title": "Ride - Not A Phone Booth"
   },
   {
    "src": "https://player.vimeo.com/video/756514007?app_id=122963&muted=0&autopause=0",
    "title": "Ride - How to Properly Shut a Door"
   }
  ]
 },
 {
  "slug": "progresso",
  "title": "Progresso",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731527144738-OJ367GD6K7O8Q56QBTEW/Progresso_hometown.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756506134?h=59eff867f3&app_id=122963&muted=0&autopause=0",
    "title": "Progresso - Hometown ep. 05"
   },
   {
    "src": "https://player.vimeo.com/video/756506004?h=954fd44b2d&app_id=122963&muted=0&autopause=0",
    "title": "Progresso - The Clam Catchers - Episode 04"
   }
  ]
 },
 {
  "slug": "nike",
  "title": "Nike",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731532414570-LMW149L165G955A40SN5/Nike+-+Lebron+James+-+Who%27s+Got+Next.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803251278?h=162cc9f173&app_id=122963&muted=0&autopause=0",
    "title": "Nike You Got Next - LEBRON"
   },
   {
    "src": "https://player.vimeo.com/video/755576988?app_id=122963&muted=0&autopause=0",
    "title": "NIKE - Sarah Reinertsen - My Crazy Dream"
   },
   {
    "src": "https://player.vimeo.com/video/756476179?h=18fc8ea137&app_id=122963&muted=0&autopause=0",
    "title": "Nike - Coach Smith"
   },
   {
    "src": "https://player.vimeo.com/video/756476332?h=cfa0f3a75f&app_id=122963&muted=0&autopause=0",
    "title": "Nike - Mamba League"
   },
   {
    "src": "https://player.vimeo.com/video/756476489?h=de23ef562e&app_id=122963&muted=0&autopause=0",
    "title": "Nike - Pro Designs"
   }
  ]
 },
 {
  "slug": "fsc",
  "title": "FSC",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731534278404-AJ9THYAMNS4XLQMRCQ9U/FSC+3.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756460066?app_id=122963&muted=0&autopause=0",
    "title": "Forest Stewardship Council - Anthem"
   }
  ]
 },
 {
  "slug": "purina-b",
  "title": "Purina",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731537793047-T3G3F6AQYT017Y3NN0H3/Purina+-+Healthy+Years.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756508623?h=7b056ddbb1&app_id=122963&muted=0&autopause=0",
    "title": "Purina - Healthy Years"
   },
   {
    "src": "https://player.vimeo.com/video/756507833?h=a807228897&app_id=122963&muted=0&autopause=0",
    "title": "Purina - Aging"
   },
   {
    "src": "https://player.vimeo.com/video/756964338?app_id=122963&muted=0&autopause=0",
    "title": "Purina---Petfinder.mov"
   }
  ]
 },
 {
  "slug": "purina",
  "title": "Purina - Better with Pets",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731535031743-RU703HPZ6EHZ6EJ7DGUO/Purina.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/77843261?app_id=122963&muted=0&autopause=0",
    "title": "Purina - Julian & Max (:60)"
   },
   {
    "src": "https://player.vimeo.com/video/81649466?app_id=122963&muted=0&autopause=0",
    "title": "Purina - Stephen, Puppi & Burma"
   }
  ]
 },
 {
  "slug": "purina2",
  "title": "Purina - Pets at Work",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731536233031-I6KWZR8BQWUCLYIY3QEV/Purina+-+Evan+%26+Arthur.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/75517408?app_id=122963&muted=0&autopause=0",
    "title": "Purina - Evan & Arthur"
   }
  ]
 },
 {
  "slug": "purina3",
  "title": "Purina - Dog Chow",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731537036135-GDRSC6OXUYIU7PO5J753/Purina+Dow+Chow.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803252869?h=d358b1cc07&app_id=122963&muted=0&autopause=0",
    "title": "Purina DogChow \"Bubbles\""
   }
  ]
 },
 {
  "slug": "3m",
  "title": "3M",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731537260249-UZIRF0KDYM1C3A42YEU9/3M+Thinsulate+3.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756437594?h=5c21683088&app_id=122963&muted=0&autopause=0",
    "title": "3M - Thinsulate"
   }
  ]
 }
];
const BY_SLUG = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]));

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
async function sign(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
function readCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const cleanList = (s) => [...new Set(String(s || '').split(',').map((x) => x.trim()).filter((x) => BY_SLUG[x]))].sort();

// Which project (if any) does this path show?
function projectFor(pathname) {
  const m = pathname.match(/^\/archive(?:\/|-)([a-z0-9-]+?)(?:\.html)?\/?$/);
  return m && BY_SLUG[m[1]] ? m[1] : null;
}

export default async function middleware(request) {
  const password = process.env.ARCHIVE_PASSWORD;
  if (!password) return new Response('The archive is locked until a password is set.', { status: 503 });

  const url = new URL(request.url);
  const path = url.pathname;
  const fullToken = await sha('paragraph-archive:' + password);
  const isFull = readCookie(request, FULL) === fullToken;

  // Sign out
  if (path === '/archive-logout') {
    return redirect('/archive', [cookie(FULL, '', 0), cookie(GRANT, '', 0)]);
  }

  // Shared link: /archive/share?p=nike,panini&k=SIGNATURE
  if (path === '/archive/share') {
    const slugs = cleanList(url.searchParams.get('p'));
    const k = url.searchParams.get('k') || '';
    const expected = (await sign(password, 'share:' + slugs.join(','))).slice(0, 20);
    if (!slugs.length || k !== expected) return page(messageBody('This link isn’t valid', 'It may have been mistyped or switched off. Please ask Paragraph for a new link.'), 404);
    // Remember these projects for this visitor (added to any they already have)
    const granted = await readGrant(request, password);
    const all = [...new Set([...granted, ...slugs])].sort();
    const grantCookie = cookie(GRANT, all.join('.') + '~' + (await sign(password, 'grant:' + all.join('.'))), THIRTY_DAYS);
    if (slugs.length === 1) return redirect('/archive/' + slugs[0], [grantCookie]);
    return page(collectionBody(slugs), 200, [grantCookie]);
  }

  // Link builder (owner only)
  if (path === '/archive/links') {
    if (!isFull) return signInOr(request, url, password, fullToken);
    const slugs = cleanList(url.searchParams.get('p'));
    let link = '';
    if (slugs.length) {
      const k = (await sign(password, 'share:' + slugs.join(','))).slice(0, 20);
      link = `${url.origin}/archive/share?p=${slugs.join(',')}&k=${k}`;
    }
    return page(builderBody(slugs, link), 200);
  }

  // Signed in with the password: everything is open
  if (isFull) return;

  // A single project page the visitor was given a link to
  const slug = projectFor(path);
  if (slug && (await readGrant(request, password)).includes(slug)) return;

  return signInOr(request, url, password, fullToken);
}

async function readGrant(request, password) {
  const raw = readCookie(request, GRANT);
  if (!raw || !raw.includes('~')) return [];
  const [list, sig] = raw.split('~');
  if (sig !== (await sign(password, 'grant:' + list))) return [];
  return list.split('.').filter((s) => BY_SLUG[s]);
}

async function signInOr(request, url, password, fullToken) {
  if (request.method === 'POST') {
    let given = '';
    try { given = String((await request.formData()).get('password') || ''); } catch (e) {}
    if (given === password) return redirect(url.pathname + url.search, [cookie(FULL, fullToken, THIRTY_DAYS)]);
    return page(signInBody(true), 401);
  }
  return page(signInBody(false), 401);
}

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(null, { status: 303, headers });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(body, status, cookies = []) {
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
  html,body{min-height:100%}
  body{background:var(--bg);color:var(--fg);font-family:"Chivo",system-ui,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;min-height:100vh}
  header{display:flex;justify-content:space-between;align-items:center;padding:19px 4vw}
  header a{color:var(--fg);text-decoration:none}
  .mark{display:block;line-height:0}
  .mark img{height:21px;width:auto;display:block}
  nav{display:flex;gap:clamp(18px,3vw,40px)}
  nav a{font-size:11px;letter-spacing:.28em;text-transform:uppercase;opacity:.85}
  nav a:hover{opacity:1}
  main{flex:1;display:flex;align-items:center;justify-content:center;padding:24px 20px 80px}
  .card{width:100%;max-width:440px;text-align:center}
  .wide{max-width:1180px;text-align:left}
  .rule{width:64px;height:2px;margin:0 auto 34px;background:linear-gradient(90deg,#3f8f8f,#a99a6b,#c4523d,#3f6fa8)}
  .wide .rule{margin-left:0}
  .label{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--accent)}
  h1{font-family:"Source Serif 4",serif;font-weight:300;font-size:clamp(26px,3.4vw,34px);line-height:1.3;margin:18px 0 40px}
  h1 em{font-style:italic}
  p.note{color:var(--muted);line-height:1.6;margin:-20px 0 32px}
  .sr{position:absolute;left:-9999px}
  input[type=password],input[type=text]{width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--fg);font:inherit;font-size:18px;letter-spacing:.06em;text-align:center;padding:12px 44px;outline:none;transition:border-color .2s}
  input:focus{border-bottom-color:var(--accent)}
  .enter{display:inline-block;margin-top:34px;background:transparent;color:var(--fg);border:1px solid var(--fg);font:inherit;font-size:11px;letter-spacing:.3em;text-transform:uppercase;padding:15px 38px;cursor:pointer;text-decoration:none;transition:background .2s,color .2s}
  .enter:hover,.enter:focus-visible{background:var(--fg);color:#000}
  .field{position:relative}
  .eye{position:absolute;right:0;top:50%;transform:translateY(-50%);width:44px;height:44px;display:grid;place-items:center;background:none;border:0;color:var(--muted);cursor:pointer;transition:color .2s}
  .eye:hover,.eye:focus-visible{color:var(--fg);outline:none}
  .eye svg{width:20px;height:20px}
  .eye .off{display:none}.eye[aria-pressed="true"] .on{display:none}.eye[aria-pressed="true"] .off{display:block}
  .error{color:var(--error);font-size:13px;letter-spacing:.04em;margin-top:16px;min-height:18px}
  .back{display:inline-block;margin-top:44px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);text-decoration:none}
  .back:hover{color:var(--fg)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
  .tile{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;background:#111;color:var(--fg);text-decoration:none}
  .tile img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s ease,opacity .3s}
  .tile::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65),rgba(0,0,0,0) 55%)}
  .tile span{position:absolute;left:18px;bottom:14px;z-index:1;font-size:15px;letter-spacing:.12em}
  .tile:hover img{transform:scale(1.03)}
  label.pick{cursor:pointer}
  label.pick input{position:absolute;opacity:0}
  label.pick .tile img{opacity:.45}
  label.pick input:checked + .tile img{opacity:1}
  label.pick input:checked + .tile{outline:2px solid var(--accent);outline-offset:3px}
  label.pick input:focus-visible + .tile{outline:2px solid var(--fg);outline-offset:3px}
  .bar{position:sticky;bottom:0;margin-top:32px;padding:18px 0;background:linear-gradient(to top,#000 70%,rgba(0,0,0,0));display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .bar .enter{margin-top:0}
  .linkbox{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:34px;padding:18px;border:1px solid var(--line)}
  .linkbox input{flex:1 1 320px;text-align:left;padding:10px 4px;font-size:14px;letter-spacing:.02em}
  .linkbox .enter{margin-top:0;padding:12px 26px}
  .muted{color:var(--muted);font-size:13px;letter-spacing:.04em}
  .player{position:relative;width:100%;aspect-ratio:16/9;background:#0b0b0b;margin-bottom:18px}
  .player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .nowbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:44px}
  .now{font-size:15px;letter-spacing:.12em}
  .now small{display:block;margin-top:6px;font-size:12px;letter-spacing:.06em;color:var(--muted)}
  .vids{display:flex;gap:8px;flex-wrap:wrap}
  .vids button{background:transparent;border:1px solid var(--line);color:var(--muted);font:inherit;font-size:11px;letter-spacing:.2em;min-width:40px;height:40px;padding:0 12px;cursor:pointer;transition:border-color .2s,color .2s}
  .vids button:hover,.vids button[aria-pressed="true"]{border-color:var(--fg);color:var(--fg)}
  button.tile{border:0;padding:0;cursor:pointer;font:inherit;text-align:left;width:100%}
  button.tile[aria-pressed="true"]{outline:2px solid var(--accent);outline-offset:3px}
  button.tile[aria-pressed="true"] img{opacity:1}
  button.tile:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
</style></head>
<body>
<header>
  <a class="mark" href="/"><img src="https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1d1ecc1e-95c4-476b-9223-124c816f6cbd/%C2%B6_v1.png?format=300w" alt="Paragraph"></a>
  <nav><a href="/entertainment">Film &amp; TV</a><a href="/brand">Branded</a><a href="/about">About</a></nav>
</header>
<main>${body}</main>
</body></html>`;
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(html, { status, headers });
}

function signInBody(wrong) {
  return `<form class="card" method="post">
    <div class="rule" aria-hidden="true"></div>
    <div class="label">Archive</div>
    <h1>This collection is <em>private.</em><br>Enter the password to continue.</h1>
    <label class="sr" for="password">Password</label>
    <div class="field">
      <input id="password" name="password" type="password" placeholder="Password" autocomplete="current-password" autofocus required>
      <button type="button" class="eye" aria-label="Show password" aria-pressed="false" aria-controls="password">
        <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
      </button>
    </div>
    <div class="error" role="alert">${wrong ? 'That password isn’t right. Please try again.' : ''}</div>
    <button type="submit" class="enter">Enter</button>
    <div><a class="back" href="/">← Back to Paragraph</a></div>
  </form>
  <script>(function(){var b=document.querySelector('.eye'),i=document.getElementById('password');
   b.addEventListener('click',function(){var s=i.type==='password';i.type=s?'text':'password';
    b.setAttribute('aria-pressed',s?'true':'false');b.setAttribute('aria-label',s?'Hide password':'Show password');i.focus();});})();</script>`;
}

function messageBody(title, text) {
  return `<div class="card"><div class="rule" aria-hidden="true"></div><div class="label">Archive</div>
    <h1>${esc(title)}</h1><p class="note">${esc(text)}</p><a class="back" href="/">← Back to Paragraph</a></div>`;
}

function tile(p, href) {
  return `<a class="tile" href="${href}"><img src="${esc(p.img)}?format=750w" alt="" loading="lazy"><span>${esc(p.title)}</span></a>`;
}

function collectionBody(slugs) {
  const list = slugs.map((s) => BY_SLUG[s]).filter((p) => p.videos && p.videos.length);
  const data = JSON.stringify(list.map((p) => ({ slug: p.slug, title: p.title, videos: p.videos }))).replace(/</g, '\\u003c');
  const first = list[0];
  const tiles = slugs.map((s, i) => {
    const p = BY_SLUG[s];
    return `<button type="button" class="tile" data-i="${list.indexOf(p)}" aria-pressed="${i === 0}" aria-label="Play ${esc(p.title)}"><img src="${esc(p.img)}?format=750w" alt="" loading="lazy"><span>${esc(p.title)}</span></button>`;
  }).join('');
  return `<div class="card wide"><div class="rule" aria-hidden="true"></div><div class="label">Selected work</div>
    <h1>A few projects, <em>picked for you.</em></h1>
    ${first ? `<div class="player" id="player"><iframe id="frame" src="${esc(first.videos[0].src)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="${esc(first.videos[0].title || first.title)}"></iframe></div>
    <div class="nowbar"><div class="now" id="now"></div><div class="vids" id="vids" role="group" aria-label="Videos in this project"></div></div>` : ''}
    <div class="grid">${tiles}</div>
    <a class="back" href="/">← Back to Paragraph</a></div>
  <script>(function(){
    var P=${data},frame=document.getElementById('frame'),now=document.getElementById('now'),vids=document.getElementById('vids'),cur=0,curV=0;
    if(!frame)return;
    function src(u,auto){return u+(u.indexOf('?')<0?'?':'&')+'autoplay='+(auto?1:0);}
    function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
    function show(i,v,auto){cur=i;curV=v;var p=P[i],vid=p.videos[v];
      frame.src=src(vid.src,auto);frame.title=vid.title||p.title;
      now.innerHTML=esc(p.title)+(vid.title&&vid.title!==p.title?'<small>'+esc(vid.title)+'</small>':'');
      vids.innerHTML=p.videos.length>1?p.videos.map(function(x,k){return '<button type="button" aria-pressed="'+(k===v)+'" aria-label="Play video '+(k+1)+': '+esc(x.title||'')+'">'+(k+1)+'</button>';}).join(''):'';
      [].forEach.call(vids.querySelectorAll('button'),function(b,k){b.addEventListener('click',function(){show(cur,k,true);});});
      [].forEach.call(document.querySelectorAll('button.tile'),function(t){t.setAttribute('aria-pressed',String(+t.dataset.i===i));});}
    [].forEach.call(document.querySelectorAll('button.tile'),function(t){t.addEventListener('click',function(){var i=+t.dataset.i;if(i<0)return;show(i,0,true);
      document.getElementById('player').scrollIntoView({behavior:'smooth',block:'start'});});});
    show(0,0,false);
  })();</script>`;
}

function builderBody(selected, link) {
  const box = link
    ? `<div class="linkbox"><label class="sr" for="share">Share link</label><input id="share" type="text" readonly value="${esc(link)}">
       <button type="button" class="enter" id="copy">Copy link</button><span class="muted" id="copied" role="status"></span></div>`
    : '';
  return `<form class="card wide" method="get">
    <div class="rule" aria-hidden="true"></div><div class="label">Share projects</div>
    <h1>Pick projects to share. <em>Send the link.</em></h1>
    <p class="note">One project opens straight to its page. Two or more get their own selection page. Clients can only open the projects you pick.</p>
    ${box}
    <div class="grid">${PROJECTS.map((p) => `<label class="pick"><input type="checkbox" name="pick" value="${p.slug}"${selected.includes(p.slug) ? ' checked' : ''}>${tile(p, '#').replace('<a class="tile" href="#"', '<span class="tile"').replace(/<\/a>$/, '</span>')}</label>`).join('')}</div>
    <input type="hidden" name="p" id="p">
    <div class="bar"><button type="submit" class="enter">Make link</button><span class="muted" id="count"></span>
      <a class="back" style="margin:0 0 0 auto" href="/archive">Full archive</a><a class="back" style="margin:0" href="/archive-logout">Sign out</a></div>
  </form>
  <script>(function(){
    var f=document.querySelector('form'),p=document.getElementById('p'),c=document.getElementById('count');
    function n(){var k=f.querySelectorAll('input[name=pick]:checked').length;c.textContent=k?k+' selected':'';}
    f.addEventListener('change',n);n();
    f.addEventListener('submit',function(e){var v=[].map.call(f.querySelectorAll('input[name=pick]:checked'),function(x){return x.value});
      if(!v.length){e.preventDefault();c.textContent='Pick at least one project';return;}
      p.value=v.join(',');f.querySelectorAll('input[name=pick]').forEach(function(x){x.disabled=true;});});
    var b=document.getElementById('copy');if(b)b.addEventListener('click',function(){var i=document.getElementById('share');i.select();
      (navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.resolve(document.execCommand('copy'))).then(function(){document.getElementById('copied').textContent='Copied';});});
  })();</script>`;
}
