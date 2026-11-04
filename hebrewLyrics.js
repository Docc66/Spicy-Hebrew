(function SpicyHebrew() {
  if (!Spicetify?.Player || !Spicetify?.CosmosAsync || !Spicetify?.Playbar) {
    setTimeout(SpicyHebrew, 300);
    return;
  }

  const CACHE = {};   
  const PENDING = {};
  let overlay, listEl, lines = [], lineEls = [], synced = true, activeIdx = -1, raf = null, open = false, showOriginal = true, prefTimer;

  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap";
  document.head.appendChild(font);

  const style = document.createElement("style");
  style.textContent = `
  #heb-lyrics{--bg:#3a1c5c;position:fixed;inset:0;z-index:9999;display:none;flex-direction:column;
    background-color:var(--bg);transition:background-color .8s ease;
    color:#fff;font-family:"Rubik","Heebo","Segoe UI",sans-serif;direction:rtl}
  #heb-lyrics::before{content:"";position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(160deg,rgba(0,0,0,0) 0%,rgba(8,8,12,.92) 85%)}
  #heb-lyrics.on{display:flex}
  #heb-top{flex:none;position:relative;z-index:5;display:flex;align-items:center;gap:14px;padding:26px 160px 14px;
    background:rgba(0,0,0,.2);backdrop-filter:blur(12px);-webkit-app-region:no-drag}
  #heb-top img{width:64px;height:64px;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.45)}
  #heb-title{font-weight:700;font-size:17px;letter-spacing:.2px}
  #heb-artist{opacity:.7;font-size:13px;font-weight:400}
  #heb-actions{display:flex;align-items:center;gap:8px;margin-top:8px}
  #heb-tag{font-size:11px;opacity:.65}
  #heb-sync{display:flex;align-items:center;gap:4px;font-size:12px;direction:ltr}
  #heb-sync .heb-btn{padding:3px 10px}
  #heb-off{min-width:46px;text-align:center;opacity:.8}
  .heb-btn{font-family:inherit;background:rgba(255,255,255,.14);border:0;color:#fff;border-radius:999px;padding:5px 13px;
    cursor:pointer;font-size:12px;font-weight:500;-webkit-app-region:no-drag}
  .heb-btn:hover{background:rgba(255,255,255,.26)}
  #heb-close{background:rgba(255,80,80,.55)}
  #heb-close:hover{background:rgba(255,80,80,.8)}
  #heb-list{position:relative;flex:1;min-height:0;overflow-y:auto;padding:40vh 8vw;scrollbar-width:none}
  #heb-list::-webkit-scrollbar{display:none}
  .heb-line{margin:14px 0;font-size:clamp(26px,3.6vw,46px);font-weight:700;line-height:1.3;
    opacity:.55;filter:blur(1.2px);transform-origin:right center;transition:all .35s ease;cursor:pointer}
  .heb-line.past{opacity:.4;filter:blur(.8px)}
  .heb-line.active{opacity:1;filter:none;transform:scale(1.05)}
  .heb-line.static{opacity:1;filter:none;cursor:default}
  .heb-line small{display:block;font-size:.42em;font-weight:400;opacity:.7;direction:ltr;text-align:right;margin-top:4px}
  .heb-line.hide-orig small{display:none}
  .w{display:inline-block;margin-inline-end:.28em;color:transparent;
    -webkit-background-clip:text;background-clip:text;
    background-image:linear-gradient(to left,#fff calc(var(--p,0)*112% - 12%),rgba(255,255,255,.4) calc(var(--p,0)*112%));
    transition:transform .25s ease}
  .w.sing{transform:translateY(-3px) scale(1.06);filter:drop-shadow(0 0 10px rgba(255,255,255,.75))}
  #heb-controls{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;
    gap:22px;padding:22px 28px 26px;direction:ltr;-webkit-app-region:no-drag;z-index:6;
    background:linear-gradient(to top,rgba(0,0,0,.75),rgba(0,0,0,0));
    transform:translateY(100%);opacity:0;transition:all .3s ease;pointer-events:none}
  #heb-controls.show{transform:none;opacity:1;pointer-events:auto}
  .heb-c{background:none;border:0;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
    opacity:.85;transition:transform .15s,opacity .15s}
  .heb-c:hover{opacity:1;transform:scale(1.12)}
  .heb-c svg{width:26px;height:26px;fill:currentColor}
  #heb-play{width:52px;height:52px;border-radius:50%;background:#fff;color:#000;opacity:1}
  #heb-vol{display:flex;align-items:center;gap:8px;margin-left:28px}
  #heb-vol svg{width:20px;height:20px;fill:#fff;opacity:.85}
  #heb-volume{width:110px;accent-color:#fff;cursor:pointer}
  #heb-msg{position:absolute;top:50%;left:0;right:0;text-align:center;font-size:20px;opacity:.7;pointer-events:none;z-index:4}`;
  document.head.appendChild(style);

  overlay = document.createElement("div");
  overlay.id = "heb-lyrics";
  overlay.innerHTML = `
    <div id="heb-top">
      <img id="heb-cover">
      <div id="heb-info">
        <div id="heb-title"></div><div id="heb-artist"></div>
        <div id="heb-actions">
          <button class="heb-btn" id="heb-close">סגור ✕</button>
          <button class="heb-btn" id="heb-orig">מקור: פעיל</button>
          <span id="heb-sync"><button class="heb-btn" id="heb-sm">−</button><span id="heb-off"></span><button class="heb-btn" id="heb-sp">+</button></span>
          <span id="heb-tag"></span>
        </div>
      </div>
    </div>
    <div id="heb-list"></div><div id="heb-msg"></div>
    <div id="heb-controls">
      <button class="heb-c" id="heb-prev" title="שיר קודם"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
      <button class="heb-c" id="heb-play" title="נגן / עצור"></button>
      <button class="heb-c" id="heb-next" title="שיר הבא"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6h2v12h-2z"/></svg></button>
      <div id="heb-vol"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>
        <input type="range" id="heb-volume" min="0" max="1" step="0.01"></div>
    </div>`;
  document.body.appendChild(overlay);
  listEl = overlay.querySelector("#heb-list");
  const msg = overlay.querySelector("#heb-msg");
  const tag = overlay.querySelector("#heb-tag");

  overlay.querySelector("#heb-close").addEventListener("click", () => toggle(false));
  overlay.querySelector("#heb-orig").addEventListener("click", (e) => {
    showOriginal = !showOriginal;
    e.target.textContent = "מקור: " + (showOriginal ? "פעיל" : "כבוי");
    listEl.querySelectorAll(".heb-line").forEach((l) => l.classList.toggle("hide-orig", !showOriginal));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) toggle(false); });

  let offset = Number(Spicetify.LocalStorage.get("spicyHebrewOffset")) || 0;
  const offEl = overlay.querySelector("#heb-off");
  const showOffset = () => { offEl.textContent = (offset > 0 ? "+" : "") + (offset / 1000).toFixed(2) + "s"; };
  const nudge = (d) => { offset += d; Spicetify.LocalStorage.set("spicyHebrewOffset", String(offset)); showOffset(); };
  overlay.querySelector("#heb-sm").addEventListener("click", () => nudge(-250));
  overlay.querySelector("#heb-sp").addEventListener("click", () => nudge(250));
  showOffset();

  const controls = overlay.querySelector("#heb-controls");
  const playBtn = overlay.querySelector("#heb-play");
  const volEl = overlay.querySelector("#heb-volume");
  const PLAY = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  const PAUSE = `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`;
  const syncControls = () => {
    playBtn.innerHTML = Spicetify.Player.isPlaying() ? PAUSE : PLAY;
    volEl.value = Spicetify.Player.getVolume();
  };
  overlay.addEventListener("mousemove", (e) => controls.classList.toggle("show", e.clientY > window.innerHeight - 150));
  overlay.addEventListener("mouseleave", () => controls.classList.remove("show"));
  overlay.querySelector("#heb-prev").addEventListener("click", () => Spicetify.Player.back());
  overlay.querySelector("#heb-next").addEventListener("click", () => Spicetify.Player.next());
  playBtn.addEventListener("click", () => { Spicetify.Player.togglePlay(); setTimeout(syncControls, 150); });
  volEl.addEventListener("input", () => Spicetify.Player.setVolume(Number(volEl.value)));
  Spicetify.Player.addEventListener("onplaypause", syncControls);

  const icon = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h12v1.5H2z"/><text x="10" y="10" font-size="6" font-weight="700">א</text></svg>`;
  const btn = new Spicetify.Playbar.Button("מילים בעברית", icon, () => toggle());
  function setButton(none) {
    try { btn.disabled = none; } catch (e) {}
    if (btn.element) {
      btn.element.style.opacity = none ? "0.3" : "";
      btn.element.style.pointerEvents = none ? "none" : "";
      btn.element.style.filter = none ? "grayscale(1)" : "";
    }
  }

  const coverUrl = (item) => (item.album?.images?.[0]?.url || "").replace("spotify:image:", "https://i.scdn.co/image/");
  const hexToRgb = (h) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(h || ""); return m ? [+("0x" + m[1]), +("0x" + m[2]), +("0x" + m[3])] : null; };

  function colorFromImage(url) {
    return new Promise((res) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = c.height = 24;
          const x = c.getContext("2d"); x.drawImage(img, 0, 0, 24, 24);
          const d = x.getImageData(0, 0, 24, 24).data;
          let r = 0, g = 0, b = 0, wt = 0;
          for (let i = 0; i < d.length; i += 4) {
            const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
            const sat = mx ? (mx - mn) / mx : 0;
            const w = 0.05 + sat * sat * 3;
            r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; wt += w;
          }
          res([r / wt, g / wt, b / wt]);
        } catch (e) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = url;
    });
  }

  async function applyColor(item) {
    let rgb = null;
    try {
      const c = await Spicetify.colorExtractor(item.uri);
      rgb = hexToRgb(c?.VIBRANT_NON_ALARMING || c?.DARK_VIBRANT || c?.PROMINENT || c?.VIBRANT);
    } catch (e) {}
    if (!rgb) rgb = await colorFromImage(coverUrl(item));
    if (!rgb) rgb = [58, 28, 92];
    const mx = Math.max(...rgb) || 1, k = 140 / mx;
    overlay.style.setProperty("--bg", `rgb(${rgb.map((v) => Math.round(Math.min(255, v * k))).join(",")})`);
  }

  async function getJSON(url) {
    try { const r = await Spicetify.CosmosAsync.get(url); if (r && typeof r === "object") return r; } catch (e) {}
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (e) {}
    return null;
  }
  async function getText(url) {
    try { const r = await Spicetify.CosmosAsync.get(url); if (typeof r === "string") return r; } catch (e) {}
    try { const r = await fetch(url); if (r.ok) return await r.text(); } catch (e) {}
    return null;
  }

  const clean = (s) => s.replace(/\s*[\(\[].*?[\)\]]/g, "").replace(/\s*-\s*(remaster|live|radio|single|version|edit|mono|stereo|\d{4}).*/i, "").trim();
  const norm = (s) => (s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

  function parseLRC(lrc) {
    const out = [];
    for (const row of lrc.split("\n")) {
      const m = row.match(/^\s*((?:\[\d+:\d+(?:\.\d+)?\])+)\s*(.*)$/);
      if (!m) continue;
      const text = m[2].trim();
      for (const tm of m[1].matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) out.push({ t: Math.round((+tm[1] * 60 + +tm[2]) * 1000), w: text });
    }
    return out.filter((l) => l.w && l.w !== "♪").sort((a, b) => a.t - b.t);
  }
  const plainToLines = (txt) => txt.split("\n").map((s) => s.trim()).filter((s) => s && !/^\[.*\]$/.test(s)).map((w) => ({ t: 0, w }));
  const asPlain = (arr) => (arr.length >= 3 ? { lines: arr, synced: false } : null);

  async function fromSpotify(id) {
    try {
      const res = await Spicetify.CosmosAsync.get(`https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}?format=json&vocalRemoval=false&market=from_token`);
      const L = res?.lyrics;
      const arr = (L?.lines || []).map((l) => ({ t: Number(l.startTimeMs), w: l.words })).filter((l) => l.w && l.w.trim() && l.w.trim() !== "♪");
      if (arr.length) return { lines: arr, synced: L.syncType === "LINE_SYNCED" };
    } catch (e) {}
    return null;
  }

  async function fromLrclib(name, artist, dur) {
    const pick = (j) => {
      if (j?.syncedLyrics) { const a = parseLRC(j.syncedLyrics); if (a.length) return { lines: a, synced: true }; }
      if (j?.plainLyrics) return asPlain(plainToLines(j.plainLyrics));
      return null;
    };
    try {
      const q = new URLSearchParams({ track_name: name, artist_name: artist, duration: Math.round(dur / 1000) });
      const r = await fetch(`https://lrclib.net/api/get?${q}`);
      if (r.ok) { const p = pick(await r.json()); if (p) return p; }
    } catch (e) {}
    try {
      const r = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(artist + " " + name)}`);
      if (r.ok) {
        const list = await r.json();
        const diff = (x) => Math.abs((x.duration || 0) * 1000 - dur);
        const withSync = list.filter((x) => x.syncedLyrics).sort((a, b) => diff(a) - diff(b));
        const close = withSync.find((x) => diff(x) < 8000) || withSync[0];
        const p = pick(close) || pick(list.find((x) => x.plainLyrics));
        if (p) return p;
      }
    } catch (e) {}
    return null;
  }

  async function fromOvh(name, artist) {
    const j = await getJSON(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(name)}`);
    return j?.lyrics ? asPlain(plainToLines(j.lyrics)) : null;
  }

  async function fromGoogle(name, artist) {
    try {
      const html = await getText(`https://www.google.com/search?hl=en&q=${encodeURIComponent(`${name} ${artist} lyrics`)}`);
      if (!html) return null;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const spans = doc.querySelectorAll('[data-lyricid] span[jsname="YS01Ge"], div[jsname="WbKHeb"] span[jsname="YS01Ge"]');
      return asPlain([...spans].map((s) => s.textContent.trim()).filter(Boolean).map((w) => ({ t: 0, w })));
    } catch (e) { return null; }
  }

  async function fromGenius(name, artist) {
    try {
      const res = await getJSON(`https://genius.com/api/search/song?q=${encodeURIComponent(artist + " " + name)}`);
      const hits = res?.response?.sections?.[0]?.hits || [];
      const n = norm(name);
      const hit = hits.find((h) => { const t = norm(h.result?.title); return t && (t.includes(n) || n.includes(t)); });
      if (!hit) return null;
      const html = await getText(hit.result.url);
      if (!html) return null;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const blocks = doc.querySelectorAll('[data-lyrics-container="true"]');
      let text = "";
      blocks.forEach((b) => {
        b.querySelectorAll('[data-exclude-from-selection="true"]').forEach((x) => x.remove());
        b.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        text += b.textContent + "\n";
      });
      return asPlain(plainToLines(text));
    } catch (e) { return null; }
  }

  async function translate(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += 25) {
      const chunk = texts.slice(i, i + 25);
      const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=he&dt=t&q=" + encodeURIComponent(chunk.join("\n"));
      const j = await (await fetch(url)).json();
      const parts = j[0].map((x) => x[0]).join("").split("\n");
      chunk.forEach((_, k) => out.push((parts[k] || "").trim()));
    }
    return out;
  }

  function ensure(item) {
    const id = item.uri.split(":").pop();
    if (id in CACHE) return Promise.resolve(CACHE[id]);
    if (PENDING[id]) return PENDING[id];
    PENDING[id] = (async () => {
      try {
        const artists = (item.artists || []).map((a) => a.name);
        const name = clean(item.name) || item.name, artist = artists[0] || "";
        const dur = Spicetify.Player.getDuration();
        const found = (await fromSpotify(id)) || (await fromLrclib(name, artist, dur)) || (await fromOvh(name, artist)) ||
          (await fromGoogle(name, artist)) || (await fromGenius(name, artist));
        if (!found) { CACHE[id] = false; return false; }
        const heb = await translate(found.lines.map((l) => l.w));
        return (CACHE[id] = { synced: found.synced, lines: found.lines.map((l, i) => ({ t: l.t, orig: l.w, heb: heb[i] || l.w })) });
      } catch (e) {
        console.error("SpicyHebrew", e);
        return null;
      } finally { delete PENDING[id]; }
    })();
    return PENDING[id];
  }

  const curId = () => Spicetify.Player.data?.item?.uri.split(":").pop();

  function render(d) {
    synced = d.synced;
    lines = d.lines;
    tag.textContent = synced ? "" : "• מילים ללא סנכרון";
    lines.forEach((l, i) => {
      const words = l.heb.split(/\s+/).filter(Boolean);
      const total = words.reduce((a, w) => a + w.length + 1, 0) || 1;
      const next = lines[i + 1] ? lines[i + 1].t : l.t + 5000;
      l.dur = Math.max(600, Math.min(next - l.t, 500 + total * 110));

      const el = document.createElement("div");
      el.className = "heb-line" + (synced ? "" : " static") + (showOriginal ? "" : " hide-orig");
      let acc = 0;
      el._words = words.map((w) => {
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = w;
        if (!synced) span.style.setProperty("--p", 1);
        el.appendChild(span);
        const s = acc / total; acc += w.length + 1;
        return { el: span, s, e: acc / total };
      });
      if (l.orig.trim() !== l.heb.trim()) {
        const small = document.createElement("small");
        small.textContent = l.orig;
        el.appendChild(small);
      }
      if (synced) el.onclick = () => Spicetify.Player.seek(l.t);
      listEl.appendChild(el);
      lineEls.push(el);
    });
    listEl.scrollTop = 0;
  }

  async function load() {
    const item = Spicetify.Player.data?.item;
    if (!item) return;
    const id = curId();
    overlay.querySelector("#heb-title").textContent = item.name;
    overlay.querySelector("#heb-artist").textContent = (item.artists || []).map((a) => a.name).join(", ");
    overlay.querySelector("#heb-cover").src = coverUrl(item);
    applyColor(item);
    listEl.innerHTML = ""; lines = []; lineEls = []; activeIdx = -1; tag.textContent = "";
    msg.textContent = id in CACHE ? "" : "טוען...";

    const d = item.uri.startsWith("spotify:track:") ? await ensure(item) : false;
    if (curId() !== id) return;
    if (d === false) { setButton(true); msg.textContent = "לא נמצאו מילים לשיר הזה"; return; }
    if (!d) { msg.textContent = "שגיאה בטעינת המילים או בתרגום"; return; }
    msg.textContent = "";
    render(d);
  }

  function setLine(el, p, singing) {
    el._words.forEach((w) => {
      const v = Math.max(0, Math.min(1, (p - w.s) / (w.e - w.s)));
      w.el.style.setProperty("--p", v);
      w.el.classList.toggle("sing", singing && v > 0 && v < 1);
    });
  }
  function centerOn(el) {
    listEl.scrollTo({ top: el.offsetTop - listEl.clientHeight / 2 + el.offsetHeight / 2, behavior: "smooth" });
  }

  function tick() {
    if (!open) return;
    if (synced && lines.length) {
      const pos = Spicetify.Player.getProgress() - offset;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) { if (lines[i].t <= pos + 100) idx = i; else break; }
      if (idx !== activeIdx) {
        activeIdx = idx;
        lineEls.forEach((el, i) => {
          el.classList.toggle("active", i === idx);
          el.classList.toggle("past", i < idx);
          if (i !== idx) setLine(el, i < idx ? 1 : 0, false);
        });
        if (lineEls[idx]) centerOn(lineEls[idx]);
      }
      if (idx >= 0 && lineEls[idx]) setLine(lineEls[idx], (pos - lines[idx].t) / lines[idx].dur, true);
    }
    raf = requestAnimationFrame(tick);
  }

  function toggle(force) {
    open = force ?? !open;
    overlay.classList.toggle("on", open);
    cancelAnimationFrame(raf);
    if (open) { syncControls(); load(); raf = requestAnimationFrame(tick); }
  }

  function onSong() {
    const item = Spicetify.Player.data?.item;
    if (!item) return;
    if (!item.uri.startsWith("spotify:track:")) { setButton(true); if (open) load(); return; }
    setButton(false);
    if (open) { load(); return; }
    clearTimeout(prefTimer);
    prefTimer = setTimeout(async () => {
      const id = curId();
      const d = await ensure(item);
      if (curId() === id && d === false) setButton(true);
    }, 700);
  }
  Spicetify.Player.addEventListener("songchange", onSong);
  setTimeout(onSong, 1500);
})();
