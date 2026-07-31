"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../cloudflare-auth";
import { createPost, deletePost, updatePost } from "../../db/posts";

function imageValue(formData: FormData) {
  if (formData.get("removeCover") === "yes") return null;
  const existing = String(formData.get("existingCover") ?? "") || null;
  const uploaded = String(formData.get("coverUrl") ?? "");
  if (uploaded && !/^\/media\/blog\/[a-f0-9-]+\.(?:jpg|png|webp|gif)$/.test(uploaded)) {
    throw new Error("封面圖片網址無效");
  }
  return uploaded || existing;
}

async function fields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" as const : "draft" as const;
  if (!title || !slug || !content) throw new Error("標題、網址代稱與文章內容皆為必填");
  return { title, slug, excerpt, content, cover_image: imageValue(formData), status };
}

export async function createPostAction(formData: FormData) {
  await requireAdmin();
  await createPost(await fields(formData));
  revalidatePath("/"); revalidatePath("/admin");
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
