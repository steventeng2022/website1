"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../cloudflare-auth";
import { createPost, deletePost, updatePost } from "../../db/posts";

function fields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" as const : "draft" as const;
  if (!title || !slug || !content) throw new Error("Title, slug and content are required");
  return { title, slug, excerpt, content, status };
}

export async function createPostAction(formData: FormData) {
  await requireAdmin();
  await createPost(fields(formData));
  revalidatePath("/"); revalidatePath("/admin");
  redirect("/admin");
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  await updatePost(Number(formData.get("id")), fields(formData));
  revalidatePath("/"); revalidatePath("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  await deletePost(Number(formData.get("id")));
  revalidatePath("/"); revalidatePath("/admin");
}
