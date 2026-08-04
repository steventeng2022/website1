"use client";

import { useState } from "react";
import { MAX_UPLOAD_BYTES, prepareImageUpload, uploadPreparedImage } from "./image-upload-utils";

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
      const uploadFile = await prepareImageUpload(file);
      const imageUrl = await uploadPreparedImage(uploadFile);
      setCoverUrl(imageUrl);
      setPreview(imageUrl);
      setRemove(false);
      setMessage("圖片已上傳，可以建立或儲存文章。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  return <div className="image-field">
    <label>封面照片<input disabled={uploading} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])}/><small>支援 A4 300 DPI（2480×3508 px）；JPG、PNG、WebP 原始檔最大 80 MB並會自動壓縮。GIF 最大 20 MB。</small></label>
    <input type="hidden" name="coverUrl" value={coverUrl}/>
    {existingCover && <input type="hidden" name="existingCover" value={existingCover}/>} 
    {remove && <input type="hidden" name="removeCover" value="yes"/>}
    {message && <p className="upload-message" role="status">{message}</p>}
    {preview && !remove && <div className="current-cover"><img src={preview} alt="封面照片預覽"/><button type="button" className="remove-cover" onClick={() => { setRemove(true); setCoverUrl(""); setPreview(""); setMessage("封面照片將在儲存文章後移除。"); }}>移除照片</button></div>}
  </div>;
}
