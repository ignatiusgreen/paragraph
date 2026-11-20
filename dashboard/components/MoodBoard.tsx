"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { browserDb } from "@/lib/supabase/browser";
import { addMoodImage, addMoodLink, deleteMoodItem, placeMoodItem, syncMoodFolder } from "@/app/(app)/mood-actions";
import type { MoodItem } from "@/lib/types";

// The board is 1000 units wide whatever the screen, so an arrangement looks the same on every device.
const UNITS = 1000, MIN_W = 80;
const host = (u: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, "") : ""; } catch { return ""; } };
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

type Drag = { id: string; mode: "move" | "size"; px: number; py: number; x: number; y: number; w: number };

/** A free-form board: paste, drop or pick images, add links (shown by their preview image), then drag and resize them anywhere. */
export function MoodBoard({ projectId, initial, driveUrl, google }: { projectId: string; initial: MoodItem[]; driveUrl: string | null; google: boolean }) {
  const [items, setItems] = useState<MoodItem[]>(() => initial.map((i) => ({ ...i, x: +i.x, y: +i.y, w: +i.w })));
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [scale, setScale] = useState(1);
  const [working, setWorking] = useState(0);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [drive, setDrive] = useState(driveUrl);
  const [over, setOver] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const live = useRef(items);
  live.current = items;

  useLayoutEffect(() => {
    const el = board.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / UNITS || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const topZ = () => live.current.reduce((m, i) => Math.max(m, i.z), 0) + 1;
  /** Where a new item lands: in the part of the board currently on screen, stepping so several don't hide each other. */
  const spot = useCallback((n: number, at?: { x: number; y: number }) => {
    const rect = board.current?.getBoundingClientRect();
    const s = rect ? rect.width / UNITS : 1;
    if (at && rect) return { x: Math.max(0, Math.min(UNITS - 240, (at.x - rect.left) / s - 120)) + n * 24, y: Math.max(0, (at.y - rect.top) / s - 60) + n * 24, w: 240, z: topZ() + n };
    const visibleTop = rect ? Math.max(0, -rect.top) / s : 0;
    const step = (live.current.length + n) % 8;
    return { x: 24 + step * 34, y: visibleTop + 24 + step * 34, w: 240, z: topZ() + n };
  }, []);

  const run = async (job: () => Promise<{ item?: MoodItem; error?: string }>) => {
    setWorking((n) => n + 1); setMsg("");
    try {
      const res = await job();
      if (res.item) { const it = res.item; setItems((list) => [...list, { ...it, x: +it.x, y: +it.y, w: +it.w }]); }
      else if (res.error) setMsg(res.error);
    } catch (e) { setMsg((e as Error).message || "Something went wrong."); }
    setWorking((n) => n - 1);
  };

  const addFiles = useCallback((files: File[], at?: { x: number; y: number }) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length && files.length) setMsg("Only images can go on the board.");
    images.forEach((file, n) => run(async () => {
      const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
      const path = `mood/${projectId}/${crypto.randomUUID()}.${ext}`;
      const sb = browserDb();
      const { error } = await sb.storage.from("media").upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (error) return { error: `Upload failed: ${error.message}` };
      const name = /^image\.\w+$/i.test(file.name) ? null : file.name.replace(/\.\w+$/, "");
      return addMoodImage(projectId, sb.storage.from("media").getPublicUrl(path).data.publicUrl, name, spot(n, at));
    }));
  }, [projectId, spot]);

  const addLink = useCallback((url: string, at?: { x: number; y: number }) => run(() => addMoodLink(projectId, url, spot(0, at))), [projectId, spot]);

  // Paste anywhere on the page (outside a text box): an image goes on the board, so does a web address.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (typing(e.target) || !e.clipboardData) return;
      const files = [...e.clipboardData.files];
      const text = e.clipboardData.getData("text/plain").trim();
      if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); addFiles(files); }
      else if (isUrl(text)) { e.preventDefault(); addLink(text); }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addFiles, addLink]);

  const patch = (id: string, p: Partial<MoodItem>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const save = (id: string) => { const i = live.current.find((x) => x.id === id); if (i) placeMoodItem(id, { x: i.x, y: i.y, w: i.w, z: i.z }).catch(() => setMsg("Couldn't save that move. Check your connection.")); };
  const remove = (i: MoodItem) => { setItems((list) => list.filter((x) => x.id !== i.id)); deleteMoodItem(i.id, projectId).catch(() => setMsg("Couldn't remove that.")); };

  const down = (e: React.PointerEvent, i: MoodItem, mode: Drag["mode"]) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: i.id, mode, px: e.clientX, py: e.clientY, x: i.x, y: i.y, w: i.w };
    if (i.z < topZ() - 1 || live.current.length === 1) patch(i.id, { z: topZ() });
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const s = (board.current?.clientWidth || UNITS) / UNITS;
    const dx = (e.clientX - d.px) / s, dy = (e.clientY - d.py) / s;
    if (d.mode === "move") patch(d.id, { x: Math.max(0, Math.min(UNITS - d.w, d.x + dx)), y: Math.max(0, d.y + dy) });
    else patch(d.id, { w: Math.max(MIN_W, Math.min(UNITS - d.x, d.w + dx)) });
  };
  const up = () => { const d = drag.current; drag.current = null; if (d) save(d.id); };
  const key = (e: React.KeyboardEvent, i: MoodItem) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 40 : 10;
    const by: Record<string, Partial<MoodItem>> = {
      ArrowLeft: { x: Math.max(0, i.x - step) }, ArrowRight: { x: Math.min(UNITS - i.w, i.x + step) },
      ArrowUp: { y: Math.max(0, i.y - step) }, ArrowDown: { y: i.y + step },
      "+": { w: Math.min(UNITS - i.x, i.w + 20) }, "=": { w: Math.min(UNITS - i.x, i.w + 20) }, "-": { w: Math.max(MIN_W, i.w - 20) },
    };
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(i); }
    else if (by[e.key]) { e.preventDefault(); patch(i.id, by[e.key]); setTimeout(() => save(i.id)); }
  };

  const drop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const at = { x: e.clientX, y: e.clientY };
    const files = [...e.dataTransfer.files];
    const url = (e.dataTransfer.getData("text/uri-list").split("\n").find((l) => l && !l.startsWith("#")) || e.dataTransfer.getData("text/plain")).trim();
    if (files.length) addFiles(files, at);
    else if (isUrl(url)) addLink(url, at);
  };

  const makeFolder = async () => {
    setWorking((n) => n + 1); setMsg("");
    const res = await syncMoodFolder(projectId).catch((e) => ({ error: (e as Error).message, url: undefined }));
    if (res.url) { setDrive(res.url); window.open(res.url, "_blank", "noopener"); } else setMsg(res.error ?? "Couldn't reach Google Drive.");
    setWorking((n) => n - 1);
  };

  const height = Math.max(520, ...items.map((i) => i.y + i.w * (i.image_url ? ratios[i.id] ?? 0.75 : 0.4) + (i.kind === "link" ? 70 / scale : 0) + 140));

  return (
    <div className="mood">
      <div className="mood-bar">
        <button type="button" className="btn sm" onClick={() => picker.current?.click()}>+ Images</button>
        <input ref={picker} type="file" accept="image/*" multiple hidden aria-label="Add images to the mood board"
          onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
        <form className="mood-link" onSubmit={(e) => { e.preventDefault(); const u = link.trim(); if (!u) return; if (!isUrl(u) && !isUrl(`https://${u}`)) return setMsg("That doesn't look like a web address."); addLink(isUrl(u) ? u : `https://${u}`); setLink(""); }}>
          <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a link…" aria-label="Link to add to the mood board" />
          <button type="submit" className="btn ghost sm">Add link</button>
        </form>
        <span className="mood-status small muted" role="status">{working ? "Adding…" : `${items.length} item${items.length === 1 ? "" : "s"}`}</span>
        {drive
          ? <a className="btn ghost sm" href={drive} target="_blank" rel="noreferrer">Drive folder ↗</a>
          : google ? <button type="button" className="btn ghost sm" disabled={!!working} onClick={makeFolder}>Create Drive folder</button> : null}
      </div>
      {msg ? <p className="small" role="alert" style={{ color: "var(--danger)", margin: 0 }}>{msg}</p> : null}
      <div ref={board} className={`mood-board${over ? " over" : ""}`} style={{ aspectRatio: `${UNITS} / ${Math.round(height)}` }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        {items.length ? null : (
          <div className="mood-empty">
            <strong>Start the board</strong>
            <span>Copy an image or a link anywhere, then paste it here (⌘V). Or drop files in. Drag things around and keep your favourites at the top.</span>
          </div>
        )}
        {items.map((i) => {
          const where = host(i.source_url);
          const label = i.title || where || "Image";
          return (
            <div key={i.id} className={`mood-item ${i.kind}`} tabIndex={0} role="group" aria-label={`${label}. Arrow keys move, plus and minus resize, Delete removes.`}
              style={{ left: `${i.x / 10}%`, top: `${(i.y / height) * 100}%`, width: `${i.w / 10}%`, zIndex: i.z }}
              onPointerDown={(e) => down(e, i, "move")} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={(e) => key(e, i)}>
              {i.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={i.image_url} alt={label} draggable={false} referrerPolicy="no-referrer"
                    onLoad={(e) => { const im = e.currentTarget; if (im.naturalWidth) setRatios((r) => ({ ...r, [i.id]: im.naturalHeight / im.naturalWidth })); }} />
                : <div className="mood-noimg">{where || "Link"}</div>}
              {i.kind === "link" ? <div className="mood-cap"><strong>{label}</strong><span>{where}</span></div> : null}
              <div className="mood-tools" onPointerDown={(e) => e.stopPropagation()}>
                <a href={i.source_url ?? i.image_url ?? "#"} target="_blank" rel="noreferrer" aria-label={i.kind === "link" ? `Open ${where}` : "Open full size"} title={i.kind === "link" ? "Open link" : "Open full size"}>↗</a>
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${label}`} title="Remove">×</button>
              </div>
              <span className="mood-size" aria-hidden="true" onPointerDown={(e) => down(e, i, "size")} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
            </div>
          );
        })}
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>
        Paste images or links (⌘V), drop files in, drag to arrange, pull a corner to resize.
        {drive ? " Every image is copied to the project's Google Drive folder." : google ? " Images are copied to a Google Drive folder for this project as you add them." : " Connect Google in Settings to keep a Drive folder of everything on the board."}
      </p>
    </div>
  );
}
