import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../cloudflare-auth";
import { saveExistingPost, saveNewPost } from "../post-save";
import { logAdminActivity } from "../../../db/analytics";

export async function POST(request: Request) {
  let email = "";
  try {
    email = await requireAdmin();
  } catch {
    return Response.json({ ok: false, error: "登入已過期，請重新登入後台" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const mode = formData.get("saveMode") === "update" ? "update" : "create";
    if (mode === "update") await saveExistingPost(formData);
    else await saveNewPost(formData);
    await logAdminActivity(email, mode === "update" ? "更新文章" : "建立文章", String(formData.get("title") ?? ""));
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin");
    return Response.json({ ok: true, message: mode === "update" ? "文章已成功儲存" : "文章已成功建立" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章儲存失敗，請稍後再試";
    const conflict = /UNIQUE|slug/i.test(message);
    return Response.json({ ok: false, error: conflict ? "網址代稱已被其他文章使用，請換一個名稱" : message }, { status: conflict ? 409 : 400 });
  }
}
