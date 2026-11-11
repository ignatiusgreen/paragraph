import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NavLinks } from "@/components/Nav";
import { Flash } from "@/components/Flash";
import { TzCookie } from "@/components/client";
import { getMe, getTodos, getTz } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?error=" + encodeURIComponent("That account isn't on the access list for this dashboard."));
  const [store, tz, todos] = await Promise.all([cookies(), getTz(), getTodos()]);
  const flash = store.get("flash")?.value;
  const counts = { todos: todos.filter((t) => !t.done && t.urgent).length };
  const logo = (
    <Link href="/" aria-label="Paragraph — Dashboard">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.png" alt="Paragraph" width={150} height={45} />
    </Link>
  );
  return (
    <div className="shell">
      <TzCookie current={store.get("tz")?.value ?? ""} />
      <nav className="side" aria-label="Sections">
        <div className="brand">{logo}<div className="brand-sub">Studio dashboard</div></div>
        <NavLinks counts={counts} />
        <div className="side-foot">
          {me.name ?? me.email} · {tz.split("/").pop()?.replace(/_/g, " ")}<br />
          <form action="/auth/signout" method="post"><button type="submit">Sign out</button></form>
        </div>
      </nav>
      <header className="topbar">
        <div className="topbar-row">{logo}</div>
        <nav className="tabs" aria-label="Sections"><NavLinks counts={counts} /></nav>
      </header>
      <main className="main" id="main">
        <div className="wrap">
          {flash ? <Flash message={flash} /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
