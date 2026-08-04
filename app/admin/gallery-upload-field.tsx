"use client";

import { useMemo, useState } from "react";

type Item = { key:string; image_url:string; caption:string };
type ExistingItem = { id:number; image_url:string; caption:string };
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} 超過 4 MB`);
    return file;
  }
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("瀏覽器無法處理圖片");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} 仍然太大`);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type:"image/jpeg" });
}

export default function GalleryUploadField({ existingItems = [] }: { existingItems?: ExistingItem[] }) {
  const [items, setItems] = useState<Item[]>(existingItems.map((item) => ({ key:`saved-${item.id}`, image_url:item.image_url, caption:item.caption })));
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const serialized = useMemo(() => JSON.stringify(items.map(({ image_url, caption }, sort_order) => ({ image_url, caption, sort_order }))), [items]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, Math.max(0, 30 - items.length));
    if (!selected.length) { setMessage("每篇文章最多 30 張照片。"); return; }
    setUploading(true); setMessage(`正在上傳 ${selected.length} 張照片……`);
    let uploadedCount = 0;
    try {
      for (const file of selected) {
        const uploadFile = await prepareImage(file);
        const body = new FormData(); body.set("image", uploadFile);
        const response = await fetch("/admin/media", { method:"POST", body, credentials:"same-origin" });
        const contentType = response.headers.get("content-type") ?? "";
        const result = contentType.includes("application/json")
          ? await response.json() as { url?:string; error?:string }
          : { error:response.status===401 ? "登入已過期，請重新登入後台" : response.status===413 ? "圖片太大，請選擇較小的圖片" : (await response.text()) || `${file.name} 上傳失敗` };
        if (!response.ok || !result.url) throw new Error(result.error || `${file.name} 上傳失敗`);
        const added = { key:crypto.randomUUID(), image_url:result.url, caption:"" };
        setItems((current) => [...current, added]);
        uploadedCount += 1;
        setMessage(`已上傳 ${uploadedCount} / ${selected.length} 張照片……`);
      }
      setMessage(`已加入 ${uploadedCount} 張照片。可選填說明並調整順序，再儲存文章。`);
    } catch (error) { setMessage(`${uploadedCount ? `已有 ${uploadedCount} 張成功。` : ""}${error instanceof Error ? error.message : "照片上傳失敗"}`); }
    finally { setUploading(false); }
  }

  function move(index:number, direction:-1|1) {
    setItems((current) => { const next=[...current]; const target=index+direction; if (target<0 || target>=next.length) return current; [next[index],next[target]]=[next[target],next[index]]; return next; });
  }

  return <fieldset className="gallery-field">
    <legend>文章結尾相簿（選填）</legend>
    <p>可一次選取多張照片；每張都能寫一句說明，並調整顯示順序。</p>
    <label className="gallery-picker">加入照片<input disabled={uploading || items.length>=30} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void upload(event.target.files); event.currentTarget.value=""; }}/></label>
    <input type="hidden" name="galleryItems" value={serialized}/>
    {message && <p className="upload-message" role="status">{message}</p>}
    {items.length>0 && <div className="gallery-admin-grid">{items.map((item,index) => <article key={item.key} className="gallery-admin-item">
      <img src={item.image_url} alt=""/>
      <label>照片說明（選填）<textarea maxLength={300} rows={3} value={item.caption} placeholder="例如：第一次完成 Raspberry Pi 專案" onChange={(event) => setItems((current) => current.map((entry,itemIndex) => itemIndex===index ? {...entry,caption:event.target.value} : entry))}/></label>
      <div><button type="button" disabled={index===0} onClick={() => move(index,-1)}>← 上移</button><button type="button" disabled={index===items.length-1} onClick={() => move(index,1)}>下移 →</button><button type="button" className="remove-gallery-item" onClick={() => setItems((current) => current.filter((_,itemIndex) => itemIndex!==index))}>移除</button></div>
    </article>)}</div>}
  </fieldset>;
}
