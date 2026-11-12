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
export function Weather({ approx }: { approx?: { lat: number; lon: number; place: string } | null }) {
  const [wx, setWx] = useState<Wx | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  useEffect(() => {
    let live = true, precise = false;
    async function load(lat: number, lon: number, known?: string) {
      try {
        const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)).json();
        let place = known || "Current location";
        if (!known) {
          try {
            const g = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
            place = [g.city || g.locality, g.principalSubdivisionCode?.split("-").pop()].filter(Boolean).join(", ") || place;
          } catch { /* name is optional */ }
        }
        const days = (f.daily.time as string[]).map((date, i) => ({
          date, code: f.daily.weather_code[i], hi: Math.round(f.daily.temperature_2m_max[i]), lo: Math.round(f.daily.temperature_2m_min[i]),
        }));
        if (!live) return;
        setWx({ place, days }); setState("ready");
      } catch { if (live) setState((s) => (s === "ready" ? s : "error")); }
    }
    // Show something straight away: the last precise location, else the approximate one from the network.
    let saved: { lat: number; lon: number } | null = null;
    try { saved = JSON.parse(localStorage.getItem("wx-loc") ?? "null"); } catch { /* fine */ }
    if (saved) load(saved.lat, saved.lon);
    else if (approx) load(approx.lat, approx.lon, approx.place);
    // Then refine with the device's location if the browser gives it. Failing here is fine.
    if (!navigator.geolocation) { if (!saved && !approx) setState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        precise = true;
        const lat = +p.coords.latitude.toFixed(2), lon = +p.coords.longitude.toFixed(2);
        try { localStorage.setItem("wx-loc", JSON.stringify({ lat, lon })); } catch { /* fine */ }
        if (!saved || saved.lat !== lat || saved.lon !== lon) load(lat, lon);
      },
      () => { if (!saved && !approx && !precise && live) setState("denied"); },
      { maximumAge: 3600000, timeout: 20000 },
    );
    return () => { live = false; };
  }, [approx?.lat, approx?.lon, approx?.place]);
  if (state !== "ready" || !wx) {
    return <p className="small muted">{state === "loading" ? "Finding the forecast…" : state === "denied" ? "Your location couldn't be read. On a Mac, check System Settings → Privacy & Security → Location Services and make sure Safari is switched on." : "The forecast isn't available right now."}</p>;
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

const SWATCHES = [
  ["#d9e8e3", "Mint (default)"], ["#f0eeec", "Pearl"], ["#f1f6f4", "Arctic"], ["#b0d4e4", "Sky"], ["#88b98c", "Leaf"],
  ["#ffc801", "Forsythia"], ["#d78f1f", "Sun"], ["#04656b", "Teal"], ["#114c5a", "Deep teal"], ["#172b36", "Noir"], ["#041b21", "Dusk"],
];

/** Pick a page background colour: a palette swatch, any custom colour, or back to the default. */
export function ColorField({ name, label, defaultValue, mintLabel }: { name: string; label: string; defaultValue?: string | null; mintLabel?: string }) {
  const [color, setColor] = useState(defaultValue ?? "");
  return (
    <div className="field">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={color} />
      <div className="swatches">
        {SWATCHES.map(([hex, title]) => (
          <button key={hex} type="button" title={hex === SWATCHES[0][0] && mintLabel ? mintLabel : title} aria-label={hex === SWATCHES[0][0] && mintLabel ? mintLabel : title} aria-pressed={color === hex || (!color && hex === SWATCHES[0][0])}
            style={{ background: hex }} onClick={() => setColor(hex === SWATCHES[0][0] ? "" : hex)} />
        ))}
        <label className="custom">
          Custom
          <input type="color" aria-label="Custom background color" value={color || SWATCHES[0][0]} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
      <span className="tiny muted">{color ? `Using ${color}.` : mintLabel ? `${mintLabel}.` : "Using the default mint."} A background image, if set, shows on top of the color.</span>
    </div>
  );
}

type SourceRow = { label: string; url: string; weight: number };

/** Editable list of image sources (name, page or feed address, how much to favour it), sent as JSON. */
export function SourcesField({ name, defaultValue }: { name: string; defaultValue: SourceRow[] }) {
  const [rows, setRows] = useState<SourceRow[]>(defaultValue);
  const update = (i: number, patch: Partial<SourceRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="field">
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => r.url.trim()))} />
      {rows.map((r, i) => (
        <div className="sourcerow" key={i}>
          <input aria-label={`Source ${i + 1} name`} placeholder="Name" value={r.label} onChange={(e) => update(i, { label: e.target.value })} />
          <input aria-label={`Source ${i + 1} address`} type="url" placeholder="https://… (exhibitions page or RSS feed)" value={r.url} onChange={(e) => update(i, { url: e.target.value })} />
          <select aria-label={`How often to show source ${i + 1}`} value={r.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })}>
            <option value={3}>Favor</option><option value={2}>Normal</option><option value={1}>Occasionally</option>
          </select>
          <button type="button" className="btn ghost sm" aria-label={`Remove source ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div><button type="button" className="btn ghost sm" onClick={() => setRows([...rows, { label: "", url: "", weight: 2 }])}>+ Add source</button></div>
    </div>
  );
}

/** Eye button: hides every money figure (for working in public), remembered on this device. */
export function PrivacyToggle({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () => {
    document.cookie = `hide_money=${hidden ? 0 : 1}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <button type="button" className="eye" onClick={toggle} disabled={pending} aria-pressed={hidden}
      aria-label={hidden ? "Financial data is hidden. Show it" : "Hide financial data"} title={hidden ? "Financial data is hidden — click to show" : "Hide financial data"}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {hidden ? <path d="M4 4l16 16" /> : null}
      </svg>
    </button>
  );
}

/** Re-renders the dashboard, which draws a fresh random set of inspiration images. */
export function ShuffleButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn sm" style={{ flex: "none" }} disabled={pending} onClick={() => start(() => router.refresh())}>
      <span aria-hidden="true">⤨</span> {pending ? "Shuffling…" : "Shuffle"}
    </button>
  );
}
