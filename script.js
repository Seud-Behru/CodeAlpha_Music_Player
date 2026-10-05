(() => {
  "use strict";

  /* ------------------------------------------------------------------
     1. PLAYLIST
     These sample songs stream from soundhelix.com (needs internet).
     To use your own files, put them in an /audio folder and use
     src: "audio/my-song.mp3". `hue` (0-360) sets the colour of the player
     while that track is selected.
  ------------------------------------------------------------------ */
  const TRACKS = [
    { title: "SoundHelix Song 1", artist: "T. Schürger", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", hue: 12 },
    { title: "SoundHelix Song 2", artist: "T. Schürger", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", hue: 165 },
    { title: "SoundHelix Song 3", artist: "T. Schürger", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", hue: 275 },
    { title: "SoundHelix Song 4", artist: "T. Schürger", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", hue: 48 },
    { title: "SoundHelix Song 5", artist: "T. Schürger", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", hue: 205 },
    { title: "SoundHelix Song 6", artist: "T. Schürger", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", hue: 335 }
  ];

  /* ------------------------------------------------------------------
     2. ELEMENTS + STATE
  ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const titleEl = $("title");
  const artistEl = $("artist");
  const disc = $("disc");
  const seek = $("seek");
  const currentEl = $("current");
  const durationEl = $("duration");
  const playBtn = $("play");
  const playIcon = $("playIcon");
  const prevBtn = $("prev");
  const nextBtn = $("next");
  const shuffleBtn = $("shuffle");
  const repeatBtn = $("repeat");
  const repeatOne = $("repeatOne");
  const muteBtn = $("mute");
  const volIcon = $("volIcon");
  const volume = $("volume");
  const autoplayBox = $("autoplay");
  const messageEl = $("message");
  const tracksEl = $("tracks");
  const addBtn = $("addBtn");
  const filesInput = $("files");

  let index = 0;
  let shuffle = false;
  let repeat = "off"; // "off" | "all" | "one"
  let seeking = false;
  const played = []; // stack of previous track indexes, used by Previous

  /* ------------------------------------------------------------------
     3. HELPERS
  ------------------------------------------------------------------ */
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // Paints the filled part of a range input
  function setFill(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--p", `${pct}%`);
  }

  function showMessage(text) {
    messageEl.textContent = text;
  }

  /* ------------------------------------------------------------------
     4. PLAYLIST UI
  ------------------------------------------------------------------ */
  function renderList() {
    tracksEl.innerHTML = TRACKS.map(
      (t, i) => `
      <li>
        <button type="button" class="track" data-index="${i}">
          <span class="track-num">
            <span class="track-num-text">${i + 1}</span>
            <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
          </span>
          <span class="track-info">
            <strong>${escapeHtml(t.title)}</strong>
            <small>${escapeHtml(t.artist)}</small>
          </span>
          <span class="track-dur">${t.duration ? formatTime(t.duration) : "--:--"}</span>
        </button>
      </li>`
    ).join("");
    updateListState();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function updateListState() {
    const playing = !audio.paused;
    tracksEl.querySelectorAll(".track").forEach((btn) => {
      const i = Number(btn.dataset.index);
      btn.classList.toggle("is-current", i === index);
      btn.classList.toggle("is-playing", i === index && playing);
      if (i === index) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  // Load each song's length in the background so the list can show durations
  function probeDuration(track) {
    if (track.duration) return;
    const probe = new Audio();
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => {
      track.duration = probe.duration;
      const i = TRACKS.indexOf(track);
      const cell = tracksEl.querySelector(`[data-index="${i}"] .track-dur`);
      if (cell) cell.textContent = formatTime(track.duration);
    });
    probe.src = track.src;
  }

  tracksEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".track");
    if (!btn) return;
    const i = Number(btn.dataset.index);
    if (i === index) togglePlay();
    else select(i, true);
  });

  /* ------------------------------------------------------------------
     5. LOADING AND PLAYING TRACKS
  ------------------------------------------------------------------ */
  function loadTrack(i, autoplay) {
    index = i;
    const track = TRACKS[i];

    audio.src = track.src;
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    document.documentElement.style.setProperty("--hue", track.hue);
    document.title = `${track.title} | Music Player`;

    seek.value = 0;
    setFill(seek);
    currentEl.textContent = "0:00";
    durationEl.textContent = track.duration ? formatTime(track.duration) : "0:00";
    showMessage("");
    updateMediaSession(track);
    updateListState();

    if (autoplay) play();
  }

  // Choose a track and remember where we came from (for the Previous button)
  function select(i, autoplay) {
    if (i !== index) played.push(index);
    loadTrack(i, autoplay);
  }

  function play() {
    const promise = audio.play();
    if (promise) {
      promise.catch((err) => {
        // Interrupted by another load/pause: not a real problem
        if (err.name !== "AbortError") showMessage("Couldn't play this track. Check your connection or the file.");
      });
    }
  }

  function togglePlay() {
    if (audio.paused) play();
    else audio.pause();
  }

  function pickNext() {
    if (shuffle && TRACKS.length > 1) {
      let n;
      do { n = Math.floor(Math.random() * TRACKS.length); } while (n === index);
      return n;
    }
    return (index + 1) % TRACKS.length;
  }

  function next() {
    select(pickNext(), true);
  }

  function previous() {
    // Like most players: restart the song if it's already a few seconds in
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const back = played.length ? played.pop() : (index - 1 + TRACKS.length) % TRACKS.length;
    loadTrack(back, true);
  }

  /* ------------------------------------------------------------------
     6. AUDIO EVENTS
  ------------------------------------------------------------------ */
  function updatePlayState() {
    const playing = !audio.paused;
    playIcon.setAttribute("href", playing ? "#i-pause" : "#i-play");
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    disc.classList.toggle("is-playing", playing);
    updateListState();
  }

  audio.addEventListener("play", updatePlayState);
  audio.addEventListener("pause", updatePlayState);

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
    const track = TRACKS[index];
    if (!track.duration) {
      track.duration = audio.duration;
      const cell = tracksEl.querySelector(`[data-index="${index}"] .track-dur`);
      if (cell) cell.textContent = formatTime(audio.duration);
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (seeking || !Number.isFinite(audio.duration)) return;
    seek.value = (audio.currentTime / audio.duration) * 100;
    setFill(seek);
    currentEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("ended", () => {
    updatePlayState();
    if (repeat === "one") {
      audio.currentTime = 0;
      play();
    } else if (!autoplayBox.checked) {
      return; // autoplay is off: stop here
    } else if (index === TRACKS.length - 1 && repeat === "off" && !shuffle) {
      loadTrack(0, false); // end of the playlist: go back to the start and wait
    } else {
      next();
    }
  });

  audio.addEventListener("error", () => {
    showMessage(`Couldn't load "${TRACKS[index].title}". Check your internet connection or the file path.`);
    updatePlayState();
  });

  /* ------------------------------------------------------------------
     7. CONTROLS
  ------------------------------------------------------------------ */
  playBtn.addEventListener("click", togglePlay);
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", previous);

  shuffleBtn.addEventListener("click", () => {
    shuffle = !shuffle;
    shuffleBtn.setAttribute("aria-pressed", String(shuffle));
  });

  repeatBtn.addEventListener("click", () => {
    repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    repeatBtn.classList.toggle("is-on", repeat !== "off");
    repeatOne.hidden = repeat !== "one";
    repeatBtn.setAttribute("aria-label", `Repeat: ${repeat}`);
  });

  // Progress bar
  seek.addEventListener("pointerdown", () => { seeking = true; });
  seek.addEventListener("pointerup", () => { seeking = false; });
  seek.addEventListener("input", () => {
    setFill(seek);
    if (!Number.isFinite(audio.duration)) return;
    const time = (seek.value / 100) * audio.duration;
    currentEl.textContent = formatTime(time);
    audio.currentTime = time;
  });

  // Volume
  function updateVolumeUI() {
    volume.value = audio.muted ? 0 : audio.volume;
    setFill(volume);
    const silent = audio.muted || audio.volume === 0;
    volIcon.setAttribute("href", silent ? "#i-mute" : "#i-volume");
    muteBtn.setAttribute("aria-label", silent ? "Unmute" : "Mute");
  }

  volume.addEventListener("input", () => {
    audio.muted = false;
    audio.volume = Number(volume.value);
    updateVolumeUI();
  });

  muteBtn.addEventListener("click", () => {
    if (audio.volume === 0) audio.volume = 0.5; // unmuting from a zero slider
    else audio.muted = !audio.muted;
    updateVolumeUI();
  });

  /* ------------------------------------------------------------------
     8. KEYBOARD SHORTCUTS
  ------------------------------------------------------------------ */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    const onControl = tag === "INPUT" || tag === "BUTTON";

    switch (e.key) {
      case " ":
        if (onControl) return; // buttons and checkboxes handle Space themselves
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        if (tag === "INPUT") return; // sliders already handle arrows
        audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0);
        break;
      case "ArrowLeft":
        if (tag === "INPUT") return;
        audio.currentTime = Math.max(audio.currentTime - 5, 0);
        break;
      case "ArrowUp":
        if (tag === "INPUT") return;
        e.preventDefault();
        audio.muted = false;
        audio.volume = Math.min(audio.volume + 0.05, 1);
        updateVolumeUI();
        break;
      case "ArrowDown":
        if (tag === "INPUT") return;
        e.preventDefault();
        audio.volume = Math.max(audio.volume - 0.05, 0);
        updateVolumeUI();
        break;
      case "n": case "N": next(); break;
      case "p": case "P": previous(); break;
      case "m": case "M": muteBtn.click(); break;
      case "s": case "S": shuffleBtn.click(); break;
      case "r": case "R": repeatBtn.click(); break;
    }
  });

  /* ------------------------------------------------------------------
     9. ADD YOUR OWN SONGS FROM YOUR DEVICE
  ------------------------------------------------------------------ */
  addBtn.addEventListener("click", () => filesInput.click());

  filesInput.addEventListener("change", () => {
    const files = [...filesInput.files];
    files.forEach((file) => {
      const track = {
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "On this device",
        src: URL.createObjectURL(file),
        hue: Math.floor(Math.random() * 360)
      };
      TRACKS.push(track);
    });
    renderList();
    TRACKS.forEach(probeDuration);
    if (files.length && audio.paused) select(TRACKS.length - files.length, true);
    filesInput.value = "";
  });

  /* ------------------------------------------------------------------
     10. LOCK SCREEN / HEADPHONE BUTTONS (Media Session API)
  ------------------------------------------------------------------ */
  function updateMediaSession(track) {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist });
  }

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", () => audio.pause());
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("nexttrack", next);
  }

  /* ------------------------------------------------------------------
     11. START
  ------------------------------------------------------------------ */
  audio.volume = 0.8;
  updateVolumeUI();
  setFill(seek);
  renderList();
  TRACKS.forEach(probeDuration);
  loadTrack(0, false); // browsers block autoplay until the person clicks, so we wait
})();
