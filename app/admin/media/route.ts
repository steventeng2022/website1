import { requireAdmin } from "../../cloudflare-auth";

type SiteEnv = { BUCKET?: R2Bucket };

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "登入已過期，請重新登入後台" }, { status: 401 });
  }

  try {
    const bucket = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: SiteEnv }).__STEVEN_SITE_ENV__?.BUCKET;
    if (!bucket) return Response.json({ error: "尚未設定圖片儲存空間" }, { status: 503 });

    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
    const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);
    const extension = allowed.get(contentType);
    if (!extension) return Response.json({ error: "請上傳 JPG、PNG、WebP 或 GIF 圖片" }, { status: 415 });
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    const maxBytes = contentType === "image/gif" ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    if (contentLength > maxBytes) return Response.json({ error: `處理後的圖片必須小於 ${contentType === "image/gif" ? 20 : 8} MB` }, { status: 413 });
    if (!request.body) return Response.json({ error: "請選擇圖片" }, { status: 400 });

    const key = `blog/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, request.body, { httpMetadata: { contentType } });
    return Response.json({ url: `/media/${key}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "圖片上傳失敗" }, { status: 500 });
  }
}
