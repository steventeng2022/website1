/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const ADMIN_EMAIL = "steventeng2022@gmail.com";
const UPLOAD_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const AUDIO_UPLOAD_TYPES = new Map([
  ["audio/mpeg", "mp3"], ["audio/ogg", "ogg"], ["audio/wav", "wav"],
  ["audio/x-wav", "wav"], ["audio/mp4", "m4a"], ["audio/aac", "aac"], ["audio/webm", "webm"],
]);

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function uploadMedia(request: Request, env: Env) {
  if (request.method !== "POST") return json({ error: "不支援此請求方法" }, { status: 405, headers: { allow: "POST" } });
  const email = (request.headers.get("cf-access-authenticated-user-email") ?? "").toLowerCase();
  if (email !== ADMIN_EMAIL) return json({ error: "登入已過期，請重新登入後台" }, { status: 401 });

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
  const extension = UPLOAD_TYPES.get(contentType);
  if (!extension) return json({ error: "請上傳 JPG、PNG、WebP 或 GIF 圖片" }, { status: 415 });

  const maxBytes = contentType === "image/gif" ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) return json({ error: `處理後的圖片必須小於 ${contentType === "image/gif" ? 20 : 8} MB` }, { status: 413 });
  if (!request.body) return json({ error: "沒有收到圖片內容" }, { status: 400 });

  const key = `blog/${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, request.body, { httpMetadata: { contentType } });
  return json({ url: `/media/${key}` }, { status: 201 });
}

async function uploadMusic(request: Request, env: Env) {
  if (request.method !== "POST") return json({ error: "不支援此請求方法" }, { status: 405, headers: { allow: "POST" } });
  const email = (request.headers.get("cf-access-authenticated-user-email") ?? "").toLowerCase();
  if (email !== ADMIN_EMAIL) return json({ error: "登入已過期，請重新登入後台" }, { status: 401 });
  const contentType = request.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase() ?? "";
  const extension = AUDIO_UPLOAD_TYPES.get(contentType);
  if (!extension) return json({ error: "請上傳 MP3、OGG、WAV、M4A、AAC 或 WebM 音訊" }, { status: 415 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 50 * 1024 * 1024) return json({ error: "音訊檔案必須小於 50 MB" }, { status: 413 });
  if (!request.body) return json({ error: "沒有收到音訊內容" }, { status: 400 });
  const key = `music/${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, request.body, { httpMetadata: { contentType } });
  return json({ url: `/media/${key}` }, { status: 201 });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: Env }).__STEVEN_SITE_ENV__ = env;
    const url = new URL(request.url);

    // Keep uploads outside the app router. Passing raw bytes straight to R2
    // avoids multipart/body parser limits and extra memory copies.
    if (url.pathname === "/admin/media") {
      try {
        return await uploadMedia(request, env);
      } catch (error) {
        console.error(JSON.stringify({ event: "media_upload_failed", message: error instanceof Error ? error.message : String(error) }));
        return json({ error: error instanceof Error ? error.message : "圖片上傳失敗" }, { status: 500 });
      }
    }
    if (url.pathname === "/admin/music-media") {
      try { return await uploadMusic(request, env); }
      catch (error) {
        console.error(JSON.stringify({ event:"music_upload_failed",message:error instanceof Error?error.message:String(error) }));
        return json({ error:error instanceof Error?error.message:"音訊上傳失敗" },{status:500});
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    if (url.pathname.startsWith("/media/")) {
      const key = decodeURIComponent(url.pathname.slice("/media/".length));
      if ((!key.startsWith("blog/") && !key.startsWith("music/")) || key.includes("..")) return new Response("Not found", { status: 404 });
      const rangeHeader = key.startsWith("music/") ? request.headers.get("range") : null;
      let status = 200;
      let object;
      let contentRange:string|null=null;
      if (rangeHeader) {
        const head=await env.BUCKET.head(key);
        const match=/^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
        if(!head||!match) return new Response("Range Not Satisfiable",{status:416});
        const start=Number(match[1]);
        const end=match[2]?Math.min(Number(match[2]),head.size-1):head.size-1;
        if(start>end||start>=head.size) return new Response("Range Not Satisfiable",{status:416,headers:{"content-range":`bytes */${head.size}`}});
        object=await env.BUCKET.get(key,{range:{offset:start,length:end-start+1}});
        status=206; contentRange=`bytes ${start}-${end}/${head.size}`;
      } else object = await env.BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("x-content-type-options", "nosniff");
      if(key.startsWith("music/")) headers.set("accept-ranges","bytes");
      if(contentRange) headers.set("content-range",contentRange);
      return new Response(object.body, { status, headers });
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
