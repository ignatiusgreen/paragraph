import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getMe } from "@/lib/data";
import { csrfToken, csrfValid, newCsrfSecret, sameOrigin } from "@/lib/csrf";
import { disconnectMessage, disconnectQbo } from "@/lib/qbo";

// Registered with Intuit as the app's disconnect URL, so it must be safe to expose:
//   GET  shows a confirmation page to the signed-in owner and changes nothing.
//   POST (same-origin, with the form's CSRF token) is the only thing that disconnects.
export const dynamic = "force-dynamic";

const PATH = "/api/qbo/disconnect";
const COOKIE = "qbo_disconnect_csrf";
const PURPOSE = "qbo-disconnect";

const login = (req: NextRequest) => NextResponse.redirect(new URL("/login", req.url), { status: 303 });
const refuse = (message: string) =>
  new NextResponse(page(`<h1>Not allowed</h1><p>${message}</p><p><a href="/settings">Back to Settings</a></p>`), {
    status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });

function page(body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Disconnect QuickBooks — Paragraph</title>
<style>
  body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #041b21; color: #041b21; font: 400 15px/1.5 "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif; }
  main { background: #fff; max-width: 440px; width: 100%; padding: 28px; }
  h1 { margin: 0 0 12px; font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.01em; }
  p { margin: 0 0 14px; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 20px; }
  button { background: #041b21; color: #fff; border: 1px solid #041b21; padding: 9px 16px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  a { color: inherit; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export async function GET(req: NextRequest) {
  const me = await getMe();
  if (!me) return login(req);
  // No state change here: only a confirmation form. The secret stays in an httpOnly cookie; the form
  // carries a token derived from it and the signed-in user, so another site can't forge the POST.
  const secret = newCsrfSecret();
  const res = new NextResponse(
    page(`<h1>Disconnect QuickBooks</h1>
<p>This revokes the dashboard's access at Intuit and deletes the QuickBooks tokens and cached figures stored by the Paragraph dashboard. Nothing in QuickBooks itself is changed.</p>
<form method="post" action="${PATH}">
  <input type="hidden" name="csrf" value="${csrfToken(secret, me.email, PURPOSE)}">
  <div class="row"><button type="submit">Disconnect QuickBooks</button><a href="/settings">Cancel</a></div>
</form>`),
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
  res.cookies.set(COOKIE, secret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 900, path: PATH });
  return res;
}

export async function POST(req: NextRequest) {
  const me = await getMe();
  if (!me) return login(req);
  if (!sameOrigin(req.headers)) return refuse("This request didn't come from the dashboard.");
  const form = await req.formData().catch(() => null);
  if (!csrfValid(req.cookies.get(COOKIE)?.value, me.email, PURPOSE, form?.get("csrf"))) {
    return refuse("This confirmation has expired. Open the disconnect page again and confirm.");
  }
  let message: string;
  try {
    message = disconnectMessage(await disconnectQbo());
  } catch (e) {
    message = `Couldn't disconnect QuickBooks: ${(e as Error).message}`;
  }
  revalidatePath("/", "layout");
  const res = NextResponse.redirect(new URL("/settings", req.url), { status: 303 });
  res.cookies.set("flash", message, { maxAge: 60, path: "/" });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: PATH });
  return res;
}
