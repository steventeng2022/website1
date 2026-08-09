class FloatingMusicPlayer {
  constructor(root, tracks = []) {
    this.root = root;
    this.storageKey = root.id ? `floating-music-player:${root.id}` : "floating-music-player:tracks";
    this.siteTracks = tracks.map(track => ({ ...track, origin: "site" }));
    this.userTracks = this.readSavedTracks().map(track => ({ ...track, origin: "user" }));
    this.tracks = [...this.siteTracks, ...this.userTracks];
    this.index = 0;
    this.audio = new Audio();
    this.audio.preload = "metadata";

    this.title = root.querySelector("[data-music-title]");
    this.artist = root.querySelector("[data-music-artist]");
    this.cover = root.querySelector("[data-music-cover]");
    this.cover.addEventListener("error", () => {
      if (!this.cover.src.endsWith("/music-default-cover.svg")) {
        this.cover.src = this.defaultCover();
      } else {
        this.cover.hidden = true;
      }
    });
    this.progress = root.querySelector("[data-music-progress]");
    this.volume = root.querySelector("[data-music-volume]");
    this.volumeOutput = root.querySelector("[data-music-volume-output]");
    this.muteButton = root.querySelector("[data-music-mute]");
    this.playButton = root.querySelector("[data-music-play]");
    this.shuffleButton = root.querySelector("[data-music-shuffle]");
    this.loopButton = root.querySelector("[data-music-loop]");
    this.playlist = root.querySelector("[data-music-playlist]");
    this.addForm = root.querySelector("[data-music-add-form]");
    this.requestForm = root.querySelector("[data-music-request-form]");
    this.shuffleEnabled = false;
    this.loopOneEnabled = false;

    this.renderPlaylist();
    if (this.tracks.length) this.load(0);
    else this.showEmptyState();
    this.restoreVolume();
    this.restorePlaybackModes();
    this.bindEvents();
  }

  bindEvents() {
    this.playButton.addEventListener("click", () => this.togglePlayback());
    this.root.querySelector("[data-music-prev]").addEventListener("click", () => this.change(-1));
    this.root.querySelector("[data-music-next]").addEventListener("click", () => this.next());
    this.shuffleButton.addEventListener("click", () => {
      this.shuffleEnabled = !this.shuffleEnabled;
      this.updatePlaybackModeButtons();
      this.savePlaybackModes();
    });
    this.loopButton.addEventListener("click", () => {
      this.loopOneEnabled = !this.loopOneEnabled;
      this.updatePlaybackModeButtons();
      this.savePlaybackModes();
    });
    this.playlist.addEventListener("click", event => {
      const row = event.target.closest("[data-track-index]");
      if (!row) return;
      const trackIndex = Number(row.dataset.trackIndex);
      if (event.target.closest("[data-track-remove]")) {
        this.removeTrack(trackIndex);
        return;
      }
      if (!event.target.closest("[data-track-play]")) return;
      this.load(trackIndex);
      this.audio.play().catch(() => {});
    });
    this.root.querySelector("[data-music-add]").addEventListener("click", () => {
      this.addForm.hidden = !this.addForm.hidden;
      if (!this.addForm.hidden) this.addForm.elements.title.focus();
    });
    this.root.querySelector("[data-music-cancel]").addEventListener("click", () => {
      this.addForm.hidden = true;
      this.addForm.reset();
    });
    this.addForm.addEventListener("submit", event => {
      event.preventDefault();
      const values = new FormData(this.addForm);
      const track = {
        title: String(values.get("title")).trim(),
        artist: String(values.get("artist")).trim(),
        src: String(values.get("src")).trim(),
        cover: String(values.get("cover")).trim() || this.defaultCover(),
        origin: "user"
      };
      if (!track.title || !track.artist || !track.src) return;
      this.tracks.push(track);
      this.userTracks.push(track);
      this.saveUserTracks();
      this.renderPlaylist();
      this.load(this.tracks.length - 1);
      this.addForm.reset();
      this.addForm.hidden = true;
      this.audio.play().catch(() => {});
    });
    this.root.querySelector("[data-music-request]").addEventListener("click",()=>{
      this.requestForm.hidden=!this.requestForm.hidden;
      if(!this.requestForm.hidden)this.requestForm.elements.title.focus();
    });
    this.root.querySelector("[data-music-request-cancel]").addEventListener("click",()=>{this.requestForm.hidden=true;this.requestForm.reset();});
    this.requestForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const status=this.root.querySelector("[data-music-request-status]");
      const button=this.requestForm.querySelector("button[type=submit]");
      button.disabled=true; status.textContent="正在送出推薦……";
      try {
        const values=Object.fromEntries(new FormData(this.requestForm));
        const response=await fetch("/api/song-requests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(values)});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||"歌曲推薦送出失敗");
        this.requestForm.reset(); status.textContent="已收到你的推薦，謝謝！";
      } catch(error) { status.textContent=error instanceof Error?error.message:"歌曲推薦送出失敗"; }
      finally { button.disabled=false; }
    });
    this.progress.addEventListener("input", () => {
      if (Number.isFinite(this.audio.duration)) this.audio.currentTime = this.audio.duration * this.progress.value / 100;
    });
    this.volume.addEventListener("input", () => this.setVolume(Number(this.volume.value)));
    this.muteButton.addEventListener("click", () => {
      if (this.audio.volume > 0) {
        this.previousVolume = this.audio.volume;
        this.setVolume(0);
      } else {
        this.setVolume(Math.round((this.previousVolume || 0.7) * 100));
      }
    });
    this.audio.addEventListener("timeupdate", () => {
      this.progress.value = Number.isFinite(this.audio.duration) ? this.audio.currentTime / this.audio.duration * 100 : 0;
    });
    this.audio.addEventListener("play", () => this.setPlaying(true));
    this.audio.addEventListener("pause", () => this.setPlaying(false));
    this.audio.addEventListener("error", () => {
      this.artist.textContent = "無法播放這個音訊網址，請檢查連結或來源權限";
      this.setPlaying(false);
    });
    this.audio.addEventListener("ended", () => {
      if (this.loopOneEnabled) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      } else {
        this.next(true);
      }
    });
  }

  renderPlaylist() {
    this.playlist.innerHTML = this.tracks.length ? this.tracks.map((track, index) => `
      <div class="music-player__track" data-track-index="${index}">
        <button class="music-player__track-main" type="button" data-track-play aria-label="Play ${this.escape(track.title)}">
          <span class="music-player__track-index">${index + 1}</span>
          <span class="music-player__track-name">${this.escape(track.title)}</span>
          <span class="music-player__track-artist">${this.escape(track.artist)}</span>
          <span class="music-player__track-source">${track.origin === "site" ? "網站歌單" : "我的歌單"}</span>
        </button>
        ${track.origin === "user" ? `<button class="music-player__track-remove" type="button" data-track-remove aria-label="Remove ${this.escape(track.title)}">×</button>` : ""}
      </div>`).join("") : `<p class="music-player__empty">No tracks in the playlist.</p>`;
  }

  load(index) {
    if (!this.tracks.length) return;
    this.index = (index + this.tracks.length) % this.tracks.length;
    const track = this.tracks[this.index];
    this.audio.src = track.src;
    this.title.textContent = track.title;
    this.artist.textContent = track.artist;
    this.cover.hidden = false;
    this.cover.src = track.cover || this.defaultCover();
    this.cover.alt = "";
    this.progress.value = 0;
    this.playlist.querySelectorAll("[data-track-index]").forEach((item, itemIndex) => {
      item.classList.toggle("is-current", itemIndex === this.index);
    });
  }

  async togglePlayback() {
    if (!this.tracks.length) return;
    if (this.audio.paused) {
      try { await this.audio.play(); } catch (error) { console.warn("Music could not start:", error); }
    } else {
      this.audio.pause();
    }
  }

  change(direction, autoplay = !this.audio.paused) {
    this.load(this.index + direction);
    if (autoplay) this.audio.play().catch(() => {});
  }

  next(autoplay = !this.audio.paused) {
    if (!this.tracks.length) return;
    if (this.shuffleEnabled && this.tracks.length > 1) {
      let nextIndex = this.index;
      while (nextIndex === this.index) nextIndex = Math.floor(Math.random() * this.tracks.length);
      this.load(nextIndex);
      if (autoplay) this.audio.play().catch(() => {});
      return;
    }
    this.change(1, autoplay);
  }

  setPlaying(playing) {
    this.root.classList.toggle("is-playing", playing);
    this.playButton.textContent = playing ? "❚❚" : "▶";
    this.playButton.setAttribute("aria-label", playing ? "Pause music" : "Play music");
  }

  setVolume(percent, save = true) {
    const level = Math.min(100, Math.max(0, percent));
    this.audio.volume = level / 100;
    this.volume.value = level;
    this.volumeOutput.value = `${Math.round(level)}%`;
    this.muteButton.textContent = level === 0 ? "🔇" : level < 50 ? "🔉" : "🔊";
    this.muteButton.setAttribute("aria-label", level === 0 ? "Unmute music" : "Mute music");
    if (level > 0) this.previousVolume = level / 100;
    if (save) {
      try { localStorage.setItem(`${this.storageKey}:volume`, String(level)); } catch {}
    }
  }

  restoreVolume() {
    let level = 70;
    try {
      const stored = localStorage.getItem(`${this.storageKey}:volume`);
      const saved = Number(stored);
      if (stored !== null && Number.isFinite(saved) && saved >= 0 && saved <= 100) level = saved;
    } catch {}
    this.setVolume(level, false);
  }

  updatePlaybackModeButtons() {
    this.shuffleButton.classList.toggle("is-active", this.shuffleEnabled);
    this.shuffleButton.setAttribute("aria-pressed", String(this.shuffleEnabled));
    this.shuffleButton.setAttribute("aria-label", this.shuffleEnabled ? "Turn shuffle off" : "Turn shuffle on");
    this.loopButton.classList.toggle("is-active", this.loopOneEnabled);
    this.loopButton.setAttribute("aria-pressed", String(this.loopOneEnabled));
    this.loopButton.setAttribute("aria-label", this.loopOneEnabled ? "Turn repeat one off" : "Turn repeat one on");
  }

  savePlaybackModes() {
    try {
      localStorage.setItem(`${this.storageKey}:shuffle`, String(this.shuffleEnabled));
      localStorage.setItem(`${this.storageKey}:loop-one`, String(this.loopOneEnabled));
    } catch {}
  }

  restorePlaybackModes() {
    try {
      this.shuffleEnabled = localStorage.getItem(`${this.storageKey}:shuffle`) === "true";
      this.loopOneEnabled = localStorage.getItem(`${this.storageKey}:loop-one`) === "true";
    } catch {}
    this.updatePlaybackModeButtons();
  }

  escape(value) {
    const node = document.createElement("span");
    node.textContent = value;
    return node.innerHTML;
  }

  readSavedTracks() {
    try {
      const current = localStorage.getItem(this.storageKey);
      const legacy = current === null ? localStorage.getItem(`${this.storageKey}:playlist`) : null;
      const value = JSON.parse(current ?? legacy ?? "[]");
      if (current === null && legacy !== null) {
        localStorage.setItem(this.storageKey, JSON.stringify(value));
        localStorage.removeItem(`${this.storageKey}:playlist`);
      }
      return Array.isArray(value) ? value.filter(track => track?.title && track?.artist && track?.src) : [];
    } catch { return []; }
  }

  saveUserTrack(track) {
    try {
      const saved = this.readSavedTracks();
      localStorage.setItem(this.storageKey, JSON.stringify([...saved, track]));
    } catch (error) { console.warn("Could not save the added track:", error); }
  }

  saveUserTracks() {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.userTracks)); }
    catch (error) { console.warn("Could not save local tracks:", error); }
  }

  removeTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    if (this.tracks[index].origin !== "user") return;
    const wasCurrent = index === this.index;
    const wasPlaying = !this.audio.paused;
    this.tracks.splice(index, 1);
    this.userTracks=this.tracks.filter(track=>track.origin==="user");
    this.saveUserTracks();

    if (!this.tracks.length) {
      this.showEmptyState();
      this.renderPlaylist();
      return;
    }

    if (index < this.index) this.index -= 1;
    if (wasCurrent) {
      this.load(Math.min(index, this.tracks.length - 1));
      if (wasPlaying) this.audio.play().catch(() => {});
    } else {
      this.renderPlaylist();
      this.playlist.querySelectorAll("[data-track-index]").forEach((item, itemIndex) => {
        item.classList.toggle("is-current", itemIndex === this.index);
      });
    }
  }

  showEmptyState() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.index = 0;
    this.title.textContent = "尚未加入音樂";
    this.artist.textContent = "按＋新增你有權使用的音訊連結";
    this.cover.src = this.defaultCover();
    this.cover.hidden = false;
    this.cover.alt = "";
    this.progress.value = 0;
    this.setPlaying(false);
  }

  defaultCover() {
    return "/music-default-cover.svg";
  }
}

window.initFloatingMusicPlayer = (selector, tracks) => {
  const root = document.querySelector(selector);
  if (!root || root.dataset.musicReady === "true") return;
  root.dataset.musicReady = "true";
  return new FloatingMusicPlayer(root, Array.isArray(tracks) ? tracks : []);
};

const startSiteMusicPlayer = () => {
  const root=document.querySelector("#site-music-player");
  let tracks=[];
  try { tracks=JSON.parse(root?.dataset.siteTracks||"[]"); } catch {}
  return window.initFloatingMusicPlayer("#site-music-player", tracks);
};
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSiteMusicPlayer, { once: true });
} else {
  startSiteMusicPlayer();
}
