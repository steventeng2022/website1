"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../cloudflare-auth";
import { createPost, deletePost, updatePost } from "../../db/posts";

type SiteEnv = { BUCKET: R2Bucket };

function bucket() {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: SiteEnv }).__STEVEN_SITE_ENV__?.BUCKET;
  if (!binding) throw new Error("尚未設定圖片儲存空間");
  return binding;
}

async function imageValue(formData: FormData) {
  if (formData.get("removeCover") === "yes") return null;
  const existing = String(formData.get("existingCover") ?? "") || null;
  const image = formData.get("coverImage");
  if (!(image instanceof File) || image.size === 0) return existing;
  const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);
  const extension = allowed.get(image.type);
  if (!extension) throw new Error("請上傳 JPG、PNG、WebP 或 GIF 圖片");
  if (image.size > 8 * 1024 * 1024) throw new Error("圖片大小必須小於 8 MB");
  const key = `blog/${crypto.randomUUID()}.${extension}`;
  await bucket().put(key, await image.arrayBuffer(), { httpMetadata: { contentType: image.type } });
  return `/media/${key}`;
}

async function fields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" as const : "draft" as const;
  if (!title || !slug || !content) throw new Error("標題、網址代稱與文章內容皆為必填");
  return { title, slug, excerpt, content, cover_image: await imageValue(formData), status };
}

export async function createPostAction(formData: FormData) {
  await requireAdmin();
  await createPost(await fields(formData));
  revalidatePath("/"); revalidatePath("/admin");
  redirect("/admin");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  await updatePost(Number(formData.get("id")), await fields(formData));
  revalidatePath("/"); revalidatePath("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  await deletePost(Number(formData.get("id")));
  revalidatePath("/"); revalidatePath("/admin");
}
