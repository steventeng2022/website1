"use client";

import { useState } from "react";
import { uploadPreparedImage } from "./image-upload-utils";

async function uploadAudio(file:File) {
  if (file.size>50*1024*1024) throw new Error("音訊檔案必須小於 50 MB");
  const response=await fetch("/admin/music-media",{method:"POST",body:file,credentials:"same-origin",headers:{"content-type":file.type,"x-upload-name":encodeURIComponent(file.name)}});
  const result=await response.json() as {url?:string;error?:string};
  if(!response.ok||!result.url) throw new Error(result.error||"音訊上傳失敗");
  return result.url;
}

export default function MusicUploadField({existingAudio="",existingCover=""}:{existingAudio?:string;existingCover?:string}) {
  const [audioUrl,setAudioUrl]=useState(existingAudio);
  const [coverUrl,setCoverUrl]=useState(existingCover);
  const [message,setMessage]=useState("");
  const [uploading,setUploading]=useState(false);
  async function audio(file?:File){if(!file)return;setUploading(true);setMessage("正在上傳音訊……");try{setAudioUrl(await uploadAudio(file));setMessage("音訊已上傳，請儲存歌曲設定。");}catch(error){setMessage(error instanceof Error?error.message:"音訊上傳失敗");}finally{setUploading(false)}}
  async function cover(file?:File){if(!file)return;setUploading(true);setMessage("正在上傳封面……");try{setCoverUrl(await uploadPreparedImage(file));setMessage("封面已上傳，請儲存歌曲設定。");}catch(error){setMessage(error instanceof Error?error.message:"封面上傳失敗");}finally{setUploading(false)}}
  return <div className="music-media-fields">
    <label>歌曲音訊<input disabled={uploading} required={!audioUrl} type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac,audio/webm" onChange={(e)=>audio(e.target.files?.[0])}/><small>MP3、OGG、WAV、M4A、AAC 或 WebM，最大 50 MB；請只上傳你有權使用的音訊。</small></label>
    <input type="hidden" name="audioUrl" value={audioUrl}/>
    {audioUrl&&<p className="music-file-ready">✓ 已有音訊檔</p>}
    <label>歌曲封面（選填）<input disabled={uploading} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e)=>cover(e.target.files?.[0])}/></label>
    <input type="hidden" name="coverUrl" value={coverUrl}/>
    {coverUrl&&<div className="music-cover-preview"><img src={coverUrl} alt="歌曲封面預覽"/><button type="button" onClick={()=>setCoverUrl("")}>移除封面</button></div>}
    {message&&<p className="upload-message" role="status">{message}</p>}
  </div>;
}
