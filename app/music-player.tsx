type Track={id:number;title:string;artist:string;src:string;cover:string|null};
export default function MusicPlayer({tracks}:{tracks:Track[]}) {
  return (
    <>
      <aside className="music-player" id="site-music-player" aria-label="網站音樂播放器" data-site-tracks={JSON.stringify(tracks)}>
        <button className="music-player__toggle" type="button" data-music-toggle aria-label="開啟或關閉音樂播放器">
          <img className="music-player__cover" data-music-cover alt="音樂播放器" />
        </button>
        <section className="music-player__panel" aria-label="播放控制與播放清單">
          <div className="music-player__now">
            <div>
              <div className="music-player__title" data-music-title>尚未加入音樂</div>
              <div className="music-player__artist" data-music-artist>按＋新增音訊連結</div>
            </div>
            <div className="music-player__controls">
              <button className="music-player__button" type="button" data-music-add aria-label="新增音樂">＋</button>
              <button className="music-player__button" type="button" data-music-shuffle aria-label="開啟隨機播放" aria-pressed="false">⇄</button>
              <button className="music-player__button" type="button" data-music-prev aria-label="上一首">‹</button>
              <button className="music-player__button" type="button" data-music-play aria-label="播放音樂">▶</button>
              <button className="music-player__button" type="button" data-music-next aria-label="下一首">›</button>
              <button className="music-player__button" type="button" data-music-loop aria-label="開啟單曲循環" aria-pressed="false">↻¹</button>
            </div>
          </div>
          <input className="music-player__progress" data-music-progress type="range" min="0" max="100" step="0.1" defaultValue="0" aria-label="播放進度" />
          <div className="music-player__volume-row">
            <button className="music-player__volume-button" type="button" data-music-mute aria-label="靜音">🔊</button>
            <input className="music-player__volume" data-music-volume type="range" min="0" max="100" step="1" defaultValue="70" aria-label="音量" />
            <output data-music-volume-output>70%</output>
          </div>
          <div className="music-player__playlist" data-music-playlist />
          <button className="music-player__request-toggle" type="button" data-music-request>想聽別的歌？推薦歌曲給我 →</button>
          <form className="music-player__request-form" data-music-request-form hidden>
            <strong>推薦網站歌單</strong>
            <input required name="title" maxLength={120} placeholder="歌名" aria-label="推薦歌名" />
            <input required name="artist" maxLength={120} placeholder="歌手／作者" aria-label="歌手或作者" />
            <input name="link" type="url" maxLength={500} placeholder="歌曲連結（選填）" aria-label="歌曲連結" />
            <textarea name="message" maxLength={500} rows={2} placeholder="想說的話（選填）" aria-label="推薦留言" />
            <input className="music-player__honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <p className="music-player__request-status" data-music-request-status aria-live="polite" />
            <div className="music-player__form-actions"><button type="button" data-music-request-cancel>取消</button><button type="submit">送出推薦</button></div>
          </form>
          <form className="music-player__add-form" data-music-add-form hidden>
            <strong>新增音樂</strong>
            <input name="title" placeholder="歌曲名稱" required />
            <input name="artist" placeholder="作者／歌手" required />
            <input name="src" type="url" placeholder="音訊網址（MP3、OGG 等）" required />
            <input name="cover" type="url" placeholder="封面圖片網址（選填）" />
            <p className="music-player__permission-note">請只加入你擁有或獲准使用的音訊</p>
            <div className="music-player__form-actions">
              <button type="button" data-music-cancel>取消</button>
              <button type="submit">加入播放清單</button>
            </div>
          </form>
        </section>
      </aside>
      <script src="/music-player.js" defer />
    </>
  );
}
