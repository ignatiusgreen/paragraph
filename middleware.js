// Password-protects the project archive (archive.html and every archive-*.html page).
// The password is NOT stored here: set ARCHIVE_PASSWORD in Vercel → Settings → Environment Variables.
export const config = { matcher: ['/archive(.*)'] };

export default function middleware(request) {
  const password = process.env.ARCHIVE_PASSWORD;
  if (!password) {
    return new Response('The archive is locked until a password is set.', { status: 503 });
  }
  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try { decoded = atob(encoded); } catch (e) {}
    const given = decoded.slice(decoded.indexOf(':') + 1);
    if (given === password) return; // correct password: show the page
  }
  return new Response('Password required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Paragraph Archive", charset="UTF-8"' },
  });
}
