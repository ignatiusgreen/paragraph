"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDashboardLayout } from "@/app/(app)/actions";

type Item = { id: string; label: string; span: string; href?: string; node: React.ReactNode };
type Slot = { id: string; span: string };
const SIZES = [["s4", "Narrow"], ["s6", "Half"], ["s8", "Wide"], ["s12", "Full width"]];

/** Saved layout first, then any widgets it doesn't mention, in their default order. */
function merge(items: Item[], saved: Slot[] | null): Slot[] {
  const known = new Set(items.map((i) => i.id));
  const kept = (saved ?? []).filter((s) => known.has(s.id));
  const seen = new Set(kept.map((s) => s.id));
  return [...kept, ...items.filter((i) => !seen.has(i.id)).map(({ id, span }) => ({ id, span }))];
}

/** The dashboard grid. In "Arrange" mode widgets can be dragged, nudged with arrows, and resized. */
export function WidgetGrid({ items, saved }: { items: Item[]; saved: Slot[] | null }) {
  const [layout, setLayout] = useState(() => merge(items, saved));
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  const latest = useRef(layout);
  const drag = useRef<string | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));
  const router = useRouter();
  /** Clicking empty space in a widget opens its section; links, buttons, checkboxes and dialogs inside keep working as usual. */
  const open = (e: React.MouseEvent, href?: string) => {
    if (!href || editing || e.defaultPrevented || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label, summary, dialog")) return;
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) window.open(href, "_blank"); else router.push(href);
  };

  const apply = (next: Slot[], save = true) => {
    latest.current = next;
    setLayout(next);
    if (save) start(() => saveDashboardLayout(next));
  };
  const move = (id: string, to: number, save = true) => {
    const from = latest.current.findIndex((s) => s.id === id);
    if (from === -1 || to < 0 || to >= latest.current.length || from === to) return;
    const next = [...latest.current];
    next.splice(to, 0, next.splice(from, 1)[0]);
    apply(next, save);
  };

  return (
    <>
      <div className="row arrange-bar">
        {editing ? <span className="small">Drag a widget by its bar, or use the arrows. Changes save as you go.</span> : null}
        {editing ? <button type="button" className="btn ghost sm" onClick={() => apply(items.map(({ id, span }) => ({ id, span })))}>Reset layout</button> : null}
        <button type="button" className={`btn sm${editing ? "" : " ghost"}`} aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? "Done" : "Arrange widgets"}</button>
      </div>
      <div className="grid stretch">
        {layout.map((slot, i) => {
          const item = byId.get(slot.id);
          if (!item) return null;
          return (
            <div
              key={slot.id}
              className={`widget ${slot.span}${editing ? " editing" : ""}${dragging === slot.id ? " dragging" : ""}${item.href && !editing ? " linked" : ""}`}
              onClick={(e) => open(e, item.href)}
              onDragOver={(e) => { if (drag.current) { e.preventDefault(); if (drag.current !== slot.id) move(drag.current, i, false); } }}
              onDrop={(e) => e.preventDefault()}
            >
              {editing ? (
                <div
                  className="widget-bar"
                  draggable
                  onDragStart={(e) => {
                    drag.current = slot.id;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", slot.id);
                    // Restyle after the browser has taken its drag image; changing the element sooner can cancel the drag.
                    setTimeout(() => setDragging(slot.id), 0);
                  }}
                  onDragEnd={() => { drag.current = null; setDragging(null); start(() => saveDashboardLayout(latest.current)); }}
                >
                  <span className="grip" aria-hidden="true">⠿</span>
                  <span className="widget-name">{item.label}</span>
                  <button type="button" aria-label={`Move ${item.label} earlier`} disabled={i === 0} onClick={() => move(slot.id, i - 1)}>←</button>
                  <button type="button" aria-label={`Move ${item.label} later`} disabled={i === layout.length - 1} onClick={() => move(slot.id, i + 1)}>→</button>
                  <select aria-label={`Width of ${item.label}`} value={slot.span} onChange={(e) => apply(layout.map((s) => (s.id === slot.id ? { ...s, span: e.target.value } : s)))}>
                    {SIZES.map(([v, name]) => <option key={v} value={v}>{name}</option>)}
                  </select>
                </div>
              ) : null}
              {item.node}
            </div>
          );
        })}
      </div>
    </>
  );
}
