/** Which columns a form may write, per table, and how to read each one from form data. */
export type FieldType = "text" | "num" | "int" | "date" | "time" | "bool" | "json" | "tags";

export const TABLES: Record<string, Record<string, FieldType>> = {
  clients: { name: "text", email: "text", phone: "text", notes: "text" },
  projects: {
    kind: "text", title: "text", client_id: "text", stage: "text", logline: "text", notes: "text", image_url: "text", links: "json",
    budget: "num", hard_costs: "num", invoiced: "num", probability: "int", expected_on: "date", archived: "bool",
  },
  notes: { title: "text", body: "text", tags: "tags", links: "json", image_url: "text", project_id: "text", noted_on: "date" },
  todos: {
    title: "text", notes: "text", project_id: "text", note_id: "text", urgent: "bool", due_date: "date", due_time: "time",
    remind_minutes: "int", done: "bool",
  },
  events: { title: "text", date: "date", end_date: "date", start_time: "time", end_time: "time", location: "text", notes: "text", project_id: "text" },
  leads: { name: "text", company: "text", email: "text", source: "text", status: "text", est_value: "num", next_step: "text", next_on: "date", notes: "text" },
  contacts: { email: "text", name: "text", company: "text", tags: "tags", subscribed: "bool" },
  gifts: { year: "int", recipient: "text", company: "text", gift: "text", cost: "num", status: "text", address: "text", notes: "text" },
  metrics: { channel: "text", metric: "text", value: "num", recorded_on: "date" },
  overhead: { name: "text", category: "text", monthly: "num", notes: "text" },
  gear: {
    list: "text", name: "text", category: "text", serial: "text", condition: "text", location: "text", purchase_price: "num", purchased_on: "date",
    ask_price: "num", sold_price: "num", sell_status: "text", ebay_url: "text", fb_url: "text", buy_url: "text", est_cost: "num", priority: "text",
    image_url: "text", notes: "text",
  },
  pins: { image_url: "text", caption: "text", source_url: "text" },
};

/** Build a row from the fields the form actually sent. Checkboxes are listed in a hidden `_bools` field. */
export function readForm(table: string, f: FormData): Record<string, unknown> {
  const spec = TABLES[table];
  if (!spec) throw new Error(`Unknown table ${table}`);
  const bools = String(f.get("_bools") ?? "").split(",").filter(Boolean);
  const row: Record<string, unknown> = {};
  for (const [k, type] of Object.entries(spec)) {
    if (type === "bool") {
      if (bools.includes(k) || f.has(k)) row[k] = f.get(k) === "on" || f.get(k) === "true";
      continue;
    }
    if (type === "tags") {
      if (!f.has(k) && !f.has(`_${k}`)) continue;
      const extra = String(f.get(`${k}_extra`) ?? "").split(",");
      row[k] = [...new Set([...f.getAll(k).map(String), ...extra].map((t) => t.trim().toLowerCase()).filter(Boolean))];
      continue;
    }
    if (!f.has(k)) continue;
    const raw = String(f.get(k) ?? "").trim();
    if (raw === "") { row[k] = type === "json" ? [] : null; continue; }
    if (type === "num") row[k] = Number(raw.replace(/[$,\s]/g, ""));
    else if (type === "int") row[k] = Math.round(Number(raw));
    else if (type === "json") { try { row[k] = JSON.parse(raw); } catch { row[k] = []; } }
    else row[k] = raw;
  }
  return row;
}
