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
      <img src="/logo-white.png" alt="Paragraph" width={132} height={40} />
    </Link>
  );
  return (
    <div className="shell">
      <TzCookie current={store.get("tz")?.value ?? ""} />
      <header className="topbar">
        <div className="topbar-in">
          <div className="topbar-row">{logo}</div>
          <nav className="tabs" aria-label="Sections"><NavLinks counts={counts} /></nav>
          <form action="/auth/signout" method="post" className="topbar-user">
            <span>{me.name ?? me.email}</span>
            <button type="submit">Sign out</button>
          </form>
        </div>
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
