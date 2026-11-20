"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import { getMe } from "@/lib/data";
import { hasServiceKey } from "@/lib/integrations";
import { driveTrash, driveUploadFromUrl, getGoogle, moodFolder } from "@/lib/google";
import { BROWSER_UA, linkPreview, publicUrl } from "@/lib/link-preview";
import type { MoodItem } from "@/lib/types";

async function guard() {
  if (!(await getMe())) throw new Error("Not signed in");
  return db();
}
const refresh = (projectId: string) => revalidatePath(`/projects/${projectId}`);
const fileName = (item: MoodItem) => {
  const ext = (item.image_url?.split("?")[0].match(/\.(jpe?g|png|gif|webp|avif|heic)$/i)?.[1] ?? "jpg").toLowerCase();
  const base = (item.title || (item.source_url ? new URL(item.source_url).hostname : "image")).replace(/[\\/:*?"<>|\n\r]+/g, " ").trim().slice(0, 80) || "image";
  return `${base}.${ext}`;
};

/** Copy a board item's image into the project's Google Drive folder, after the response has been sent. */
function mirrorToDrive(item: MoodItem) {
  if (!item.image_url || !hasServiceKey()) return;
  after(async () => {
    try {
      const folder = await moodFolder(item.project_id);
      if (!folder) return;
      const id = await driveUploadFromUrl(folder, fileName(item), item.image_url!, item.source_url ? `From ${item.source_url}` : "Mood board image");
      await adminDb().from("mood_items").update({ drive_file_id: id }).eq("id", item.id);
    } catch (e) {
      console.warn("Mood board: Drive copy failed:", (e as Error).message);
    }
  });
}

/** Save a copy of a remote image in our own storage, so it keeps showing if the site blocks embedding or takes it down. */
async function keepCopy(projectId: string, url: string): Promise<string> {
  if (!hasServiceKey()) return url;
  try {
    const u = new URL(url);
    if (!publicUrl(u)) return url;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000), headers: { "user-agent": BROWSER_UA, accept: "image/*" } });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !type.startsWith("image/")) return url;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > 15_000_000) return url;
    const ext = (type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `mood/${projectId}/${crypto.randomUUID()}.${ext}`;
    const store = adminDb().storage.from("media");
    const { error } = await store.upload(path, bytes, { contentType: type, cacheControl: "31536000" });
    return error ? url : store.getPublicUrl(path).data.publicUrl;
  } catch { return url; }
}

type Place = { x: number; y: number; w?: number; z?: number };
const num = (v: unknown, fallback: number, min: number, max: number) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback);

/** An image already uploaded to storage (pasted, dropped or picked) becomes a board item. */
export async function addMoodImage(projectId: string, imageUrl: string, title: string | null, place: Place): Promise<{ item?: MoodItem; error?: string }> {
  const supabase = await guard();
  if (!/^https?:\/\//.test(imageUrl)) return { error: "That image address isn't valid." };
  const { data: rows, error } = await supabase.from("mood_items").insert({
    project_id: projectId, kind: "image", image_url: imageUrl, title: title?.slice(0, 200) || null,
    x: num(place.x, 40, 0, 1000), y: num(place.y, 40, 0, 20000), w: num(place.w, 240, 80, 1000), z: num(place.z, 1, 1, 100000),
  }).select();
  const data = rows?.[0] as MoodItem | undefined;
  if (error || !data) return { error: error?.message ?? "Couldn't add the image." };
  mirrorToDrive(data as MoodItem);
  refresh(projectId);
  return { item: data as MoodItem };
}

/** A pasted or typed link: an image address goes straight on the board; a web page is shown by its preview image and title. */
export async function addMoodLink(projectId: string, rawUrl: string, place: Place): Promise<{ item?: MoodItem; error?: string }> {
  const supabase = await guard();
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { return { error: "That doesn't look like a web address." }; }
  if (!publicUrl(url)) return { error: "That address can't be used." };

  const found = await linkPreview(url);
  const { kind, title } = found;
  let image = found.image;
  if (image) image = await keepCopy(projectId, image);
  const { data: rows, error } = await supabase.from("mood_items").insert({
    project_id: projectId, kind, image_url: image, source_url: kind === "link" ? url.href : null, title: title?.slice(0, 200) ?? null,
    x: num(place.x, 40, 0, 1000), y: num(place.y, 40, 0, 20000), w: num(place.w, 260, 80, 1000), z: num(place.z, 1, 1, 100000),
  }).select();
  const data = rows?.[0] as MoodItem | undefined;
  if (error || !data) return { error: error?.message ?? "Couldn't add the link." };
  mirrorToDrive(data as MoodItem);
  refresh(projectId);
  return { item: data as MoodItem };
}

/** Save where an item sits, how wide it is, and its stacking order. */
export async function placeMoodItem(id: string, place: Place) {
  const supabase = await guard();
  await supabase.from("mood_items").update({
    x: num(place.x, 40, 0, 1000), y: num(place.y, 40, 0, 20000),
    ...(place.w != null ? { w: num(place.w, 240, 80, 1000) } : {}), ...(place.z != null ? { z: num(place.z, 1, 1, 100000) } : {}),
  }).eq("id", id);
}

export async function deleteMoodItem(id: string, projectId: string) {
  const supabase = await guard();
  const { data } = await supabase.from("mood_items").select("drive_file_id").eq("id", id).maybeSingle();
  await supabase.from("mood_items").delete().eq("id", id);
  if (data?.drive_file_id) after(() => driveTrash(data.drive_file_id));
  refresh(projectId);
}

/** Make the Drive folder now (it is otherwise created when the first image is added) and copy over anything not there yet. */
export async function syncMoodFolder(projectId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await guard();
  if (!(await getGoogle())) return { error: "Connect Google in Settings first." };
  try {
    const folder = await moodFolder(projectId);
    if (!folder) return { error: "The Drive folder couldn't be created." };
    const { data } = await supabase.from("mood_items").select("*").eq("project_id", projectId).is("drive_file_id", null).not("image_url", "is", null);
    for (const item of (data ?? []) as MoodItem[]) {
      try {
        const id = await driveUploadFromUrl(folder, fileName(item), item.image_url!, item.source_url ? `From ${item.source_url}` : "Mood board image");
        await supabase.from("mood_items").update({ drive_file_id: id }).eq("id", item.id);
      } catch { /* skip an image that can't be fetched */ }
    }
    refresh(projectId);
    return { url: `https://drive.google.com/drive/folders/${folder}` };
  } catch (e) {
    return { error: `Google Drive: ${(e as Error).message}` };
  }
}

/** Look again for a link's poster image and title (for cards that were added without one). */
export async function refreshMoodLink(id: string, projectId: string): Promise<{ item?: MoodItem; error?: string }> {
  const supabase = await guard();
  const { data: before } = await supabase.from("mood_items").select("*").eq("id", id).maybeSingle();
  const item = before as MoodItem | null;
  if (!item?.source_url) return { error: "That item isn't a link." };
  let url: URL;
  try { url = new URL(item.source_url); } catch { return { error: "That link isn't valid." }; }
  if (!publicUrl(url)) return { error: "That address can't be used." };
  const found = await linkPreview(url);
  if (!found.image) return { error: "That site doesn't share a preview image. Paste a screenshot instead." };
  const image = await keepCopy(projectId, found.image);
  const { data: rows, error } = await supabase.from("mood_items").update({ image_url: image, title: found.title?.slice(0, 200) ?? item.title }).eq("id", id).select();
  const data = rows?.[0] as MoodItem | undefined;
  if (error || !data) return { error: error?.message ?? "Couldn't update the link." };
  if (!item.drive_file_id) mirrorToDrive(data);
  refresh(projectId);
  return { item: data };
}
