import { NextResponse } from "next/server";
import { agentAuthorized, callTool, TOOLS } from "@/lib/agent";

// Plain REST for assistants that don't speak MCP:
//   GET  /api/agent              → the list of tools and their inputs
//   POST /api/agent/<tool_name>  → run one, with the inputs as a JSON body
export const dynamic = "force-dynamic";
const denied = () => NextResponse.json({ error: "Unauthorized: send a dashboard access token as a Bearer token." }, { status: 401 });

export async function GET(req: Request) {
  if (!(await agentAuthorized(req))) return denied();
  return NextResponse.json({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, input: inputSchema })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ tool?: string[] }> }) {
  if (!(await agentAuthorized(req))) return denied();
  const name = (await params).tool?.[0];
  if (!name) return NextResponse.json({ error: "Name a tool: POST /api/agent/<tool_name>" }, { status: 400 });
  const args = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ result: await callTool(name, args) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
