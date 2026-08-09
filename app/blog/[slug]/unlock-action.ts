"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPublishedPostAccess } from "../../../db/posts";
import { blogUnlockToken, safeBlogSlug, unlockCookieName, verifyAnyBlogPassword } from "../../blog-lock";

export async function unlockBlogPostAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!safeBlogSlug(slug) || password.length > 128) redirect("/blog");
  const post = await getPublishedPostAccess(slug);
  if (!post?.passwords.length || !(await verifyAnyBlogPassword(password, post.passwords))) {
    redirect(`/blog/${slug}?unlock=failed`);
  }
  const jar = await cookies();
  jar.set(unlockCookieName(post.id), await blogUnlockToken(post.id, post.passwords), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: `/blog/${slug}`,
  });
  redirect(`/blog/${slug}`);
}
