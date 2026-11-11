import { NextResponse } from "next/server";
import { agentAuthorized, callTool, TOOLS } from "@/lib/agent";

// Model Context Protocol endpoint (Streamable HTTP, stateless). Any MCP-capable assistant can
// connect here with a bearer token from Settings → AI access.
export const dynamic = "force-dynamic";
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };

async function handle(msg: Rpc) {
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined) return null; // notification
  switch (msg.method) {
    case "initialize":
      return ok({
        protocolVersion: VERSIONS.includes(msg.params?.protocolVersion) ? msg.params.protocolVersion : VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "paragraph-dashboard", version: "1.0.0" },
        instructions: "Tools for the Paragraph Films dashboard: to-dos, schedule, projects and notebook. Dates are YYYY-MM-DD and times HH:MM in the owner's time zone. Call get_summary first for context.",
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call":
      try {
        const result = await callTool(msg.params?.name, msg.params?.arguments ?? {});
        return ok({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        return ok({ content: [{ type: "text", text: (e as Error).message }], isError: true });
      }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  if (!(await agentAuthorized(req))) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized: send a dashboard access token as a Bearer token." } }, { status: 401 });
  }
  let body: Rpc | Rpc[];
  try { body = await req.json(); } catch { return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 }); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? NextResponse.json(out) : new NextResponse(null, { status: 202 });
  }
  const out = await handle(body);
  return out ? NextResponse.json(out) : new NextResponse(null, { status: 202 });
}

export function GET() {
  return new NextResponse("This endpoint speaks MCP over POST.", { status: 405, headers: { allow: "POST" } });
}
