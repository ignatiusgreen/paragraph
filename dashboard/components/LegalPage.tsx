import { notFound } from "next/navigation";

/** The legal pages stay dark (404) until the owner sets LEGAL_PAGES_LIVE in Vercel and redeploys. */
export function legalPagesLive() {
  const v = process.env.LEGAL_PAGES_LIVE?.trim().toLowerCase();
  return !!v && v !== "0" && v !== "false" && v !== "off" && v !== "no";
}

/** Shared layout for /privacy and /terms: the dashboard's top bar and title style, with the text shown verbatim. */
export function LegalPage({ title, text }: { title: string; text: string }) {
  if (!legalPagesLive()) notFound();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="topbar-row"><img src="/logo-white.png" alt="Paragraph" width={132} height={40} /></div>
        </div>
      </header>
      <main className="main">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <p className="tiny muted">Draft - pending owner review.</p>
          <header className="hero"><h1>{title}.</h1></header>
          <section className="card"><p style={{ whiteSpace: "pre-wrap" }}>{text}</p></section>
        </div>
      </main>
    </div>
  );
}
