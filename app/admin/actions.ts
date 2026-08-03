"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../cloudflare-auth";
import { createPost, createTag, deletePost, deleteTag, setPostTags, updatePost, updatePostStatus } from "../../db/posts";
import { createFriend, deleteFriend } from "../../db/friends";

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
  const tagIds = formData.getAll("tagIds").map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0);
  if (!title || !slug || !content) throw new Error("標題、網址代稱與文章內容皆為必填");
  return { post: { title, slug, excerpt, content, cover_image: imageValue(formData), status }, tagIds };
}

export async function createPostAction(formData: FormData) {
  await requireAdmin();
  const input = await fields(formData);
  const post = await createPost(input.post);
  await setPostTags(post.id, input.tagIds);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const input = await fields(formData);
  await updatePost(id, input.post);
  await setPostTags(id, input.tagIds);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin"); revalidatePath(`/blog/${input.post.slug}`);
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  await deletePost(Number(formData.get("id")));
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

export async function updatePostStatusAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = formData.get("status") === "published" ? "published" : "draft";
  if (!Number.isInteger(id) || id < 1) throw new Error("文章編號無效");
  await updatePostStatus(id, status);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin"); revalidatePath(`/blog/${String(formData.get("slug") ?? "")}`);
}

export async function createTagAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("tagName") ?? "").trim();
  const slug = String(formData.get("tagSlug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!name || !slug) throw new Error("標籤名稱與英文代稱皆為必填");
  await createTag(name, slug);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

export async function deleteTagAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("標籤編號無效");
  await deleteTag(id);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

function webUrl(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? "").trim();
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label}必須是完整的 http 或 https 網址`);
  }
}

export async function createFriendAction(formData: FormData) {
  await requireAdmin();
  const site_name = String(formData.get("siteName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!site_name || !description) throw new Error("網站名稱與介紹皆為必填");
  await createFriend({
    site_name,
    site_url: webUrl(formData.get("siteUrl"), "網站網址"),
    logo_url: webUrl(formData.get("logoUrl"), "Logo 網址"),
    description,
  });
  revalidatePath("/friends"); revalidatePath("/admin");
}

export async function deleteFriendAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Friends 網站編號無效");
  await deleteFriend(id);
  revalidatePath("/friends"); revalidatePath("/admin");
}
