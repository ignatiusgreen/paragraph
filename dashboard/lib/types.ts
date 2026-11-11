export type LinkItem = { label: string; url: string };
export type Kind = "client" | "documentary" | "narrative";

export type Client = { id: string; name: string; qbo_id: string | null; email: string | null; phone: string | null; notes: string | null };
export type Project = {
  id: string; kind: Kind; title: string; client_id: string | null; stage: string; logline: string | null; notes: string | null;
  image_url: string | null; links: LinkItem[]; budget: number | null; hard_costs: number | null; invoiced: number | null;
  probability: number | null; expected_on: string | null; archived: boolean; created_at: string;
};
export type Todo = {
  id: string; title: string; notes: string | null; project_id: string | null; note_id: string | null; urgent: boolean;
  due_date: string | null; due_time: string | null; remind_minutes: number | null; done: boolean; done_at: string | null;
  gcal_event_id: string | null; source: string; created_at: string;
};
export type Event = {
  id: string; title: string; date: string; end_date: string | null; start_time: string | null; end_time: string | null;
  location: string | null; notes: string | null; project_id: string | null; gcal_event_id: string | null; source: string;
};
export type Note = {
  id: string; title: string; body: string | null; tags: string[]; links: LinkItem[]; image_url: string | null;
  project_id: string | null; noted_on: string; created_at: string;
};
export type Lead = {
  id: string; name: string; company: string | null; email: string | null; source: string | null; status: string;
  est_value: number | null; next_step: string | null; next_on: string | null; notes: string | null;
};
export type Contact = { id: string; email: string; name: string | null; company: string | null; tags: string[]; subscribed: boolean };
export type Gift = { id: string; year: number; recipient: string; company: string | null; gift: string | null; cost: number | null; status: string; address: string | null; notes: string | null };
export type Metric = { id: string; channel: string; metric: string; value: number; recorded_on: string; source: string };
export type Overhead = { id: string; name: string; category: "salary" | "opex"; monthly: number; notes: string | null };
export type Gear = {
  id: string; list: "inventory" | "sell" | "buy"; name: string; category: string | null; serial: string | null; condition: string | null;
  location: string | null; purchase_price: number | null; purchased_on: string | null; ask_price: number | null; sold_price: number | null;
  sell_status: string | null; ebay_url: string | null; fb_url: string | null; buy_url: string | null; est_cost: number | null;
  priority: string | null; image_url: string | null; notes: string | null;
};
export type Pin = { id: string; image_url: string; caption: string | null; source_url: string | null };
export type Section = { key: string; header_url: string | null; background_url: string | null };

export const STAGES: Record<Kind, { group?: string; value: string; label: string }[]> = {
  client: [
    { value: "bidding", label: "Bidding" },
    { value: "in_production", label: "In production" },
    { value: "post_production", label: "Post production" },
    { value: "finishing", label: "Finishing" },
    { value: "delivered", label: "Delivered" },
  ],
  documentary: [
    { group: "In development", value: "concept_dev", label: "Concept dev" },
    { group: "In development", value: "access", label: "Access" },
    { group: "In development", value: "pitch_dev", label: "Pitch dev" },
    { group: "In development", value: "pitching_finance", label: "Pitching + finance" },
    { group: "In production", value: "prep", label: "Prep" },
    { group: "In production", value: "shooting", label: "Shooting" },
    { group: "In production", value: "post", label: "Post" },
  ],
  narrative: [
    { value: "in_development", label: "In development" },
    { value: "writing", label: "Currently writing" },
  ],
};
export const stageLabel = (kind: Kind, stage: string) => STAGES[kind].find((s) => s.value === stage)?.label ?? stage;
export const KIND_PATH: Record<Kind, string> = { client: "/clients", documentary: "/documentary", narrative: "/narrative" };
export const KIND_LABEL: Record<Kind, string> = { client: "Client", documentary: "Documentary", narrative: "Narrative" };
export const NOTE_TAGS = ["film", "random", "new biz", "documentary"];
export const REMINDERS = [
  { value: "0", label: "At time of event" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "2880", label: "2 days before" },
  { value: "10080", label: "1 week before" },
];
