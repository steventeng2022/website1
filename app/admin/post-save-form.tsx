"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export default function PostSaveForm({ mode, children }: { mode: "create" | "update"; children: ReactNode }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFailed(false);
    setMessage("正在儲存文章，請不要關閉頁面……");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("saveMode", mode);
      const response = await fetch("/admin/post-save", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string; message?: string } | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `儲存失敗（${response.status}）`);
      setMessage(payload.message || "文章已成功儲存");
      window.setTimeout(() => window.location.assign("/admin?saved=post"), 350);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "文章儲存失敗，請稍後再試");
      setSaving(false);
    }
  }

  return <form className="post-form" onSubmit={submit} aria-busy={saving}>
    {children}
    {message && <p className={`post-save-message ${failed ? "error" : ""}`} role={failed ? "alert" : "status"}>{message}</p>}
    <button className="primary-button post-save-button" type="submit" disabled={saving}>{saving ? "儲存中……" : mode === "update" ? "儲存變更 →" : "建立文章 →"}</button>
  </form>;
}
