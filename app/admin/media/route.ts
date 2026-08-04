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

    const image = (await request.formData()).get("image");
    if (!(image instanceof File) || image.size === 0) return Response.json({ error: "請選擇圖片" }, { status: 400 });
    const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);
    const extension = allowed.get(image.type);
    if (!extension) return Response.json({ error: "請上傳 JPG、PNG、WebP 或 GIF 圖片" }, { status: 415 });
    if (image.size > 16 * 1024 * 1024) return Response.json({ error: "圖片大小必須小於 16 MB；A4 300 DPI 圖片會在上傳前自動壓縮" }, { status: 413 });

    const key = `blog/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
    return Response.json({ url: `/media/${key}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "圖片上傳失敗" }, { status: 500 });
  }
}
