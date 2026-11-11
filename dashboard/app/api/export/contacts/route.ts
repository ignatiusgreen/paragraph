import { NextResponse } from "next/server";
import { getMe } from "@/lib/data";
import { db } from "@/lib/supabase/server";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  if (!(await getMe())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await (await db()).from("contacts").select("*").eq("subscribed", true).order("email");
  const csv = ["email,name,company,tags", ...(data ?? []).map((c) => [c.email, c.name, c.company, (c.tags ?? []).join("; ")].map(cell).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="paragraph-newsletter.csv"' } });
}
