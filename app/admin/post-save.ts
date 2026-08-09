import { addPostPasswords, createPost, removePostPasswords, updatePost } from "../../db/posts";
import { hashBlogPassword } from "../blog-lock";

function imageValue(formData: FormData) {
  if (formData.get("removeCover") === "yes") return null;
  const existing = String(formData.get("existingCover") ?? "") || null;
  const uploaded = String(formData.get("coverUrl") ?? "");
  if (uploaded && !/^\/media\/blog\/[a-f0-9-]+\.(?:jpg|png|webp|gif)$/.test(uploaded)) throw new Error("封面圖片網址無效");
  return uploaded || existing;
}

async function fields(formData: FormData) {
  const title = String(formData.get("title") ?? "").replace(/。+/g, "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" as const : "draft" as const;
  if (!title || !slug || !content) throw new Error("標題、網址代稱與文章內容皆為必填");

  const tagIds = formData.getAll("tagIds").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  let rawGallery: unknown;
  try { rawGallery = JSON.parse(String(formData.get("galleryItems") ?? "[]")); }
  catch { throw new Error("文章相簿資料無效，請重新整理後再試"); }
  if (!Array.isArray(rawGallery) || rawGallery.length > 30) throw new Error("每篇文章最多可加入 30 張照片");
  const gallery = rawGallery.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("文章相簿資料無效");
    const image_url = String((item as { image_url?: unknown }).image_url ?? "");
    const caption = String((item as { caption?: unknown }).caption ?? "").trim();
    if (!/^\/media\/blog\/[a-f0-9-]+\.(?:jpg|png|webp|gif)$/.test(image_url)) throw new Error("相簿圖片網址無效");
    if (caption.length > 300) throw new Error("每張照片的說明最多 300 個字");
    return { image_url, caption, sort_order: index };
  });

  let rawPasswords: unknown;
  try { rawPasswords = JSON.parse(String(formData.get("newBlogPasswords") ?? "[]")); }
  catch { throw new Error("文章密碼資料無效，請重新整理後再試"); }
  if (!Array.isArray(rawPasswords) || rawPasswords.length > 20) throw new Error("每篇文章最多可新增 20 組密碼");
  const newPasswords = rawPasswords.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("文章密碼資料無效");
    const password = String((item as { password?: unknown }).password ?? "");
    const label = String((item as { label?: unknown }).label ?? "").trim() || `密碼 ${index + 1}`;
    if (password.length < 4 || password.length > 128) throw new Error(`第 ${index + 1} 組文章密碼需為 4～128 個字元`);
    if (label.length > 40) throw new Error(`第 ${index + 1} 組密碼名稱最多 40 個字`);
    return { label, password };
  });
  const removePasswordIds = formData.getAll("removeBlogPasswordIds").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return { post: { title, slug, excerpt, content, cover_image: imageValue(formData), status }, tagIds, gallery, newPasswords, removePasswordIds };
}

async function hashedPasswords(entries: { label: string; password: string }[]) {
  const result: { label: string; password_hash: string }[] = [];
  for (const entry of entries) {
    result.push({ label: entry.label, password_hash: await hashBlogPassword(entry.password) });
  }
  return result;
}

export async function saveNewPost(formData: FormData) {
  const { post, tagIds, gallery, newPasswords } = await fields(formData);
  const passwords = await hashedPasswords(newPasswords);
  const postId = await createPost({ ...post, password_hash: null }, tagIds, gallery);
  if (!postId) throw new Error("文章已建立，但無法取得文章編號，請重新整理後再試");
  await addPostPasswords(postId, passwords);
}

export async function saveExistingPost(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("文章編號無效");
  const { post, tagIds, gallery, newPasswords, removePasswordIds } = await fields(formData);
  const passwords = await hashedPasswords(newPasswords);
  await updatePost(id, post, tagIds, gallery);
  await removePostPasswords(id, removePasswordIds);
  await addPostPasswords(id, passwords);
}
