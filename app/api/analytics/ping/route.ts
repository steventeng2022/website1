import { recordVisit, type VisitorInfo } from "../../../../db/analytics";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { visitorId?: unknown; path?: unknown; pageview?: unknown; visitId?: unknown; durationSeconds?: unknown; info?: unknown };
    const visitorId = String(body.visitorId ?? "");
    const path = String(body.path ?? "/");
    if (!/^[a-f0-9-]{20,80}$/i.test(visitorId) || !path.startsWith("/") || path.length > 240) {
      return Response.json({ ok: false }, { status: 400 });
    }
    const bytes = new TextEncoder().encode(visitorId);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const rawInfo = body.info && typeof body.info === "object" ? body.info as Record<string, unknown> : {};
    const stringValue = (key: string) => typeof rawInfo[key] === "string" ? String(rawInfo[key]) : undefined;
    const requestWithCf = request as Request & { cf?: { country?: string } };
    const rawIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";
    const ipAddress = /^[0-9a-f:.]{3,64}$/i.test(rawIp) ? rawIp : "Unavailable";
    const info: VisitorInfo = {
      ipAddress,
      browser:stringValue("browser"), os:stringValue("os"), device:stringValue("device"), language:stringValue("language"),
      timezone:stringValue("timezone"), country:requestWithCf.cf?.country,
      screenSize:stringValue("screenSize"), viewportSize:stringValue("viewportSize"), colorScheme:stringValue("colorScheme"),
      connection:stringValue("connection"), touch:rawInfo.touch === true, referrerHost:stringValue("referrerHost"),
    };
    const visitId = await recordVisit(hash, path, body.pageview === true, Number(body.visitId) || null, Number(body.durationSeconds) || 0, info);
    return Response.json({ ok: true, visitId }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
