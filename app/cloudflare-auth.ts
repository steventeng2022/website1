import { headers } from "next/headers";

export const ADMIN_EMAIL = "steventeng2022@gmail.com";

export async function getAccessEmail() {
  const h = await headers();
  return (h.get("cf-access-authenticated-user-email") ?? "").toLowerCase();
}

export async function requireAdmin() {
  const email = await getAccessEmail();
  if (email !== ADMIN_EMAIL) throw new Error("Not authorized");
  return email;
}
