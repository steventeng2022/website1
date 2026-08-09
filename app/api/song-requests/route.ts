import { createSongRequest } from "../../../db/music";

function text(value:unknown,max:number){return String(value??"").replace(/[<>]/g,"").trim().slice(0,max)}

export async function POST(request:Request) {
  try {
    const body=await request.json() as Record<string,unknown>;
    if(text(body.website,10)) return Response.json({ok:true});
    const title=text(body.title,120),artist=text(body.artist,120),message=text(body.message,500);
    if(!title||!artist) return Response.json({error:"請填寫歌名與歌手"},{status:400});
    let link_url:string|null=null;
    const raw=text(body.link,500);
    if(raw){const url=new URL(raw);if(!["http:","https:"].includes(url.protocol))throw new Error("歌曲連結格式不正確");link_url=url.toString()}
    const identity=`${request.headers.get("cf-connecting-ip")??"unknown"}|${request.headers.get("user-agent")??""}`;
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(identity));
    const requester_hash=Array.from(new Uint8Array(digest)).slice(0,16).map(v=>v.toString(16).padStart(2,"0")).join("");
    await createSongRequest({title,artist,link_url,message,requester_hash});
    return Response.json({ok:true});
  } catch(error) {
    return Response.json({error:error instanceof Error?error.message:"歌曲推薦送出失敗"},{status:400});
  }
}
