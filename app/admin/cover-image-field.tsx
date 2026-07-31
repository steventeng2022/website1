"use client";

import { useState } from "react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("GIF 圖片必須小於 4 MB");
    return file;
  }

  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("瀏覽器無法處理這張圖片");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error("圖片仍然太大，請先縮小至 4 MB 以下");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "cover"}.jpg`, { type: "image/jpeg" });
}

export default function CoverImageField({ existingCover }: { existingCover: string | null }) {
  const [coverUrl, setCoverUrl] = useState("");
  const [preview, setPreview] = useState(existingCover ?? "");
  const [remove, setRemove] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage(file.size > MAX_UPLOAD_BYTES ? "正在縮小並上傳圖片……" : "正在上傳圖片……");
    try {
      const uploadFile = await prepareImage(file);
      const body = new FormData();
      body.set("image", uploadFile);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const contentType = response.headers.get("content-type") ?? "";
      const result = contentType.includes("application/json")
        ? await response.json() as { url?: string; error?: string }
        : { error: response.status === 413 ? "圖片太大，請選擇較小的圖片" : (await response.text()) || "圖片上傳失敗" };
      if (!response.ok || !result.url) throw new Error(result.error || "圖片上傳失敗");
      setCoverUrl(result.url);
      setPreview(result.url);
      setRemove(false);
      setMessage("圖片已上傳，可以建立或儲存文章。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  return <div className="image-field">
    <label>封面照片<input disabled={uploading} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])}/><small>選擇後會先上傳；大型 JPG、PNG、WebP 會自動縮小。GIF 最大 4 MB。</small></label>
    <input type="hidden" name="coverUrl" value={coverUrl}/>
    {existingCover && <input type="hidden" name="existingCover" value={existingCover}/>} 
    {remove && <input type="hidden" name="removeCover" value="yes"/>}
    {message && <p className="upload-message" role="status">{message}</p>}
    {preview && !remove && <div className="current-cover"><img src={preview} alt="封面照片預覽"/><button type="button" className="remove-cover" onClick={() => { setRemove(true); setCoverUrl(""); setPreview(""); setMessage("封面照片將在儲存文章後移除。"); }}>移除照片</button></div>}
  </div>;
}
