"use client";
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { browserDb } from "@/lib/supabase/browser";
import { createAgentToken, toggleTodo } from "@/app/(app)/actions";
import type { LinkItem } from "@/lib/types";

/** A button that opens a dialog. The dialog closes when a form inside it is submitted. */
export function Modal({ label, title, className = "btn", children, ariaLabel }: {
  label: React.ReactNode; title: string; className?: string; children: React.ReactNode; ariaLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} aria-label={ariaLabel} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        onSubmit={(e) => { if (!(e.target as HTMLElement).hasAttribute("data-stay")) setTimeout(() => ref.current?.close(), 0); }}
      >
        <div className="dialog-head">
          <h2>{title}</h2>
          <button type="button" aria-label="Close" onClick={() => ref.current?.close()}>×</button>
        </div>
        <div className="dialog-body">{children}</div>
      </dialog>
    </>
  );
}

/** Submit button that disables itself while the form is saving. */
export function Submit({ children, className = "btn", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} {...rest}>{pending ? "Working…" : children}</button>;
}

/** Delete button that asks first. */
export function Delete({ action, what = "this" }: { action: (f: FormData) => void; what?: string }) {
  return (
    <button type="submit" className="btn danger" formAction={action} formNoValidate
      onClick={(e) => { if (!confirm(`Delete ${what}? This can't be undone.`)) e.preventDefault(); }}>
      Delete
    </button>
  );
}

export function TodoCheck({ id, done, title }: { id: string; done: boolean; title: string }) {
  const [optimistic, set] = useOptimistic(done);
  const [, start] = useTransition();
  return (
    <input type="checkbox" aria-label={`Mark "${title}" ${optimistic ? "not done" : "done"}`} checked={optimistic}
      onChange={(e) => { const v = e.target.checked; start(async () => { set(v); await toggleTodo(id, v); }); }} />
  );
}

/** A <select> that submits its form as soon as it changes. */
export function AutoSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

/** Upload an image to storage; the form gets its public URL in a hidden field. */
export function ImageField({ name, label, defaultValue, folder = "uploads" }: { name: string; label: string; defaultValue?: string | null; folder?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file: File) {
    setBusy(true); setError("");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const sb = browserDb();
    const { error } = await sb.storage.from("media").upload(path, file, { cacheControl: "31536000", contentType: file.type });
    if (error) setError(`Upload failed: ${error.message}`);
    else setUrl(sb.storage.from("media").getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <div className="field">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="imgfield">
        <div className="thumb" style={url ? { backgroundImage: `url("${url}")` } : undefined} />
        <div className="row">
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : url ? "Replace image" : "Upload image"}
          </button>
          {url ? <button type="button" className="linklike small" onClick={() => setUrl("")}>Remove</button> : null}
        </div>
        <input ref={input} type="file" accept="image/*" hidden aria-label={label}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
      {error ? <span className="small" role="alert" style={{ color: "var(--danger)" }}>{error}</span> : null}
    </div>
  );
}

/** Editable list of labelled links, sent as JSON in a hidden field. */
export function LinksField({ name = "links", label = "Links", defaultValue, placeholder = "Label (e.g. Budget)" }: {
  name?: string; label?: string; defaultValue?: LinkItem[] | null; placeholder?: string;
}) {
  const [links, setLinks] = useState<LinkItem[]>(defaultValue?.length ? defaultValue : []);
  const update = (i: number, patch: Partial<LinkItem>) => setLinks(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="field linksfield">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={JSON.stringify(links.filter((l) => l.url.trim()))} />
      {links.map((l, i) => (
        <div className="linkrow" key={i}>
          <input aria-label={`Link ${i + 1} label`} placeholder={placeholder} value={l.label} onChange={(e) => update(i, { label: e.target.value })} />
          <input aria-label={`Link ${i + 1} address`} type="url" placeholder="https://…" value={l.url} onChange={(e) => update(i, { url: e.target.value })} />
          <button type="button" className="btn ghost sm" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks(links.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div><button type="button" className="btn ghost sm" onClick={() => setLinks([...links, { label: "", url: "" }])}>+ Add link</button></div>
    </div>
  );
}

/** Tells the server which time zone the browser is in, so "today" and calendar times are right. */
export function TzCookie({ current }: { current: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) {
      document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, router]);
  return null;
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const parts = now ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(now) : [];
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return (
    <div>
      <div className="clock" aria-live="off">{now ? <>{get("hour")}:{get("minute")}<small>{get("dayPeriod")}</small></> : "–:––"}</div>
      <div className="muted small" style={{ marginTop: 12 }}>
        {now ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now) : " "}
        {now ? ` · ${Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace(/_/g, " ")}` : ""}
      </div>
    </div>
  );
}

const WMO: [number[], string, string][] = [
  [[0], "☀", "Clear"], [[1, 2], "⛅", "Partly cloudy"], [[3], "☁", "Cloudy"], [[45, 48], "≋", "Fog"],
  [[51, 53, 55, 56, 57], "☂", "Drizzle"], [[61, 63, 65, 66, 67, 80, 81, 82], "☂", "Rain"],
  [[71, 73, 75, 77, 85, 86], "❄", "Snow"], [[95, 96, 99], "⚡", "Storms"],
];
const wmo = (code: number) => WMO.find(([codes]) => codes.includes(code)) ?? [[], "·", "—"];
type Wx = { place: string; days: { date: string; code: number; hi: number; lo: number }[] };

/** This week's forecast for wherever the browser is (Open-Meteo, no key needed). */
export function Weather() {
  const [wx, setWx] = useState<Wx | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  useEffect(() => {
    let live = true;
    async function load(lat: number, lon: number) {
      try {
        const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)).json();
        let place = "Current location";
        try {
          const g = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
          place = [g.city || g.locality, g.principalSubdivisionCode?.split("-").pop()].filter(Boolean).join(", ") || place;
        } catch { /* name is optional */ }
        const days = (f.daily.time as string[]).map((date, i) => ({
          date, code: f.daily.weather_code[i], hi: Math.round(f.daily.temperature_2m_max[i]), lo: Math.round(f.daily.temperature_2m_min[i]),
        }));
        if (!live) return;
        setWx({ place, days }); setState("ready");
        try { localStorage.setItem("wx-loc", JSON.stringify({ lat, lon })); } catch { /* fine */ }
      } catch { if (live) setState("error"); }
    }
    let saved: { lat: number; lon: number } | null = null;
    try { saved = JSON.parse(localStorage.getItem("wx-loc") ?? "null"); } catch { /* fine */ }
    if (saved) load(saved.lat, saved.lon);
    if (!navigator.geolocation) { if (!saved) setState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = +p.coords.latitude.toFixed(2), lon = +p.coords.longitude.toFixed(2);
        if (!saved || saved.lat !== lat || saved.lon !== lon) load(lat, lon);
      },
      () => { if (!saved && live) setState("denied"); },
      { maximumAge: 3600000, timeout: 10000 },
    );
    return () => { live = false; };
  }, []);
  if (state !== "ready" || !wx) {
    return <p className="small muted">{state === "loading" ? "Finding the forecast…" : state === "denied" ? "Allow location access in your browser to see this week's weather here." : "The forecast isn't available right now."}</p>;
  }
  const t = wx.days[0];
  return (
    <>
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div>
          <div className="big">{t.hi}°<small>/ {t.lo}°</small></div>
          <div className="small" style={{ marginTop: 8 }}>{wmo(t.code)[2]} today</div>
        </div>
        <div className="small muted">{wx.place}</div>
      </div>
      <div className="wx">
        {wx.days.map((d, i) => (
          <div key={d.date} className={`d${i === 0 ? " now" : ""}`} title={wmo(d.code)[2] as string}>
            <span>{new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</span>
            <span className="icon" aria-hidden="true">{wmo(d.code)[1]}</span>
            <span className="hi">{d.hi}°</span>
            <span>{d.lo}°</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Creates an AI access token and shows it once. */
export function TokenForm() {
  const [state, action] = useActionState(createAgentToken, {});
  return (
    <form action={action} className="stack" data-stay>
      <div className="quick">
        <div className="field wide">
          <label htmlFor="token-name">Name for this connection</label>
          <input id="token-name" name="name" defaultValue="INSTINCT AI" required />
        </div>
        <Submit>Create access token</Submit>
      </div>
      {state.error ? <div className="notice warn" role="alert">{state.error}</div> : null}
      {state.token ? (
        <div className="stack">
          <div className="notice">Copy this token now. It is shown only once.</div>
          <pre>{state.token}</pre>
        </div>
      ) : null}
    </form>
  );
}
