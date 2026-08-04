"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../cloudflare-auth";
import { createPost, deletePost, updatePost, updatePostStatus } from "../../db/posts";
import { createFriend, deleteFriend } from "../../db/friends";
import { createExperience, deleteExperience, moveExperience, updateExperience } from "../../db/experiences";
import { createTag, deleteTag } from "../../db/tags";
import { createContact, createProject, createSkill, deleteContact, deleteProject, deleteSkill, moveSiteItem, updateContact, updateProject, updateSiteProfile, updateSkill } from "../../db/site-content";

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
  const tagIds = formData.getAll("tagIds").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  let rawGallery: unknown;
  try { rawGallery = JSON.parse(String(formData.get("galleryItems") ?? "[]")); } catch { throw new Error("文章相簿資料無效，請重新整理後再試"); }
  if (!Array.isArray(rawGallery) || rawGallery.length > 30) throw new Error("每篇文章最多可加入 30 張照片");
  const gallery = rawGallery.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("文章相簿資料無效");
    const image_url = String((item as { image_url?: unknown }).image_url ?? "");
    const caption = String((item as { caption?: unknown }).caption ?? "").trim();
    if (!/^\/media\/blog\/[a-f0-9-]+\.(?:jpg|png|webp|gif)$/.test(image_url)) throw new Error("相簿圖片網址無效");
    if (caption.length > 300) throw new Error("每張照片的說明最多 300 個字");
    return { image_url, caption, sort_order: index };
  });
  return { post: { title, slug, excerpt, content, cover_image: imageValue(formData), status }, tagIds, gallery };
}

export async function createPostAction(formData: FormData) {
  await requireAdmin();
  const { post, tagIds, gallery } = await fields(formData);
  await createPost(post, tagIds, gallery);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  const { post, tagIds, gallery } = await fields(formData);
  await updatePost(Number(formData.get("id")), post, tagIds, gallery);
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  await deletePost(Number(formData.get("id")));
  revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin");
}

export async function createTagAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
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

export async function updatePostStatusAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = formData.get("status") === "published" ? "published" : "draft";
  if (!Number.isInteger(id) || id < 1) throw new Error("文章編號無效");
  await updatePostStatus(id, status);
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath(`/blog/${String(formData.get("slug") ?? "")}`);
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

function optionalWebUrl(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? webUrl(text, "相關連結") : null;
}

function experienceFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const organization = String(formData.get("organization") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const start_date = String(formData.get("startDate") ?? "").trim();
  const end_date = String(formData.get("endDate") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const sort_order = Number(formData.get("sortOrder") ?? 0);
  if (!title || !start_date || !description) throw new Error("經歷標題、開始日期與介紹皆為必填");
  if (end_date && end_date < start_date) throw new Error("結束日期不能早於開始日期");
  if (!Number.isInteger(sort_order)) throw new Error("排序必須是整數");
  return { title, organization, location, start_date, end_date, description, link_url: optionalWebUrl(formData.get("linkUrl")), sort_order };
}

export async function createExperienceAction(formData: FormData) {
  await requireAdmin();
  await createExperience(experienceFields(formData));
  revalidatePath("/experience"); revalidatePath("/admin");
}

export async function updateExperienceAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("經歷編號無效");
  await updateExperience(id, experienceFields(formData));
  revalidatePath("/experience"); revalidatePath("/admin");
}

export async function deleteExperienceAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("經歷編號無效");
  await deleteExperience(id);
  revalidatePath("/experience"); revalidatePath("/admin");
}

export async function moveExperienceAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const direction = formData.get("direction") === "down" ? "down" : "up";
  if (!Number.isInteger(id) || id < 1) throw new Error("經歷編號無效");
  await moveExperience(id, direction);
  revalidatePath("/experience"); revalidatePath("/admin");
}

function requiredText(formData: FormData, name: string, label: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) throw new Error(`${label}為必填`);
  return value;
}

function itemId(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("資料編號無效");
  return id;
}

function orderValue(formData: FormData) {
  const value = Number(formData.get("sortOrder") ?? 0);
  if (!Number.isInteger(value)) throw new Error("排序必須是整數");
  return value;
}

function flexibleUrl(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(text)) return text;
  return webUrl(text, "連結");
}

export async function updateSiteProfileAction(formData: FormData) {
  await requireAdmin();
  await updateSiteProfile({
    about_heading_zh: requiredText(formData,"aboutHeadingZh","關於我中文標題"),
    about_heading_en: requiredText(formData,"aboutHeadingEn","About 英文標題"),
    about_body_zh: requiredText(formData,"aboutBodyZh","關於我中文內容"),
    about_body_en: requiredText(formData,"aboutBodyEn","About 英文內容"),
    skills_heading_zh: requiredText(formData,"skillsHeadingZh","技能中文標題"),
    skills_heading_en: requiredText(formData,"skillsHeadingEn","Skills 英文標題"),
    contact_heading_zh: requiredText(formData,"contactHeadingZh","聯絡中文標題"),
    contact_heading_en: requiredText(formData,"contactHeadingEn","Contact 英文標題"),
    contact_body_zh: requiredText(formData,"contactBodyZh","聯絡中文內容"),
    contact_body_en: requiredText(formData,"contactBodyEn","Contact 英文內容"),
  });
  revalidatePath("/"); revalidatePath("/admin");
}

function projectFields(formData: FormData) {
  return {
    title_zh: requiredText(formData,"titleZh","中文作品名稱"),
    title_en: requiredText(formData,"titleEn","英文作品名稱"),
    description_zh: requiredText(formData,"descriptionZh","中文作品介紹"),
    description_en: requiredText(formData,"descriptionEn","英文作品介紹"),
    tag: requiredText(formData,"tag","作品分類"),
    link_url: optionalWebUrl(formData.get("linkUrl")), sort_order: orderValue(formData),
  };
}
export async function createProjectAction(formData:FormData) { await requireAdmin(); await createProject(projectFields(formData)); revalidatePath("/"); revalidatePath("/admin"); }
export async function updateProjectAction(formData:FormData) { await requireAdmin(); await updateProject(itemId(formData),projectFields(formData)); revalidatePath("/"); revalidatePath("/admin"); }
export async function deleteProjectAction(formData:FormData) { await requireAdmin(); await deleteProject(itemId(formData)); revalidatePath("/"); revalidatePath("/admin"); }

function skillFields(formData: FormData) {
  return { name_zh:requiredText(formData,"nameZh","中文技能名稱"), name_en:requiredText(formData,"nameEn","英文技能名稱"), description_zh:requiredText(formData,"descriptionZh","中文技能介紹"), description_en:requiredText(formData,"descriptionEn","英文技能介紹"), sort_order:orderValue(formData) };
}
export async function createSkillAction(formData:FormData) { await requireAdmin(); await createSkill(skillFields(formData)); revalidatePath("/"); revalidatePath("/admin"); }
export async function updateSkillAction(formData:FormData) { await requireAdmin(); await updateSkill(itemId(formData),skillFields(formData)); revalidatePath("/"); revalidatePath("/admin"); }
export async function deleteSkillAction(formData:FormData) { await requireAdmin(); await deleteSkill(itemId(formData)); revalidatePath("/"); revalidatePath("/admin"); }

function contactFields(formData:FormData) { return { label:requiredText(formData,"label","聯絡方式名稱"), value:requiredText(formData,"value","顯示內容"), link_url:flexibleUrl(formData.get("linkUrl")), sort_order:orderValue(formData) }; }
export async function createContactAction(formData:FormData) { await requireAdmin(); await createContact(contactFields(formData)); revalidatePath("/"); revalidatePath("/admin"); }
export async function updateContactAction(formData:FormData) { await requireAdmin(); await updateContact(itemId(formData),contactFields(formData)); revalidatePath("/"); revalidatePath("/admin"); }
export async function deleteContactAction(formData:FormData) { await requireAdmin(); await deleteContact(itemId(formData)); revalidatePath("/"); revalidatePath("/admin"); }

export async function moveSiteItemAction(formData:FormData) {
  await requireAdmin();
  const rawKind = String(formData.get("kind"));
  if (rawKind !== "project" && rawKind !== "skill" && rawKind !== "contact") throw new Error("資料類型無效");
  await moveSiteItem(rawKind,itemId(formData),formData.get("direction") === "down" ? "down" : "up");
  revalidatePath("/"); revalidatePath("/admin");
}
