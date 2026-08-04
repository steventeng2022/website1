"use client";

import { useMemo, useState } from "react";
import { prepareImageUpload, uploadPreparedImage } from "./image-upload-utils";

type Item = { key:string; image_url:string; caption:string };
type ExistingItem = { id:number; image_url:string; caption:string };

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
        const uploadFile = await prepareImageUpload(file);
        const imageUrl = await uploadPreparedImage(uploadFile);
        const added = { key:crypto.randomUUID(), image_url:imageUrl, caption:"" };
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
    <p>可一次選取多張照片；支援 A4 300 DPI（2480×3508 px），原始圖片最大 80 MB，會自動壓縮後直接存入圖片空間。每張都能寫一句說明並調整順序。</p>
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
