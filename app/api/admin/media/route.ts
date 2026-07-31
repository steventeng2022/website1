import { requireAdmin } from "../../../cloudflare-auth";

type SiteEnv = { BUCKET?: R2Bucket };

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const bucket = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: SiteEnv }).__STEVEN_SITE_ENV__?.BUCKET;
    if (!bucket) return Response.json({ error: "尚未設定圖片儲存空間" }, { status: 503 });

    const image = (await request.formData()).get("image");
    if (!(image instanceof File) || image.size === 0) return Response.json({ error: "請選擇圖片" }, { status: 400 });
    const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);
    const extension = allowed.get(image.type);
    if (!extension) return Response.json({ error: "請上傳 JPG、PNG、WebP 或 GIF 圖片" }, { status: 415 });
    if (image.size > 8 * 1024 * 1024) return Response.json({ error: "圖片大小必須小於 8 MB" }, { status: 413 });

    const key = `blog/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
    return Response.json({ url: `/media/${key}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "圖片上傳失敗" }, { status: 500 });
  }
}
