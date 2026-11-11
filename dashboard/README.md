# Paragraph dashboard

The studio dashboard for Paragraph Films, served at dashboard.paragraphfilms.com. It lives in this folder of the site repo but deploys as its own Vercel project; the public site in the repo root is untouched by it.

| Section | What it holds |
|---|---|
| **Dashboard** | Clock, this week's weather, calendar, to-dos, projects by stage, runway, leads, industry news, visual inspiration |
| **To-dos** | Tasks with project tag, urgent flag, deadline and reminder; mirrored to Google Calendar |
| **Schedule** | Month calendar, two-way sync with Google Calendar |
| **Client projects** | Bidding → delivered board, budgets, hard costs, document links; client list from QuickBooks |
| **Documentary / Narrative** | Stage boards with key art |
| **New biz dev** | Leads, marketing analytics (website, Vimeo, LinkedIn, Instagram), newsletter list, holiday gifts |
| **Finance** | Cash, overhead (salary, op ex), projected revenue, burn rate and runway |
| **Gear** | Inventory, sell list (eBay, Facebook Marketplace), purchase list |
| **Notebook** | Tagged notes with links, image, linked project and to-dos; written to a Google Doc with a tab per tag |
| **Settings** | Google and QuickBooks connections, AI access tokens, news feeds |

Every section has an **Images** button for a header image and a page background.

An AI assistant (INSTINCT AI or any other) can be given a token under **Settings → AI access**. It then reaches the dashboard through an MCP endpoint (`/api/mcp`) or plain REST (`/api/agent`), and can read the summary and add or change to-dos, events, project stages and notes.

Built with Next.js 15 (App Router) and Supabase (Postgres, sign-in, row-level security, image storage). See **SETUP.md** to deploy.
