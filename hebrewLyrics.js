(function SpicyHebrew() {
  if (!Spicetify?.Player || !Spicetify?.CosmosAsync || !Spicetify?.Playbar) {
    setTimeout(SpicyHebrew, 300);
    return;
  }

  const CACHE = {};   
  const PENDING = {};
  const RAW = {};
  const LANGS = [
    ["he", "עברית"], ["en", "English"], ["ar", "العربية"], ["ru", "Русский"], ["uk", "Українська"], ["es", "Español"],
    ["fr", "Français"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"],
    ["tr", "Türkçe"], ["el", "Ελληνικά"], ["ro", "Română"], ["cs", "Čeština"], ["hu", "Magyar"], ["sv", "Svenska"],
    ["da", "Dansk"], ["no", "Norsk"], ["fi", "Suomi"], ["bg", "Български"], ["sr", "Српски"], ["hr", "Hrvatski"],
    ["sk", "Slovenčina"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["ur", "اردو"], ["fa", "فارسی"], ["th", "ไทย"],
    ["vi", "Tiếng Việt"], ["id", "Indonesia"], ["ms", "Melayu"], ["tl", "Filipino"], ["ja", "日本語"], ["ko", "한국어"],
    ["zh-CN", "中文 (简体)"], ["zh-TW", "中文 (繁體)"],
  ];
  const RTL = ["he", "ar", "fa", "ur"];
  let LANG = Spicetify.LocalStorage.get("spicyTargetLang") || "he";
  if (!LANGS.some((x) => x[0] === LANG)) LANG = "he";
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
  #heb-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px}
  #heb-langwrap{position:relative}
  #heb-lang{white-space:nowrap}
  #heb-langlist{display:none;position:absolute;top:calc(100% + 6px);inset-inline-start:0;min-width:140px;
    max-height:min(55vh,340px);overflow-y:auto;padding:5px;border-radius:14px;z-index:20;
    background:rgba(18,12,24,.8);background:color-mix(in srgb,var(--bg) 30%,rgba(10,8,14,.88));
    backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 32px rgba(0,0,0,.45);
    scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
  #heb-langlist.open{display:block}
  .heb-li{padding:6px 12px;border-radius:9px;font-size:13px;line-height:1.3;cursor:pointer;white-space:nowrap;
    unicode-bidi:plaintext;text-align:start;transition:background .12s}
  .heb-li:hover{background:rgba(255,255,255,.14)}
  .heb-li.sel{background:rgba(255,255,255,.22);font-weight:600}
  #heb-lyrics.ltr{direction:ltr}
  #heb-lyrics.ltr .heb-line{transform-origin:left center}
  #heb-lyrics.ltr .heb-line small{text-align:left}
  #heb-lyrics.ltr .w{background-image:linear-gradient(to right,#fff calc(var(--p,0)*112% - 12%),rgba(255,255,255,.4) calc(var(--p,0)*112%))}
  #heb-sync{display:flex;align-items:center;gap:4px;font-size:12px;direction:ltr}
  #heb-sync .heb-btn{padding:3px 10px}
  #heb-off{min-width:46px;text-align:center;opacity:.8}
  .heb-btn{font-family:inherit;background:rgba(255,255,255,.14);border:0;color:#fff;border-radius:999px;padding:4px 11px;
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
  .heb-line small{display:block;font-size:.42em;font-weight:400;color:rgba(255,255,255,.7);direction:ltr;text-align:right;margin-top:4px}
  .ow{display:inline-block;margin-inline-end:.3em;color:transparent;-webkit-background-clip:text;background-clip:text;
    background-image:linear-gradient(to right,rgba(255,255,255,.95) calc(var(--p,0)*112% - 12%),rgba(255,255,255,.4) calc(var(--p,0)*112%))}
  .heb-line.hide-orig small{display:none}
  .w{display:inline-block;margin-inline-end:.28em;color:transparent;
    -webkit-background-clip:text;background-clip:text;
    background-image:linear-gradient(to left,#fff calc(var(--p,0)*112% - 12%),rgba(255,255,255,.4) calc(var(--p,0)*112%));
    transition:transform .25s ease}
  .w.sing{transform:translateY(-3px) scale(1.06);filter:drop-shadow(0 0 10px rgba(255,255,255,.75))}
  #heb-lyrics.linemode .w,#heb-lyrics.linemode .ow{--p:1 !important}
  #heb-lyrics.linemode .w.sing{transform:none;filter:none}
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
          <div id="heb-langwrap"><button class="heb-btn" id="heb-lang" title="שפת תרגום"></button><div id="heb-langlist"></div></div>
          <button class="heb-btn" id="heb-orig">מקור: פעיל</button>
          <button class="heb-btn" id="heb-mode"></button>
          <span id="heb-sync"><button class="heb-btn" id="heb-sm">−</button><span id="heb-off"></span><button class="heb-btn" id="heb-sp">+</button></span>
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

  overlay.querySelector("#heb-close").addEventListener("click", () => toggle(false));
  overlay.querySelector("#heb-orig").addEventListener("click", (e) => {
    showOriginal = !showOriginal;
    e.target.textContent = "מקור: " + (showOriginal ? "פעיל" : "כבוי");
    listEl.querySelectorAll(".heb-line").forEach((l) => l.classList.toggle("hide-orig", !showOriginal));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) toggle(false); });

  const langBtn = overlay.querySelector("#heb-lang");
  const langList = overlay.querySelector("#heb-langlist");
  const applyDir = () => {
    const cur = LANGS.find((x) => x[0] === LANG) || LANGS[0];
    langBtn.textContent = cur[1] + " ▾";
    langList.querySelectorAll(".heb-li").forEach((el) => el.classList.toggle("sel", el.dataset.code === LANG));
    overlay.classList.toggle("ltr", !RTL.includes(LANG.split("-")[0]));
  };
  const setLang = (code) => {
    if (code === LANG) return;
    LANG = code;
    Spicetify.LocalStorage.set("spicyTargetLang", LANG);
    applyDir();
    if (open) load();
  };
  LANGS.forEach(([code, name]) => {
    const d = document.createElement("div");
    d.className = "heb-li";
    d.dataset.code = code;
    d.textContent = name;
    d.addEventListener("click", () => setLang(code));
    langList.appendChild(d);
  });
  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langList.classList.toggle("open");
    const sel = langList.querySelector(".sel");
    if (sel) langList.scrollTop = sel.offsetTop - langList.clientHeight / 2 + sel.offsetHeight / 2;
  });
  overlay.addEventListener("click", () => langList.classList.remove("open"));
  applyDir();

  let offset = Number(Spicetify.LocalStorage.get("spicyHebrewOffset")) || 0;
  const offEl = overlay.querySelector("#heb-off");
  const showOffset = () => { offEl.textContent = (offset > 0 ? "+" : "") + (offset / 1000).toFixed(2) + "s"; };
  const nudge = (d) => { offset += d; Spicetify.LocalStorage.set("spicyHebrewOffset", String(offset)); showOffset(); };
  overlay.querySelector("#heb-sm").addEventListener("click", () => nudge(-250));
  overlay.querySelector("#heb-sp").addEventListener("click", () => nudge(250));
  showOffset();

  let lineMode = Spicetify.LocalStorage.get("spicyHebrewLineMode") === "1";
  const modeBtn = overlay.querySelector("#heb-mode");
  const showMode = () => {
    overlay.classList.toggle("linemode", lineMode);
    modeBtn.textContent = "מצב: " + (lineMode ? "שורה-שורה" : "מילה-מילה");
  };
  modeBtn.addEventListener("click", () => {
    lineMode = !lineMode;
    Spicetify.LocalStorage.set("spicyHebrewLineMode", lineMode ? "1" : "0");
    showMode();
  });
  showMode();

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
  const btn = new Spicetify.Playbar.Button("תרגום מילים", icon, () => toggle());
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

  function spotifyWords(l, nextT) {
    const syl = (l.syllables || []).map((x) => ({ t: Number(x.startTimeMs), n: Number(x.numChars) || 0 }));
    if (!syl.length || !l.words) return null;
    let c = 0;
    syl.forEach((x) => { x.c = c; c += x.n; });
    const end = Number(l.endTimeMs) || nextT || null;
    const out = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(l.words))) {
      const first = m.index, last = m.index + m[0].length - 1;
      let a = 0, z = 0;
      syl.forEach((x, i) => { if (x.c <= first) a = i; if (x.c <= last) z = i; });
      out.push({ b: syl[a].t, e: syl[z + 1] ? syl[z + 1].t : end, w: m[0] });
    }
    return out;
  }

  async function fromSpotify(id) {
    try {
      const res = await Spicetify.CosmosAsync.get(`https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}?format=json&vocalRemoval=false&market=from_token`);
      const L = res?.lyrics;
      const raw = L?.lines || [];
      const sy = L?.syncType === "SYLLABLE_SYNCED";
      const arr = raw.map((l, i) => ({
        t: Number(l.startTimeMs), w: l.words,
        words: sy ? spotifyWords(l, raw[i + 1] ? Number(raw[i + 1].startTimeMs) : null) : null,
      })).filter((l) => l.w && l.w.trim() && l.w.trim() !== "♪");
      if (arr.length) return { lines: arr, synced: L.syncType !== "UNSYNCED", word: arr.some((l) => l.words && l.words.length) };
    } catch (e) {}
    return null;
  }

  const tms = (s) => {
    if (!s) return null;
    const p = s.trim().replace(/s$/, "").split(":").map(Number);
    if (p.some(isNaN)) return null;
    let sec = 0;
    p.forEach((x) => { sec = sec * 60 + x; });
    return Math.round(sec * 1000);
  };

  function parseTTML(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return null;
    const roleOf = (el) => {
      for (let n = el; n && n.nodeType === 1 && n.localName !== "p"; n = n.parentNode) {
        const r = n.getAttribute("ttm:role") || n.getAttribute("role");
        if (r) return r;
      }
      return "";
    };
    const out = [];
    doc.querySelectorAll("p").forEach((p) => {
      const acc = { main: { w: [], c: null }, bg: { w: [], c: null } };
      p.querySelectorAll("span[begin]").forEach((sp) => {
        const role = roleOf(sp);
        if (role === "x-translation" || role === "x-roman" || sp.querySelector("span[begin]")) return;
        const b = tms(sp.getAttribute("begin")), e = tms(sp.getAttribute("end"));
        const text = sp.textContent;
        if (b === null || !text.trim()) return;
        const n = sp.nextSibling;
        const boundary = !n || /\s$/.test(text) ||
          (n.nodeType === 3 ? /^\s/.test(n.nodeValue) : !(n.nodeType === 1 && n.hasAttribute("begin")));
        const a = role === "x-bg" ? acc.bg : acc.main;
        if (!a.c) a.c = { b, e: e ?? b, w: "" };
        a.c.w += text.trim();
        if (e !== null) a.c.e = e;
        if (boundary) { a.w.push(a.c); a.c = null; }
      });
      let any = false;
      ["main", "bg"].forEach((k) => {
        const a = acc[k];
        if (a.c) a.w.push(a.c);
        if (a.w.length) { any = true; out.push({ t: a.w[0].b, w: a.w.map((x) => x.w).join(" "), words: a.w }); }
      });
      if (!any) {
        const b = tms(p.getAttribute("begin")), text = p.textContent.trim();
        if (b !== null && text) out.push({ t: b, w: text });
      }
    });
    return out.sort((x, y) => x.t - y.t);
  }

  async function fromAmll(id) {
    const bases = ["https://raw.githubusercontent.com/amll-dev/amll-ttml-db/refs/heads/main", "https://amlldb.bikonoo.com"];
    for (const base of bases) {
      const xml = await getText(`${base}/spotify-lyrics/${id}.ttml`);
      if (xml && xml.includes("<tt")) {
        const L = parseTTML(xml);
        if (L && L.length) return { lines: L, synced: true, word: L.some((l) => l.words && l.words.length) };
      }
    }
    return null;
  }

  function fixEnds(arr) {
    arr.forEach((l, i) => {
      if (!l.words) return;
      const lineNext = arr[i + 1] ? arr[i + 1].t : null;
      l.words.forEach((w, k) => {
        if (w.e && w.e > w.b) return;
        const next = l.words[k + 1] ? l.words[k + 1].b : lineNext;
        w.e = next && next > w.b ? Math.min(next, w.b + 4000) : w.b + 600;
      });
    });
  }

  const syl = (w) => {
    const m = w.toLowerCase().match(/[aeiouyаеёиоуыэюяáéíóúàèìòùâêîôûäöüåæœ]+/g);
    return Math.max(1, m ? m.length : Math.ceil(w.length / 3));
  };

  const lowerBound = (arr, t) => {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].t < t) lo = mid + 1; else hi = mid; }
    return lo;
  };

  async function loadOnsets(uri) {
    try {
      const an = await Spicetify.getAudioData(uri);
      return (an?.segments || []).filter((x) => x.confidence >= 0.35).map((x) => ({
        t: Math.round(x.start * 1000),
        k: Math.max(0.5, x.loudness_max - x.loudness_start) * x.confidence,
      }));
    } catch (e) { return []; }
  }

  function estimateWords(l, nextT, onsets) {
    const ws = l.w.split(/\s+/).filter(Boolean);
    if (!ws.length) return null;
    const cum = [0];
    ws.map(syl).forEach((x) => cum.push(cum[cum.length - 1] + x));
    const tot = cum[cum.length - 1];
    const S = tot * 280;
    const gap = nextT ? nextT - l.t : 0;
    const end = gap > 0 && gap <= S + 1500 ? l.t + gap - 80 : l.t + Math.max(600, S);
    const starts = ws.map((_, i) => l.t + ((end - l.t) * cum[i]) / tot);
    if (onsets.length) {
      let prev = l.t;
      for (let i = 1; i < ws.length; i++) {
        const ideal = starts[i];
        const tol = Math.max(40, 0.4 * Math.min(ideal - starts[i - 1], (i + 1 < ws.length ? starts[i + 1] : end) - ideal));
        let best = null, bestScore = 0;
        for (let k = lowerBound(onsets, ideal - tol); k < onsets.length && onsets[k].t <= ideal + tol; k++) {
          const o = onsets[k];
          if (o.t <= prev + 120 || o.t >= end - 120) continue;
          const sc = o.k / (1 + Math.abs(o.t - ideal) / tol);
          if (sc > bestScore) { bestScore = sc; best = o.t; }
        }
        if (best !== null) starts[i] = best;
        prev = starts[i];
      }
    }
    return ws.map((w, i) => ({ b: Math.round(starts[i]), e: Math.round(i + 1 < ws.length ? starts[i + 1] : end), w }));
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

  async function translate(texts, lang) {
    const out = [];
    for (let i = 0; i < texts.length; i += 25) {
      const chunk = texts.slice(i, i + 25);
      const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent(lang) + "&dt=t&q=" + encodeURIComponent(chunk.join("\n"));
      const j = await (await fetch(url)).json();
      const parts = j[0].map((x) => x[0]).join("").split("\n");
      chunk.forEach((_, k) => out.push((parts[k] || "").trim()));
    }
    return out;
  }

  function ensure(item) {
    const id = item.uri.split(":").pop();
    const lang = LANG;
    const key = id + "|" + lang;
    if (key in CACHE) return Promise.resolve(CACHE[key]);
    if (PENDING[key]) return PENDING[key];
    PENDING[key] = (async () => {
      try {
        let found = RAW[id];
        if (found === undefined) {
          const artists = (item.artists || []).map((a) => a.name);
          const name = clean(item.name) || item.name, artist = artists[0] || "";
          const dur = item.duration_ms || item.duration?.milliseconds || Spicetify.Player.getDuration();
          found = await fromSpotify(id);
          if (!found || !found.word) {
            const w = await fromAmll(id);
            if (w) found = w;
          }
          found = found || (await fromLrclib(name, artist, dur)) || (await fromOvh(name, artist)) ||
            (await fromGoogle(name, artist)) || (await fromGenius(name, artist));
          if (found) {
            fixEnds(found.lines);
            if (found.synced && found.lines.some((l) => !(l.words && l.words.length))) {
              const onsets = await loadOnsets(item.uri);
              found.lines.forEach((l, i) => {
                if (!(l.words && l.words.length)) l.words = estimateWords(l, found.lines[i + 1]?.t, onsets);
              });
              found.audio = onsets.length > 0;
            }
          }
          RAW[id] = found || false;
        }
        if (!found) { CACHE[key] = false; return false; }
        const heb = await translate(found.lines.map((l) => l.w), lang);
        return (CACHE[key] = {
          synced: found.synced, word: !!found.word, audio: !!found.audio,
          lines: found.lines.map((l, i) => ({ t: l.t, orig: l.w, heb: heb[i] || l.w, words: l.words })),
        });
      } catch (e) {
        console.error("SpicyHebrew", e);
        return null;
      } finally { delete PENDING[key]; }
    })();
    return PENDING[key];
  }

  const curId = () => Spicetify.Player.data?.item?.uri.split(":").pop();

  function render(d) {
    synced = d.synced;
    lines = d.lines;
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
      el._ow = [];
      if (l.words && l.words.length) {
        const ws = l.words.map((x) => Math.max(1, x.w.length));
        const tot = ws.reduce((a, b) => a + b, 0);
        const cum = [0];
        ws.forEach((x) => cum.push(cum[cum.length - 1] + x));
        l.prog = (pos) => {
          for (let k = 0; k < l.words.length; k++) {
            const w = l.words[k];
            if (pos < w.b) return cum[k] / tot;
            if (pos < w.e) return (cum[k] + ((pos - w.b) / Math.max(1, w.e - w.b)) * ws[k]) / tot;
          }
          return 1;
        };
      }
      if (l.orig.trim() !== l.heb.trim()) {
        const small = document.createElement("small");
        if (l.words && l.words.length) {
          l.words.forEach((x) => {
            const o = document.createElement("span");
            o.className = "ow";
            o.textContent = x.w;
            if (!synced) o.style.setProperty("--p", 1);
            small.appendChild(o);
            el._ow.push({ el: o, b: x.b, e: x.e });
          });
        } else small.textContent = l.orig;
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
    listEl.innerHTML = ""; lines = []; lineEls = []; activeIdx = -1;
    msg.textContent = (id + "|" + LANG) in CACHE ? "" : "טוען...";

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
  function setOrig(el, pos) {
    el._ow.forEach((o) => o.el.style.setProperty("--p", pos === 1 || pos === 0 ? pos : Math.max(0, Math.min(1, (pos - o.b) / Math.max(1, o.e - o.b)))));
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
          if (i !== idx) { setLine(el, i < idx ? 1 : 0, false); setOrig(el, i < idx ? 1 : 0); }
        });
        if (lineEls[idx]) centerOn(lineEls[idx]);
      }
      if (idx >= 0 && lineEls[idx]) {
        const l = lines[idx], el = lineEls[idx];
        if (l.prog) {
          setLine(el, l.prog(pos), true);
          el._ow.forEach((o) => o.el.style.setProperty("--p", Math.max(0, Math.min(1, (pos - o.b) / Math.max(1, o.e - o.b)))));
        } else setLine(el, (pos - l.t) / l.dur, true);
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function toggle(force) {
    open = force ?? !open;
    overlay.classList.toggle("on", open);
    if (!open) langList.classList.remove("open");
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
  let scanning = false;
  async function scanPlaylist(uri) {
    if (scanning) { Spicetify.showNotification("סריקה כבר רצה"); return; }
    scanning = true;
    try {
      const id = uri.split(":").pop();
      let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
      const items = [];
      while (url) {
        const r = await Spicetify.CosmosAsync.get(url);
        (r.items || []).forEach((x) => {
          if (x.track && x.track.uri && x.track.uri.startsWith("spotify:track:")) items.push(x.track);
        });
        url = r.next;
      }
      if (!items.length) { Spicetify.showNotification("לא נמצאו שירים בפלייליסט"); return; }
      const groups = { exact: [], est: [], plain: [], none: [], err: [] };
      let done = 0, next = 0;
      const worker = async () => {
        while (next < items.length) {
          const it = items[next++];
          const d = await ensure(it);
          const g = d === false ? "none" : !d ? "err" : d.word ? "exact" : d.synced ? "est" : "plain";
          groups[g].push(`${it.artists?.[0]?.name || ""} - ${it.name}`);
          done++;
          if (done % 5 === 0) Spicetify.showNotification(`סורק מילים... ${done}/${items.length}`);
        }
      };
      await Promise.all([worker(), worker()]);
      const names = { exact: "תזמון מילים מדויק", est: "תזמון משוער", plain: "מילים ללא סנכרון", none: "לא נמצאו מילים", err: "שגיאה" };
      const report = Object.keys(names).filter((k) => groups[k].length)
        .map((k) => `${names[k]} (${groups[k].length}):\n` + groups[k].map((x) => "• " + x).join("\n")).join("\n\n");
      try { Spicetify.Platform.ClipboardAPI.copy(report); } catch (e) { try { await navigator.clipboard.writeText(report); } catch (e2) {} }
      Spicetify.showNotification(`הסריקה הסתיימה: ${items.length} שירים | מדויק ${groups.exact.length} | משוער ${groups.est.length} | ללא סנכרון ${groups.plain.length} | אין מילים ${groups.none.length}. הדוח הועתק ללוח`);
    } catch (e) {
      console.error("SpicyHebrew", e);
      Spicetify.showNotification("שגיאה בסריקת הפלייליסט", true);
    } finally { scanning = false; }
  }

  new Spicetify.ContextMenu.Item(
    "סרוק מילים בעברית לפלייליסט",
    (uris) => scanPlaylist(uris[0]),
    (uris) => uris.length === 1 && Spicetify.URI.isPlaylistV1OrV2(uris[0])
  ).register();

  Spicetify.Player.addEventListener("songchange", onSong);
  setTimeout(onSong, 1500);
})();
