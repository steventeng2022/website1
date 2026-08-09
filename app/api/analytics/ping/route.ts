import { recordVisit } from "../../../../db/analytics";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { visitorId?: unknown; path?: unknown; pageview?: unknown };
    const visitorId = String(body.visitorId ?? "");
    const path = String(body.path ?? "/");
    if (!/^[a-f0-9-]{20,80}$/i.test(visitorId) || !path.startsWith("/") || path.length > 240) {
      return Response.json({ ok: false }, { status: 400 });
    }
    const bytes = new TextEncoder().encode(visitorId);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    await recordVisit(hash, path, body.pageview === true);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
