"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const SECTIONS = [
  { key: "dashboard", href: "/", label: "Dashboard" },
  { key: "todos", href: "/todos", label: "To-dos" },
  { key: "schedule", href: "/schedule", label: "Schedule" },
  { sep: true },
  { key: "clients", href: "/clients", label: "Client projects" },
  { key: "documentary", href: "/documentary", label: "Documentary" },
  { key: "narrative", href: "/narrative", label: "Narrative" },
  { sep: true },
  { key: "bizdev", href: "/bizdev", label: "New biz dev" },
  { key: "finance", href: "/finance", label: "Finance" },
  { key: "gear", href: "/gear", label: "Gear" },
  { key: "notebook", href: "/notebook", label: "Notebook" },
  { sep: true },
  { key: "settings", href: "/settings", label: "Settings" },
] as const;

export function NavLinks({ counts = {} }: { counts?: Record<string, number> }) {
  const path = usePathname();
  return (
    <>
      {SECTIONS.map((s, i) =>
        "sep" in s ? <div key={i} className="nav-sep" /> : (
          <Link key={s.href} href={s.href} className="navlink" aria-current={(s.href === "/" ? path === "/" : path.startsWith(s.href)) ? "page" : undefined}>
            {s.label}
            {counts[s.key] ? <span className="count">{counts[s.key]}</span> : null}
          </Link>
        ),
      )}
    </>
  );
}
