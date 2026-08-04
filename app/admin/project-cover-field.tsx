"use client";

import { useState } from "react";
import { MAX_UPLOAD_BYTES, prepareImageUpload, uploadPreparedImage } from "./image-upload-utils";

export default function ProjectCoverField({ existingCover }: { existingCover: string | null }) {
  const [coverUrl, setCoverUrl] = useState("");
  const [preview, setPreview] = useState(existingCover ?? "");
  const [remove, setRemove] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage(file.size > MAX_UPLOAD_BYTES ? "正在縮小並上傳作品封面……" : "正在上傳作品封面……");
    try {
      const uploadFile = await prepareImageUpload(file);
      const imageUrl = await uploadPreparedImage(uploadFile);
      setCoverUrl(imageUrl);
      setPreview(imageUrl);
      setRemove(false);
      setMessage("封面已上傳，儲存作品後就會公開顯示。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "作品封面上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  return <div className="image-field project-cover-field">
    <label>作品封面（選填）<input disabled={uploading} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])}/><small>建議使用專案截圖；圖片會保持原始比例，支援 JPG、PNG、WebP 與 GIF。</small></label>
    <input type="hidden" name="coverUrl" value={coverUrl}/>
    {existingCover && <input type="hidden" name="existingCover" value={existingCover}/>} 
    {remove && <input type="hidden" name="removeCover" value="yes"/>}
    {message && <p className="upload-message" role="status">{message}</p>}
    {preview && !remove && <div className="current-cover project-cover-preview"><img src={preview} alt="作品封面預覽"/><button type="button" className="remove-cover" onClick={() => { setRemove(true); setCoverUrl(""); setPreview(""); setMessage("封面將在儲存作品後移除。"); }}>移除封面</button></div>}
  </div>;
}
