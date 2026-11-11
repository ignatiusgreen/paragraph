# Paragraph dashboard — setup

The database already exists: Supabase project **PARAGRAPH** (`dujhgnnphqmcskfpbmll`), with the schema from `supabase/migrations/0001_init.sql` applied and `jg@paragraphfilms.com` on the access list. What's left is the Vercel project, the domain, and the keys for each connection.

## 1. Vercel project + domain

1. Merge the `claude/paragraph-dashboard` branch into `main`.
2. Vercel → **Add New → Project → Import** `ignatiusgreen/paragraph` (a second project from the same repo).
   Set **Root Directory** to `dashboard`. Framework: Next.js.
3. Add these environment variables, then **Deploy**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dujhgnnphqmcskfpbmll.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_G-EWUU_c0ttpQC59P4VhfA_EBlJkORu` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **secret** key (`sb_secret_…`) |
| `NEXT_PUBLIC_APP_URL` | `https://dashboard.paragraphfilms.com` |
| `CRON_SECRET` | any long random string |

4. In the new project: **Settings → Domains → Add** `dashboard.paragraphfilms.com`, and add the CNAME record Vercel shows wherever the paragraphfilms.com DNS is managed.
5. Optional, on the *site* project: **Settings → Git → Ignored Build Step** → `git diff --quiet HEAD^ HEAD -- . ':!dashboard'` so dashboard-only changes don't redeploy the public site.

`paragraphfilms.com/dashboard` redirects to the subdomain (see the root `vercel.json`).

## 2. Sign-in

1. Supabase → **Authentication → URL Configuration**: set **Site URL** to `https://dashboard.paragraphfilms.com` and add `https://dashboard.paragraphfilms.com/**` under Redirect URLs.
2. Supabase → **Authentication → Users → Add user**: `jg@paragraphfilms.com` with a password, **Auto Confirm User** checked.
   (Or skip the password and use **Email me a code instead** on the sign-in page; to show the 6-digit code in that email, add `{{ .Token }}` to the Magic Link template under Authentication → Emails.)

Only emails in the `members` table can get in. To add someone: `insert into members (email, name) values ('…', '…');`

## 3. Google Calendar + Docs

1. console.cloud.google.com → new project → **APIs & Services → Library**: enable **Google Calendar API** and **Google Docs API**.
2. **OAuth consent screen**: User type **Internal** (paragraphfilms.com Workspace), so no Google review is needed.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorized redirect URI: `https://dashboard.paragraphfilms.com/api/google/callback`
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel, redeploy.
5. Dashboard → **Settings → Connect Google**, signing in as jg@paragraphfilms.com.

After that: to-dos with a deadline and everything on Schedule are pushed to the primary calendar; Google events are pulled in whenever Schedule is opened (and daily); notes are written to a Google Doc called "Paragraph Notebook" with a tab per tag.

## 4. QuickBooks

1. developer.intuit.com → **Create an app** → QuickBooks Online and Payments → scope **Accounting**.
2. Under **Production → Keys & credentials**, add the redirect URI `https://dashboard.paragraphfilms.com/api/qbo/callback` and copy the Client ID and secret. (Intuit asks a short questionnaire before issuing production keys.)
3. Add `QBO_CLIENT_ID` and `QBO_CLIENT_SECRET` in Vercel, redeploy.
4. Dashboard → **Settings → Connect QuickBooks**.

The dashboard only reads: customers (the client list), bank and credit-card account balances, open invoices and monthly profit & loss. Bank balances come from the bank feeds already connected inside QuickBooks, so there is no separate bank login.

## 5. AI access (INSTINCT AI)

Dashboard → **Settings → AI access → Create access token**. Give the assistant:

- MCP server URL `https://dashboard.paragraphfilms.com/api/mcp` with header `Authorization: Bearer <token>`, or
- REST: `GET /api/agent` lists the tools; `POST /api/agent/<tool>` runs one with a JSON body.

Tools: `get_summary`, `list_todos`, `add_todo`, `update_todo`, `delete_todo`, `list_events`, `add_event`, `update_event`, `delete_event`, `list_projects`, `update_project_stage`, `add_note`, `list_notes`. Revoke the token in Settings to cut access.

## 6. Optional keys

| Name | What it turns on |
|---|---|
| `VIMEO_ACCESS_TOKEN` | Daily Vimeo plays and followers (developer.vimeo.com → your app → personal access token, scopes `public private stats`) |
| `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` | Daily Instagram followers and posts (Meta developer app with the Instagram Graph API; needs a Business or Creator account) |
| `TMDB_API_KEY` | Film stills on the inspiration panel (themoviedb.org → Settings → API) |

Website and LinkedIn numbers are entered by hand under New biz dev → Add numbers.

## Local development
```bash
cp .env.example .env.local   # fill in SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```
