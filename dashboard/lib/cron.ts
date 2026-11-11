import "server-only";
import type { NextRequest } from "next/server";

export function cronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
