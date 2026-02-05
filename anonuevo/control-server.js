try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (e) { /* dotenv opcional */ }

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Intentar cargar la librería de IA (Graceful degradation)
let GoogleGenerativeAI;
try {
    const genAI = require('@google/generative-ai');
    GoogleGenerativeAI = genAI.GoogleGenerativeAI;
} catch (e) {
    console.log("⚠️ Generative AI SDK not found.");
}

const PORT = 3005;
const DATA_FILE = path.join(__dirname, 'data', 'living-script.json');
const STATE_FILE = path.join(__dirname, 'data', 'server-state.json');
const COUNTRY_MEMORIES_DIR = path.join(__dirname, 'data', 'country-memories');
const STORY_BIBLE_FILE = path.join(__dirname, 'data', 'story-bible.json');
const STORY_STATE_FILE = path.join(__dirname, 'data', 'story-state.json');
const CLIP_MARKERS_FILE = path.join(__dirname, 'data', 'clip-markers.json');
const MEDIA_MEMORY_FILE = path.join(__dirname, 'data', 'media-memory.json');
const LIVE_VISITS_DIR = path.join(__dirname, 'vivos', 'visitas');
const LIVE_VISITS_INDEX_FILE = path.join(LIVE_VISITS_DIR, 'index.json');

// Mapa mínimo de países (códigos ISO numéricos como strings) para prompts del control.
// Nota: el frontend hoy expone este set en el selector; si llega un código fuera de esta lista,
// el sistema igual funciona (usa el código como fallback) pero evita 500s.
const COUNTRY_INFO = {
    "032": { name: "Argentina" },
    "076": { name: "Brazil" },
    "840": { name: "USA" },
    "156": { name: "China" },
    "392": { name: "Japan" },
    "250": { name: "France" },
    "276": { name: "Germany" },
    "380": { name: "Italy" },
    "724": { name: "Spain" },
    "826": { name: "UK" },
    "643": { name: "Russia" },
    "356": { name: "India" },
    "036": { name: "Australia" },
    "124": { name: "Canada" },
    "484": { name: "Mexico" },
    "710": { name: "South Africa" }
};

// Pool ampliado (id -> name) para viajes globales. Se intenta cargar desde world-atlas TSV.
let WORLD_COUNTRIES = null; // Map<string,string>
async function ensureWorldCountries() {
    if (WORLD_COUNTRIES) return WORLD_COUNTRIES;
    try {
        // world-atlas no expone TSV con nombres; cargamos desde el mapping local del frontend
        const fp = path.join(__dirname, 'js', 'data', 'country-info.js');
        if (!fs.existsSync(fp)) {
            WORLD_COUNTRIES = null;
            return null;
        }
        const src = fs.readFileSync(fp, 'utf8');
        const map = new Map();
        // extraer "NNN": { ... name: "X"
        const re = /"(\d{3})"\s*:\s*\{[\s\S]{0,220}?name\s*:\s*"([^"]{1,80})"/g;
        let m;
        while ((m = re.exec(src))) {
            const id = String(m[1] || '').trim();
            const name = String(m[2] || '').trim();
            if (id && name) map.set(id, name);
        }
        WORLD_COUNTRIES = map.size ? map : null;
        return WORLD_COUNTRIES;
    } catch (e) {
        WORLD_COUNTRIES = null;
        return null;
    }
}

// Asegurar que el directorio de memorias existe
if (!fs.existsSync(COUNTRY_MEMORIES_DIR)) {
    fs.mkdirSync(COUNTRY_MEMORIES_DIR, { recursive: true });
}

// Estado Global
let state = {
    autoMode: false, currentScene: 'intro', eventQueue: [], travelQueue: [],
    clientTelemetry: { scene: 'UNKNOWN', country: 'UNKNOWN', day: 0, lastUpdate: 0 },
    editorial: { status: 'IDLE', dayId: null, isTest: false, startTime: null, visits: [], currentVisit: null },
    music: { isPlaying: false, currentTrack: 0, command: null }, // Comando de música pendiente
    showRunner: { active: false, mission: '', startedAt: 0 }
};

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// =========================
// Provider diagnostics (para no “tragar” errores y poder ver por qué están OFFLINE)
// =========================
const PROVIDER_LAST_ERROR = new Map(); // name -> { ts, type, status?, code?, message?, bodyPreview? }

function setProviderError(name, info) {
    try {
        const clean = {
            ts: Date.now(),
            type: info?.type || 'error',
            status: typeof info?.status === 'number' ? info.status : undefined,
            code: info?.code ? String(info.code).slice(0, 60) : undefined,
            message: info?.message ? String(info.message).slice(0, 300) : undefined,
            bodyPreview: info?.bodyPreview ? String(info.bodyPreview).slice(0, 700) : undefined
        };
        PROVIDER_LAST_ERROR.set(String(name || 'unknown'), clean);
    } catch (e) { }
}

function clearProviderError(name) {
    try { PROVIDER_LAST_ERROR.delete(String(name || 'unknown')); } catch (e) { }
}

function getProviderError(name) {
    return PROVIDER_LAST_ERROR.get(String(name || 'unknown')) || null;
}

// =========================
// REAL-TIME OBSERVER (NEWS / TRENDS / CULTURE / SCI-TECH / HEALTH / SECURITY)
// =========================
// Objetivo: agregar señales “en tiempo real” sin intervención humana:
// - Noticias / agenda (Google News RSS por tópico/búsqueda)
// - Tendencias sociales (Google Trends RSS)
// - Cultura (feriados + “on this day”)
// - Ciencia/tech (arXiv RSS)
// - Seguridad (CISA KEV JSON)
// - Salud pública (Google News HEALTH + CDC EID RSS)
//
// Nota: evitamos dependencias externas (parser RSS simple).

const OBSERVER_CACHE = new Map(); // key -> { ts, value }
const OBSERVER_TTL_MS = 8 * 60 * 1000; // 8 min: suficiente para “live” sin golpear upstream

function nowIso() { return new Date().toISOString(); }

function stripHtml(s) {
    return String(s || '')
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function safeSlice(s, n = 260) {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80) || 'visita';
}

function ensureDir(p) {
    try { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); } catch (e) { }
}

function readJsonSafe(fp, fallback) {
    try {
        if (!fs.existsSync(fp)) return fallback;
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
        return fallback;
    }
}

function writeJsonSafe(fp, obj) {
    try {
        ensureDir(path.dirname(fp));
        fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

function buildVisitHtml({ title, subtitle, seed, body, countryId, countryName, createdAtIso }) {
    const safeTitle = String(title || 'Visita').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSub = String(subtitle || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeBody = String(body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const theme = `Visita: ${countryName || countryId || ''}`.slice(0, 60);
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body{margin:0;background:#050510;color:#eaeaea;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial}
    header{padding:18px 18px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.35);backdrop-filter:blur(10px)}
    h1{margin:0;font-family:'JetBrains Mono',monospace;font-size:1.05rem}
    .sub{opacity:.75;margin-top:6px;font-size:.9rem}
    main{display:grid;grid-template-columns:1fr;gap:14px;padding:18px;max-width:980px;margin:0 auto}
    .card{border:1px solid rgba(255,255,255,.10);border-radius:14px;overflow:hidden;background:rgba(0,0,0,.25);box-shadow:0 12px 40px rgba(0,0,0,.45)}
    canvas{display:block;width:100%;height:auto}
    .meta{padding:10px 12px;font-family:'JetBrains Mono',monospace;font-size:.78rem;opacity:.8}
    .text{padding:14px 12px 18px;line-height:1.55;font-size:1.02rem}
    a{color:#4fecff}
  </style>
</head>
<body>
  <header>
    <h1>${safeTitle}</h1>
    <div class="sub">${safeSub}</div>
  </header>
  <main>
    <div class="card">
      <canvas id="c" width="960" height="540"></canvas>
      <div class="meta">seed=${seed} · ${createdAtIso} · country=${countryName || countryId || '—'}</div>
    </div>
    <div class="card">
      <div class="text">${safeBody}</div>
    </div>
  </main>
  <script>
    (function(){
      const seed0 = ${Number(seed || Date.now())};
      let s = (seed0 >>> 0) || 1;
      const rnd = ()=>{ s^=s<<13; s>>>=0; s^=s>>17; s>>>=0; s^=s<<5; s>>>=0; return (s>>>0)/4294967296; };
      const c = document.getElementById('c'); const ctx = c.getContext('2d');
      const w=c.width,h=c.height;
      ctx.fillStyle='#050510'; ctx.fillRect(0,0,w,h);
      for(let i=0;i<6;i++){
        const x=rnd()*w,y=rnd()*h,r=120+rnd()*420;
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        const c1='rgba('+Math.floor(60+rnd()*80)+','+Math.floor(160+rnd()*90)+','+Math.floor(200+rnd()*55)+','+(0.06+rnd()*0.12)+')';
        g.addColorStop(0,c1); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      }
      ctx.lineWidth=1;
      for(let i=0;i<40;i++){
        const x0=rnd()*w,y0=rnd()*h,x1=rnd()*w,y1=rnd()*h;
        ctx.strokeStyle='rgba(64,188,216,'+(0.08+rnd()*0.18)+')';
        ctx.beginPath(); ctx.moveTo(x0,y0);
        const cx=(x0+x1)/2+(rnd()-0.5)*220, cy=(y0+y1)/2+(rnd()-0.5)*180;
        ctx.quadraticCurveTo(cx,cy,x1,y1); ctx.stroke();
      }
      ctx.fillStyle='rgba(255,255,255,0.72)';
      ctx.font='16px JetBrains Mono, monospace';
      ctx.fillText(${JSON.stringify(theme)}, 18, h-18);
    })();
  </script>
</body>
</html>`;
}

async function createLiveVisitPage({ countryId, countryName, seed, mission, telemetry, urlBase = '/vivos/visitas/' }) {
    ensureDir(LIVE_VISITS_DIR);

    const when = new Date();
    const createdAtIso = when.toISOString();
    const name = String(countryName || countryId || 'Lugar').trim().slice(0, 60);
    const slug = slugify(`${name}-${when.toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1e6)}`);
    const dir = path.join(LIVE_VISITS_DIR, slug);
    ensureDir(dir);

    // Texto (local) para bitácora: no inventar hechos, hablar de “lo visible” + intención
    const prompt = `Bitácora breve. País en pantalla: ${name}. Escena: mapa/globo. Comentá lo visible (luces, costas, sombras, relieve, rutas) y dejá 1 tema próximo.`;
    const narrative = await dreamWithLocalEngine(prompt);
    const body = String(narrative || '').replace(/^\s*\[ILFASS\]:\s*/i, '').trim();

    const title = `Visita — ${name}`;
    const subtitle = mission ? `Misión: ${String(mission).slice(0, 160)}` : `Registro en vivo (${createdAtIso.slice(0, 19).replace('T', ' ')})`;
    const html = buildVisitHtml({
        title,
        subtitle,
        seed: Number(seed || Date.now()),
        body,
        countryId,
        countryName: name,
        createdAtIso
    });

    const fp = path.join(dir, 'index.html');
    fs.writeFileSync(fp, html);

    const entry = {
        slug,
        url: `${String(urlBase).replace(/\/+$/, '/')}${slug}/`,
        title,
        countryId: String(countryId || ''),
        countryName: name,
        createdAt: createdAtIso,
        seed: Number(seed || Date.now()),
        telemetry: {
            lon: telemetry?.lon ?? null,
            lat: telemetry?.lat ?? null
        }
    };

    const idx = readJsonSafe(LIVE_VISITS_INDEX_FILE, { visits: [] });
    const visits = Array.isArray(idx?.visits) ? idx.visits : [];
    visits.unshift(entry);
    idx.visits = visits.slice(0, 200);
    writeJsonSafe(LIVE_VISITS_INDEX_FILE, idx);

    // índice HTML simple
    const indexHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visitas</title><style>body{margin:0;background:#050510;color:#eaeaea;font-family:Inter,system-ui}header{padding:16px;border-bottom:1px solid rgba(255,255,255,.1)}main{max-width:980px;margin:0 auto;padding:16px}a{color:#4fecff;text-decoration:none}li{margin:10px 0}small{opacity:.75;font-family:JetBrains Mono,monospace}</style></head><body><header><h1>Visitas (autogeneradas)</h1></header><main><ul>${idx.visits.map(v=>`<li><a href="${v.url}">${String(v.title).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</a><br><small>${v.createdAt} · ${String(v.countryName||v.countryId||'')}</small></li>`).join('')}</ul></main></body></html>`;
    fs.writeFileSync(path.join(LIVE_VISITS_DIR, 'index.html'), indexHtml);

    return entry;
}

function parseXmlItems(xml, itemTag) {
    const items = [];
    const re = new RegExp(`<${itemTag}\\b[\\s\\S]*?<\\/${itemTag}>`, 'gi');
    const matches = xml.match(re) || [];
    for (const chunk of matches) items.push(chunk);
    return items;
}

function extractTag(chunk, tag) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = chunk.match(re);
    return m ? stripHtml(m[1]) : '';
}

function extractAttr(chunk, tag, attr) {
    // Ej: <link href="..."/>
    const re = new RegExp(`<${tag}\\b[^>]*\\s${attr}="([^"]+)"[^>]*\\/?>`, 'i');
    const m = chunk.match(re);
    return m ? String(m[1] || '').trim() : '';
}

function parseRssOrAtom(xmlText) {
    const xml = String(xmlText || '');
    const isAtom = /<feed\b/i.test(xml) && /<entry\b/i.test(xml);

    const chunks = isAtom ? parseXmlItems(xml, 'entry') : parseXmlItems(xml, 'item');
    const out = [];

    for (const c of chunks) {
        const title = safeSlice(extractTag(c, 'title'), 220);
        const summary = safeSlice(extractTag(c, isAtom ? 'summary' : 'description'), 420);
        const link = safeSlice(
            (isAtom ? (extractAttr(c, 'link', 'href') || extractTag(c, 'link')) : extractTag(c, 'link')),
            500
        );
        const publishedAt =
            safeSlice(extractTag(c, isAtom ? 'updated' : 'pubDate'), 60) ||
            safeSlice(extractTag(c, 'published'), 60);

        if (!title) continue;
        out.push({ title, summary, link, publishedAt });
    }

    return out;
}

async function fetchTextWithTimeout(url, timeoutMs = 12000, headers = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const r = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'ilfass-control-server/observer (+https://local)',
                'Accept': 'text/html,application/xml,text/xml,application/json;q=0.9,*/*;q=0.8',
                ...headers
            }
        });
        const text = await r.text();
        return { ok: r.ok, status: r.status, text };
    } finally {
        clearTimeout(t);
    }
}

async function fetchJsonWithTimeout(url, timeoutMs = 12000, headers = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const r = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'ilfass-control-server/observer (+https://local)',
                'Accept': 'application/json,*/*;q=0.8',
                ...headers
            }
        });
        const json = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, json };
    } finally {
        clearTimeout(t);
    }
}

async function cached(key, ttlMs, loaderFn) {
    const hit = OBSERVER_CACHE.get(key);
    if (hit && (Date.now() - hit.ts) < ttlMs) return hit.value;
    const value = await loaderFn();
    OBSERVER_CACHE.set(key, { ts: Date.now(), value });
    return value;
}

function googleNewsBase({ hl = 'es-419', gl = 'US', ceid = 'US:es-419' } = {}) {
    // hl: idioma (ej: es-419), gl: país (ISO2), ceid: ${gl}:${lang}
    return `https://news.google.com/rss?hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
}

function googleNewsTopicUrl(topic, opts) {
    // topic: WORLD, TECHNOLOGY, SCIENCE, HEALTH, ENTERTAINMENT...
    return `https://news.google.com/rss/headlines/section/topic/${encodeURIComponent(topic)}?hl=${encodeURIComponent(opts.hl)}&gl=${encodeURIComponent(opts.gl)}&ceid=${encodeURIComponent(opts.ceid)}`;
}

function googleNewsSearchUrl(query, opts) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(opts.hl)}&gl=${encodeURIComponent(opts.gl)}&ceid=${encodeURIComponent(opts.ceid)}`;
}

function buildLocale({ lang = 'es-419', geo = 'US' } = {}) {
    const gl = String(geo || 'US').toUpperCase().slice(0, 2);
    const hl = String(lang || 'es-419');
    // ceid necesita idioma corto (ej: "es" o "en")
    const langShort = hl.split('-')[0] || 'es';
    const ceid = `${gl}:${langShort}`;
    return { hl, gl, ceid };
}

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
        .split(/\s+/)
        .map(s => s.trim())
        .filter(Boolean);
}

const STOPWORDS = new Set([
    // ES
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus',
    // EN
    'the', 'and', 'to', 'of', 'in', 'a', 'for', 'on', 'with', 'as', 'by', 'is', 'at', 'from', 'it', 'an', 'be', 'are', 'was', 'were', 'or', 'that', 'this', 'these', 'those', 'has', 'have', 'had', 'but', 'not', 'will', 'can', 'may', 'about', 'into', 'over', 'after', 'before', 'more', 'most', 'new', 'today', 'now'
]);

function topKeywords(items, limit = 10) {
    const counts = new Map();
    for (const it of (items || [])) {
        const tokens = tokenize(`${it.title || ''} ${it.summary || ''}`);
        for (const tok of tokens) {
            if (tok.length < 3) continue;
            if (STOPWORDS.has(tok)) continue;
            if (/^\d+$/.test(tok)) continue;
            counts.set(tok, (counts.get(tok) || 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([k, c]) => ({ keyword: k, count: c }));
}

async function fetchGoogleNewsTopic(topic, locale) {
    const url = googleNewsTopicUrl(topic, locale);
    const r = await fetchTextWithTimeout(url, 12000);
    if (!r.ok) return [];
    const parsed = parseRssOrAtom(r.text);
    return parsed.map(x => ({
        kind: 'news',
        topic,
        title: x.title,
        summary: x.summary,
        url: x.link,
        publishedAt: x.publishedAt,
        source: 'Google News'
    }));
}

async function fetchGoogleNewsSearch(query, locale) {
    const url = googleNewsSearchUrl(query, locale);
    const r = await fetchTextWithTimeout(url, 12000);
    if (!r.ok) return [];
    const parsed = parseRssOrAtom(r.text);
    return parsed.map(x => ({
        kind: 'news',
        topic: 'SEARCH',
        title: x.title,
        summary: x.summary,
        url: x.link,
        publishedAt: x.publishedAt,
        source: 'Google News'
    }));
}

async function fetchGoogleTrendsDaily(geo = 'US') {
    const g = String(geo || 'US').toUpperCase().slice(0, 2);
    const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${encodeURIComponent(g)}`;
    const r = await fetchTextWithTimeout(url, 12000);
    if (!r.ok) return [];
    const parsed = parseRssOrAtom(r.text);
    return parsed.map(x => ({
        kind: 'trend',
        geo: g,
        title: x.title,
        summary: x.summary,
        url: x.link,
        publishedAt: x.publishedAt,
        source: 'Google Trends'
    }));
}

async function fetchArxivRss(subject = 'cs.ai+cs.lg') {
    const s = String(subject || 'cs.ai').toLowerCase().replace(/[^a-z0-9+._-]/g, '');
    const url = `https://rss.arxiv.org/rss/${encodeURIComponent(s)}`;
    const r = await fetchTextWithTimeout(url, 12000);
    if (!r.ok) return [];
    const parsed = parseRssOrAtom(r.text);
    return parsed.map(x => ({
        kind: 'scitech',
        title: x.title,
        summary: x.summary,
        url: x.link,
        publishedAt: x.publishedAt,
        source: `arXiv (${s})`
    }));
}

async function fetchCisaKev(days = 30) {
    const d = Math.max(1, Math.min(180, Number(days) || 30));
    const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
    const r = await fetchJsonWithTimeout(url, 12000);
    if (!r.ok || !r.json) return [];
    const items = Array.isArray(r.json?.vulnerabilities) ? r.json.vulnerabilities : [];
    const cutoff = Date.now() - (d * 24 * 60 * 60 * 1000);
    return items
        .filter(v => {
            const ts = Date.parse(v?.dateAdded || '') || 0;
            return ts >= cutoff;
        })
        .slice(0, 30)
        .map(v => ({
            kind: 'security',
            title: safeSlice(`${v.cveID || 'CVE'} — ${v.vendorProject || 'Vendor'} ${v.product || ''}`, 220),
            summary: safeSlice(v.shortDescription || v.vulnerabilityName || '', 420),
            url: safeSlice(v?.notes || '', 300) || null,
            publishedAt: v?.dateAdded || '',
            source: 'CISA KEV'
        }));
}

async function fetchCdcEidRss() {
    const url = 'http://wwwnc.cdc.gov/eid/rss/ahead-of-print.xml';
    const r = await fetchTextWithTimeout(url, 12000);
    if (!r.ok) return [];
    const parsed = parseRssOrAtom(r.text);
    return parsed.map(x => ({
        kind: 'health',
        title: x.title,
        summary: x.summary,
        url: x.link,
        publishedAt: x.publishedAt,
        source: 'CDC EID'
    }));
}

async function fetchWikipediaOnThisDay(lang = 'es', type = 'events') {
    const l = String(lang || 'es').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 12) || 'es';
    const t = new Date();
    const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(t.getUTCDate()).padStart(2, '0');
    const tp = String(type || 'events').toLowerCase().replace(/[^a-z]/g, '') || 'events';
    const url = `https://${l}.wikipedia.org/api/rest_v1/feed/onthisday/${tp}/${mm}/${dd}`;
    const r = await fetchJsonWithTimeout(url, 12000);
    if (!r.ok || !r.json) return [];
    const arr = Array.isArray(r.json?.[tp]) ? r.json[tp] : [];
    return arr.slice(0, 10).map(x => ({
        year: x?.year,
        text: safeSlice(x?.text || '', 220)
    })).filter(x => x.text);
}

async function fetchNagerTodayHolidays(countryCode = 'ES') {
    const cc = String(countryCode || 'ES').toUpperCase().slice(0, 2);
    const year = new Date().getUTCFullYear();
    const url = `https://date.nager.at/api/v3/PublicHolidays/${encodeURIComponent(year)}/${encodeURIComponent(cc)}`;
    const r = await fetchJsonWithTimeout(url, 12000);
    if (!r.ok || !Array.isArray(r.json)) return [];
    const today = new Date().toISOString().slice(0, 10);
    return r.json
        .filter(h => h && h.date === today)
        .slice(0, 10)
        .map(h => ({
            kind: 'culture',
            title: safeSlice(h.localName || h.name || 'Feriado', 220),
            summary: safeSlice(`${h.name || ''} (${cc})`, 220),
            url: null,
            publishedAt: today,
            source: 'Nager.Date'
        }));
}

function buildObserverPrompt({ localeLang = 'es', geo = 'US', blocks, keywords, onThisDay }) {
    const lang = localeLang.startsWith('es') ? 'es' : 'en';
    const top = (keywords || []).slice(0, 8).map(k => `${k.keyword}(${k.count})`).join(', ');
    const fmt = (arr, n = 5) => (arr || []).slice(0, n).map((x, i) => `- ${i + 1}) ${safeSlice(x.title, 160)}${x.source ? ` [${x.source}]` : ''}`).join('\n');
    const hist = (onThisDay || []).slice(0, 3).map(x => `- ${x.year}: ${x.text}`).join('\n');

    return `
Eres ilfass. Voz humana, reflexiva, observacional. Primera persona. Español neutro.

Tarea: comentar señales en TIEMPO REAL sin inventar hechos. Si una afirmación no está explícita en los ítems, no la afirmes; usa lenguaje de probabilidad ("parece", "asoma", "se insinúa").
No nombres APIs ni URLs. No hagas propaganda. No des consejos médicos/financieros. No alarmismo.
Longitud: 120–180 palabras. Un párrafo, ritmo de transmisión.

Región de observación: ${geo}.
Palabras que se repiten hoy: ${top || '(sin señales claras)'}.

NOTICIAS (titulares):
${fmt(blocks?.news, 6) || '(sin datos)'}

TENDENCIAS (búsquedas/temas):
${fmt(blocks?.trends, 6) || '(sin datos)'}

CULTURA / AGENDA (hoy):
${fmt(blocks?.culture, 6) || '(sin datos)'}

CIENCIA/TEC (papers):
${fmt(blocks?.scitech, 4) || '(sin datos)'}

SALUD (señales):
${fmt(blocks?.health, 4) || '(sin datos)'}

SEGURIDAD (vulnerabilidades activas):
${fmt(blocks?.security, 4) || '(sin datos)'}

Contexto histórico opcional (si ayuda, 1 frase):
${hist || '(omití si no aporta)'}
`.trim();
}

async function generateObserverCommentary(prompt) {
    // Reusar el stack existente: Grok > OpenAI > Gemini > HF
    let txt = null;
    try { txt = await dreamWithGrok(prompt); } catch (e) { }
    if (!txt) {
        try { txt = await dreamWithOpenAI(prompt); } catch (e) { }
    }
    if (!txt) {
        try { txt = await dreamWithGemini(prompt); } catch (e) { }
    }
    if (!txt) {
        try { txt = await dreamWithHF(prompt); } catch (e) { }
    }
    if (!txt) {
        // Fallback local sin cuotas: reformular SOLO lo presente en el prompt
        txt = dreamWithLocalObserver(prompt);
    }
    txt = stripContextMetaFromNarrative(txt || '');
    return safeSlice(txt, 1200);
}

function normalizeObserverOnlyParam(raw) {
    const allowed = new Set(['news', 'trends', 'culture', 'scitech', 'health', 'security', 'all']);
    const s = String(raw || '').toLowerCase().trim();
    if (!s) return 'all';
    // allow csv: only=news,trends
    const parts = s.split(',').map(x => x.trim()).filter(Boolean);
    const filtered = parts.filter(p => allowed.has(p));
    if (!filtered.length) return 'all';
    if (filtered.includes('all')) return 'all';
    return filtered.join(',');
}

function filterObserverBlocks(blocks, onlyCsv) {
    const only = normalizeObserverOnlyParam(onlyCsv);
    if (only === 'all') return blocks;
    const keep = new Set(only.split(',').filter(Boolean));
    const out = {
        news: keep.has('news') ? (blocks?.news || []) : [],
        trends: keep.has('trends') ? (blocks?.trends || []) : [],
        culture: keep.has('culture') ? (blocks?.culture || []) : [],
        scitech: keep.has('scitech') ? (blocks?.scitech || []) : [],
        health: keep.has('health') ? (blocks?.health || []) : [],
        security: keep.has('security') ? (blocks?.security || []) : []
    };
    return out;
}

function titleForOnly(onlyCsv) {
    const only = normalizeObserverOnlyParam(onlyCsv);
    if (only === 'all') return 'Pulso del mundo';
    const map = {
        news: 'Pulso: Noticias',
        trends: 'Pulso: Tendencias',
        culture: 'Pulso: Cultura/Agenda',
        scitech: 'Pulso: Ciencia/Tech',
        health: 'Pulso: Salud',
        security: 'Pulso: Seguridad'
    };
    const parts = only.split(',').filter(Boolean);
    if (parts.length === 1) return map[parts[0]] || 'Pulso';
    return `Pulso: ${parts.map(p => map[p]?.replace('Pulso: ', '') || p).join(' + ')}`;
}

// =========================
// SPACE (PROXY ENDPOINTS)
// =========================
// Cache simple en memoria para TLE (evitar golpear CelesTrak en cada cliente)
const tleCache = new Map(); // group -> { ts, text }
const TLE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

// --- DATA UTILS ---
function loadLivingScript() { try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : null; } catch (e) { return null; } }
function saveLivingScript(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4)); }
function saveEditorialDay(dayData) {
    const filename = `day-${dayData.dayId.replace(/\s+/g, '_')}-${Date.now()}.json`;
    const subfolder = dayData.isTest ? 'simulations' : 'books';
    const booksDir = path.join(__dirname, 'data', subfolder);
    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir, { recursive: true });
    fs.writeFileSync(path.join(booksDir, filename), JSON.stringify(dayData, null, 2));
}

// Persistencia de Estado del Servidor
function saveState() {
    try {
        // No guardamos eventQueue para no repetir eventos viejos al reiniciar
        const toSave = { ...state, eventQueue: [] };
        fs.writeFileSync(STATE_FILE, JSON.stringify(toSave, null, 2));
    } catch (e) { console.error("State save failed", e); }
}
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            if (saved) {
                state = { ...state, ...saved, eventQueue: [] };
                console.log("💾 State restored:", state.editorial.status);
            }
        }
    } catch (e) { console.error("State load failed", e); }
}

// Cargar estado al inicio
loadState();
const storyBible = loadStoryBible();
let storyState = loadStoryState();

// =========================
// CLIP MARKERS (recortes)
// =========================
function loadClipMarkers() {
    try {
        if (fs.existsSync(CLIP_MARKERS_FILE)) {
            const v = JSON.parse(fs.readFileSync(CLIP_MARKERS_FILE, 'utf8'));
            return Array.isArray(v) ? v : [];
        }
    } catch (e) { }
    return [];
}
function saveClipMarkers() {
    try {
        fs.writeFileSync(CLIP_MARKERS_FILE, JSON.stringify(clipMarkers, null, 2));
    } catch (e) { }
}
let clipMarkers = loadClipMarkers();

// =========================
// STORY / GUIÓN (continuidad)
// =========================
function loadStoryBible() {
    try {
        if (fs.existsSync(STORY_BIBLE_FILE)) {
            return JSON.parse(fs.readFileSync(STORY_BIBLE_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('[Story] story-bible.json inválido:', e.message);
    }
    return null;
}

function loadStoryState() {
    try {
        if (fs.existsSync(STORY_STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STORY_STATE_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('[Story] story-state.json inválido:', e.message);
    }
    return {
        activeArcId: 'observacion',
        lastN: [] // { ts, scene, country, dayId, promptHint, narrativeHint }
    };
}

function saveStoryState() {
    try {
        fs.writeFileSync(STORY_STATE_FILE, JSON.stringify(storyState, null, 2));
    } catch (e) {
        console.warn('[Story] save failed:', e.message);
    }
}

function buildNarrativePromptWithStory(rawPrompt) {
    const bible = storyBible || {};
    const st = storyState || {};
    const telemetry = state?.clientTelemetry || {};
    const dayId = state?.editorial?.dayId || null;

    const scene = telemetry.scene || 'UNKNOWN';
    const country = telemetry.country || 'GLOBAL';

    const avoid = (bible.style?.avoidPhrases || []).slice(0, 10);
    const arc = (bible.arcs || []).find(a => a.id === st.activeArcId) || (bible.arcs || [])[0] || null;

    const recent = Array.isArray(st.lastN) ? st.lastN.slice(-5) : [];
    const recentHints = recent
        .map((x, i) => `${i + 1}) ${x.scene || '—'} / ${x.country || '—'}: ${String(x.narrativeHint || '').slice(0, 140)}`)
        .join('\n');

    const arcText = arc ? `Arco activo: ${arc.title}\nBeats sugeridos:\n- ${arc.beats.join('\n- ')}` : '';

    const systemConstraints = `
[BIBLIA NARRATIVA — OBLIGATORIO]
- Eres ilfass. Voz humana, reflexiva, observacional. Siempre primera persona.
- No adelantes futuro. No inventes rutas ni decisiones editoriales.
- Evita repetición: NO reutilices frases exactas recientes.
- Mantén coherencia con "VIVOS (presente)" y "MEMORIA (pasado)".
- Si falta información, habla desde la observación (no afirmes hechos duros).
- Longitud orientativa: ${bible.style?.lengthHint || '120-200 palabras'}.
- Evitar muletillas/frases: ${avoid.length ? avoid.map(s => `"${s}"`).join(', ') : '(ninguna)'}.

Contexto operativo:
- Día editorial: ${dayId || '—'}
- Escena actual (telemetría): ${scene}
- País actual (telemetría): ${country}

${arcText ? arcText + '\n' : ''}
Recientes (no repetir literalmente):
${recentHints || '(sin historial)'}

[PROMPT DE ESCENA]
${rawPrompt}
`.trim();

    return systemConstraints;
}

// Función auxiliar para extraer curiosidades de narrativas
function extractCuriositiesFromNarrative(narrative, countryId, timestamp) {
    const curiosities = [];
    const sentences = narrative.split(/[.!?]+/).filter(s => s.trim().length > 20);

    const interestingPatterns = [
        /(?:descubrí|encontré|me sorprendió|me llamó la atención|interesante|curioso|fascinante|increíble|único|especial)/i,
        /(?:conecta|vincula|relaciona|similar|parecido|comparte)/i,
        /(?:tradición|costumbre|ritual|celebración|festival)/i,
        /(?:historia|época|siglo|año|evento histórico)/i,
        /(?:comida|plato|ingrediente|sabor|gastronomía)/i
    ];

    const icons = ['🌟', '💡', '🎯', '🔍', '✨', '🎨', '🌍', '🧠', '💫', '🎭', '🎪', '🔮', '⚡', '🎊', '🎈'];

    const countryMap = {
        '124': 'Chile', '276': 'Alemania', '528': 'Países Bajos',
        '616': 'Polonia', '858': 'Uruguay', '032': 'Argentina',
        '076': 'Brasil', '170': 'Colombia', '218': 'Ecuador',
        '484': 'México', '604': 'Perú', '840': 'Estados Unidos',
        '724': 'España', '250': 'Francia', '380': 'Italia', '826': 'Reino Unido'
    };

    let found = 0;
    for (const sentence of sentences) {
        if (found >= 3) break;

        const trimmed = sentence.trim();
        if (trimmed.length < 30 || trimmed.length > 200) continue;

        const isInteresting = interestingPatterns.some(pattern => pattern.test(trimmed));

        if (isInteresting) {
            const tags = [];
            if (/cultura|tradición|costumbre/i.test(trimmed)) tags.push('culture');
            if (/historia|época|siglo/i.test(trimmed)) tags.push('history');
            if (/comida|plato|ingrediente|gastronomía/i.test(trimmed)) tags.push('food');
            if (/conecta|vincula|relaciona|similar/i.test(trimmed)) tags.push('connection');
            if (!tags.length) tags.push('fun');

            const words = trimmed.split(' ').slice(0, 8).join(' ');
            const title = words.length > 50 ? words.substring(0, 47) + '...' : words;

            curiosities.push({
                id: `curiosity-${countryId}-${timestamp}-${found}`,
                title: title,
                content: trimmed,
                country: countryMap[countryId] || `País ${countryId}`,
                countryId: countryId,
                tags: tags,
                timestamp: timestamp || Date.now(),
                icon: icons[Math.floor(Math.random() * icons.length)]
            });
            found++;
        }
    }

    return curiosities;
}

// --- AI LAYERS ---

// Rate limiting para Pollinations
let pollinationsLastRequest = 0;
const POLLINATIONS_MIN_DELAY = 2000; // 2 segundos entre requests

// Nivel 5: Pollinations (con rate limiting)
async function generateImagePollinations(prompt) {
    // Rate limiting: esperar si el último request fue hace menos de 2 segundos
    const now = Date.now();
    const timeSinceLastRequest = now - pollinationsLastRequest;
    if (timeSinceLastRequest < POLLINATIONS_MIN_DELAY) {
        await new Promise(resolve => setTimeout(resolve, POLLINATIONS_MIN_DELAY - timeSinceLastRequest));
    }

    console.log("🎨 Fallback to Pollinations...");
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        const response = await fetch(url);

        // Verificar si hay error de rate limit
        if (response.status === 429) {
            console.warn("⚠️ Pollinations rate limit alcanzado, usando placeholder");
            return null; // Retornar null para usar fallback
        }

        if (!response.ok) {
            console.warn(`⚠️ Pollinations error: ${response.status}`);
            return null;
        }

        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const filename = `AI_Pollinations_${Date.now()}.jpg`;
        const dir = path.join(__dirname, 'media', 'AI_Generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        pollinationsLastRequest = Date.now();
        console.log(`✨ Saved (Pollinations): ${filename}`);
        return { filename, url: `/media/AI_Generated/${filename}` };
    } catch (e) {
        console.warn(`⚠️ Pollinations error: ${e.message}`);
        return null;
    }
}

async function dreamWithPollinations(prompt) {
    // Sin rate limiting artificial, confiamos en la API
    // GET request estándar a text.pollinations.ai
    try {
        const safePrompt = String(prompt || "").slice(0, 1000); // Truncar por seguridad
        // Añadir seed aleatoria para evitar cache
        const seed = Math.floor(Math.random() * 1000000);
        const url = `https://text.pollinations.ai/${encodeURIComponent(safePrompt)}?seed=${seed}&model=openai`;

        console.log(`[Pollinations] Fetching: ${url.slice(0, 60)}...`);
        const response = await fetch(url);

        if (response.status === 429) {
            console.warn("⚠️ Pollinations rate limit 429");
            setProviderError('pollinations', { type: 'http_error', status: 429, message: 'rate_limit' });
            return null;
        }

        if (response.status === 414) {
            console.warn("⚠️ Pollinations 414 URI Too Long (Prompt demasiado largo)");
            setProviderError('pollinations', { type: 'http_error', status: 414, message: 'uri_too_long' });
            return null;
        }

        if (!response.ok) {
            console.warn(`⚠️ Pollinations error: ${response.status}`);
            setProviderError('pollinations', { type: 'http_error', status: response.status, message: 'not_ok' });
            return null;
        }

        const text = await response.text();
        clearProviderError('pollinations');
        return text.trim();
    } catch (e) {
        console.warn(`⚠️ Pollinations texto error: ${e.message}`);
        setProviderError('pollinations', { type: 'exception', message: e.message });
        return null;
    }
}

function keysPresent() {
    return {
        openai: !!process.env.OPENAI_API_KEY,
        grok: !!process.env.GROK_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        qwen: !!process.env.QWEN_API_KEY,
        hf: !!process.env.HF_API_KEY
    };
}

function stripContextMetaFromNarrative(text) {
    if (!text || typeof text !== 'string') return text;
    return text.split('\n').map((line) => {
        // Quitar "Contexto: escena=... país=... día=... ." o hasta fin de línea (no mostrar ni leer)
        let cleaned = line.replace(/\s*Contexto:\s*escena=[^\n]+?\.\s*/gi, ' ');
        cleaned = cleaned.replace(/\s*Contexto:\s*escena=[^\n]+$/gim, ' ');
        cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
        return cleaned;
    }).filter(Boolean).join('\n').trim();
}

function generateEmergencyNarrative(rawPrompt) {
    // Fallback local NO hardcodeado: generador combinatorio (varía siempre)
    const seed = Date.now() + Math.floor(Math.random() * 1e9);
    const pick = (arr, k) => arr[(seed + k) % arr.length];
    const a = [
        'marea', 'pulso', 'capa', 'trama', 'corriente', 'viento', 'ruido',
        'memoria', 'frontera', 'cicatriz', 'luz', 'sombra', 'latido'
    ];
    const b = [
        'invisible', 'lento', 'eléctrico', 'humano', 'silencioso', 'antiguo', 'nuevo',
        'denso', 'fino', 'continuo', 'inestable'
    ];
    const c = [
        'sobre el mapa', 'en la noche', 'en el borde de una ciudad', 'entre rutas',
        'en las costas', 'en el cielo', 'en la respiración del planeta'
    ];
    const d = [
        'No lo explico: lo observo.',
        'No es un dato: es una sensación.',
        'No es ruido: es vida en movimiento.',
        'No es caos: es un patrón que todavía no sabemos nombrar.'
    ];
    const hint = String(rawPrompt || '').replace(/\s+/g, ' ').trim().slice(0, 90);
    const line = `Hoy noto una ${pick(a, 1)} ${pick(b, 2)} ${pick(c, 3)}. ${pick(d, 4)}${hint ? ` (${hint})` : ''}`;
    return `[ILFASS]: ${line}`;
}

function dreamWithLocalObserver(prompt) {
    // Comentario local basado en un prompt con listas (ej: observer/pulse).
    // Evita inventar hechos: solo reformula lo que está en el prompt.
    const seed = Date.now() + Math.floor(Math.random() * 1e9);
    const pick = (arr, k) => arr[(seed + k) % arr.length];
    const lines = String(prompt || '').split('\n').map(s => s.trim()).filter(Boolean);
    const bullets = lines.filter(l => l.startsWith('- ')).slice(0, 18);
    const samples = [];
    for (const b of bullets) {
        const t = b.replace(/^- \d+\)\s*/i, '').replace(/^- /, '').trim();
        if (t) samples.push(t);
        if (samples.length >= 4) break;
    }
    const keywordsLine = lines.find(l => l.toLowerCase().includes('palabras que se repiten')) || '';
    const keywords = keywordsLine.split(':').slice(1).join(':').trim().slice(0, 120);

    const openers = [
        'Hoy el pulso llega en capas.',
        'Hoy el mundo no habla en una sola voz.',
        'Hoy la realidad parece moverse por corrientes.',
        'Hoy lo urgente convive con lo invisible.'
    ];
    const hedges = [
        'No lo afirmo: se insinúa.',
        'No es certeza: es patrón.',
        'No es sentencia: es una señal.',
        'No es un hecho suelto: es una sombra de tendencia.'
    ];
    const closers = [
        'Me quedo mirando un segundo más, y sigo.',
        'Lo registro y avanzo, sin dramatizar.',
        'El mapa no se detiene: yo tampoco.',
        'Cierro la frase y dejo espacio para el próximo giro.'
    ];

    const chosen = samples.length ? samples : ['sin señales claras, así que observo el silencio como dato'];
    const body = chosen.slice(0, 3).map((s, i) => `- ${s}`).join(' ');
    const txt = `[ILFASS]: ${pick(openers, 1)} ${keywords ? `Se repiten palabras como ${keywords}. ` : ''}${body}. ${pick(hedges, 2)} ${pick(closers, 3)}`.replace(/\s+/g, ' ').trim();
    return txt;
}

async function dreamWithLocalEngine(rawPrompt) {
    // Motor local: siempre ONLINE, sin depender de APIs externas.
    // Importante: produce formato multi-línea para que el enjambre lo parsee como guion (4–7 líneas).
    const seed = Date.now() + Math.floor(Math.random() * 1e9);
    const pick = (arr, k) => arr[(seed + k) % arr.length];
    const t = state?.clientTelemetry || {};
    const scene = (t.scene || 'MAPA').toString().slice(0, 40);
    const country = (t.country || 'GLOBAL').toString().slice(0, 40);
    const day = Number.isFinite(Number(t.day)) ? Number(t.day) : 0;

    let hint = String(rawPrompt || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    // Sanitizar para evitar “meta prompts” largos en pantalla
    hint = hint
        // Quita cualquier prefijo tipo: [TEST-XYZ @ 2026-...]
        .replace(/^\s*\[TEST[^\]]*\]\s*/i, '')
        .replace(/instrucciones:.*$/i, '')
        .replace(/formato\s+estricto:.*$/i, '')
        .replace(/trigger:.*$/i, '')
        .trim()
        .slice(0, 140);
    // Si el prompt trae una intención tipo ARRIBO, resumirla a algo humano
    const mArribo = hint.match(/\barribo\s+a\s+([a-záéíóúüñ\s-]{2,40})/i);
    if (mArribo && mArribo[1]) {
        hint = `arribo a ${mArribo[1].trim()}`;
    } else {
        // sacar paréntesis instructivos si quedaron
        hint = hint.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    }

    // Mensaje corto tipo chat (ej. "hola", "qué tal"): responder directo, no guion procedural
    const isShortUserMessage = hint.length > 0 && hint.length <= 80 && !/^(genera|instrucciones|formato|trigger|ping|arribo\s)/i.test(hint);
    const greetingLike = /\b(hola|hey|buenas|qué tal|hi|hello|buen día|buenas tardes|saludos)\b/i.test(hint);
    if (isShortUserMessage && (greetingLike || hint.split(/\s+/).length <= 6)) {
        const greetings = [
            '[ILFASS]: Hola. Estamos en vivo; lo que ves es el mapa.\n[COMPANION]: Bienvenido.',
            '[ILFASS]: Hola. Estamos observando el globo en tiempo real.\n[COMPANION]: Gracias por conectar.',
            '[ILFASS]: Recibido. Seguimos al aire.\n[COMPANION]: Cualquier cosa que quieras preguntar, aquí estamos.'
        ];
        const idx = seed % greetings.length;
        clearProviderError('local');
        return greetings[idx];
    }

    // Mente conjunta: Ilfass ve → Companion explica la energía/dato → Ilfass da sentido poético (como AiSwarmRouter)
    const trios = [
        { visual: 'una costa con luz irregular', fact: 'La densidad cambia en ondas ahí; es la concentración de luces.', poetic: 'Esa luz es el rumor que no se calla.' },
        { visual: 'un desierto sin ruido', fact: 'Donde no hay agua, el mapa se vacía de señal.', poetic: 'Ese silencio es otro tipo de verdad.' },
        { visual: 'una cadena de montañas como dientes', fact: 'El relieve se delata por las sombras; la hora cuenta.', poetic: 'Lo humano se delata en los bordes.' },
        { visual: 'un río que parece una cicatriz oscura', fact: 'Los ríos marcan el relieve; desde arriba son heridas que el tiempo no cierra.', poetic: 'Esa cicatriz es memoria de agua.' },
        { visual: 'un collar de ciudades encendidas', fact: 'Las rutas se repiten porque la logística también sueña con eficiencia.', poetic: 'No quiero explicar: quiero sentir el pulso y seguirlo.' },
        { visual: 'una frontera invisible desde arriba', fact: 'Desde aquí las fronteras son líneas que la noche no borra.', poetic: 'La noche no borra: solo cambia el tipo de verdad que se ve.' },
        { visual: 'rutas como venas azules sobre el mar', fact: 'Donde hay agua, la historia se acumula en capas.', poetic: 'El mundo no se calla; solo cambia de idioma.' }
    ];
    const trio = trios[(seed + 0) % trios.length];
    const questions = [
        '¿Qué se repite hoy sin que nadie lo pida?',
        '¿Qué parte de esto es costumbre y qué parte es ruptura?',
        '¿Qué detalle mínimo está moviendo el paisaje?'
    ];
    const question = pick(questions, 5);
    const includeQuestion = (seed % 2 === 0);

    const lines = [];
    lines.push(`[ILFASS]: Miro ${trio.visual}.`);
    lines.push(`[COMPANION]: ${trio.fact}`);
    lines.push(`[ILFASS]: ${trio.poetic}`);
    if (hint) {
        lines.push(`[ILFASS]: Recibo una intención: ${hint}. La traduzco en atención, no en guion.`);
    }
    if (includeQuestion) {
        lines.push(`[COMPANION]: ${question}`);
        lines.push(`[ILFASS]: Sostengo el ritmo. Si aparece una señal, la nombro.`);
    } else {
        lines.push(`[COMPANION]: Si el pulso cambia, te aviso.`);
    }

    // 4–7 líneas (aquí: 5–6). Importante: saltos de línea para parseScript().
    let out = lines.join('\n').trim();
    out = stripContextMetaFromNarrative(out);
    clearProviderError('local');
    return out;
}

// Nivel 4: Hugging Face
async function generateImageHF(prompt) {
    if (!process.env.HF_API_KEY) {
        const pollResult = await generateImagePollinations(prompt);
        return pollResult || generatePlaceholderImage(prompt);
    }
    try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0`, {
            method: "POST", headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt })
        });
        if (!resp.ok) throw new Error(resp.statusText);
        const buffer = Buffer.from(await (await resp.blob()).arrayBuffer());
        const filename = `AI_HF_${Date.now()}.jpg`;
        const dir = path.join(__dirname, 'media', 'AI_Generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        return { filename, url: `/media/AI_Generated/${filename}` };
    } catch (e) {
        const pollResult = await generateImagePollinations(prompt);
        return pollResult || generatePlaceholderImage(prompt);
    }
}

// Generar imagen placeholder cuando todas las APIs fallan
function generatePlaceholderImage(prompt) {
    console.log("📷 Usando placeholder - todas las APIs de imagen fallaron");
    // Retornar null para que el sistema use media curado en su lugar
    return null;
}
async function dreamWithHF(prompt) {
    if (!process.env.HF_API_KEY) {
        setProviderError('hf', { type: 'missing_key' });
        const pollResult = await dreamWithPollinations(prompt);
        return pollResult || null;
    }
    try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2`, {
            method: "POST", headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: `[INST] ${prompt} [/INST]`, parameters: { max_new_tokens: 100, return_full_text: false } })
        });
        if (!resp.ok) {
            const bodyPreview = await resp.text().catch(() => '');
            setProviderError('hf', { type: 'http_error', status: resp.status, bodyPreview });
            return null;
        }
        const data = await resp.json();
        const hfText = (data[0]?.generated_text || "").replace(/"/g, '').trim();
        if (hfText) {
            clearProviderError('hf');
            return hfText;
        }

        const pollResult = await dreamWithPollinations(prompt);
        return pollResult || null;
    } catch (e) {
        setProviderError('hf', { type: 'exception', message: e.message });
        const pollResult = await dreamWithPollinations(prompt);
        return pollResult || null;
    }
}

// Nivel 2.5: DeepSeek
async function dreamWithDeepSeek(prompt) {
    if (!process.env.DEEPSEEK_API_KEY) {
        setProviderError('deepseek', { type: 'missing_key' });
        return null;
    }
    console.log("🧠 Dreaming with DeepSeek...");
    try {
        const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Tu voz es reflexiva, observacional y personal. Hablas en primera persona." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });
        if (!resp.ok) {
            const bodyPreview = await resp.text().catch(() => '');
            setProviderError('deepseek', { type: 'http_error', status: resp.status, bodyPreview });
            return null;
        }
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content.replace(/"/g, '').trim();
        if (content && content.length > 50) {
            console.log(`✅ DeepSeek generó ${content.length} caracteres`);
            clearProviderError('deepseek');
            return content;
        }
        console.warn("⚠️ DeepSeek no retornó contenido válido");
        setProviderError('deepseek', { type: 'bad_response', message: 'no_choices_or_too_short' });
    } catch (e) {
        console.error("❌ DeepSeek Dream failed:", e.message);
        setProviderError('deepseek', { type: 'exception', message: e.message });
    }
    return null;
}

// Nivel 2.6: Qwen (Alibaba)
async function dreamWithQwen(prompt) {
    if (!process.env.QWEN_API_KEY) {
        setProviderError('qwen', { type: 'missing_key' });
        return null;
    }
    console.log("🧠 Dreaming with Qwen...");
    try {
        // Intentando endpoint compatible con OpenAI de DashScope
        const resp = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.QWEN_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "qwen-max",
                messages: [
                    { role: "system", content: "Eres ilfass, una IA observadora." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 800
            })
        });
        if (!resp.ok) {
            const bodyPreview = await resp.text().catch(() => '');
            setProviderError('qwen', { type: 'http_error', status: resp.status, bodyPreview });
            return null;
        }
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content.replace(/"/g, '').trim();
        if (content && content.length > 50) {
            console.log(`✅ Qwen generó ${content.length} caracteres`);
            clearProviderError('qwen');
            return content;
        }
        setProviderError('qwen', { type: 'bad_response', message: 'no_choices_or_too_short' });
    } catch (e) {
        console.error("❌ Qwen Dream failed:", e.message);
        setProviderError('qwen', { type: 'exception', message: e.message });
    }
    return null;
}

// Nivel 3: Gemini
async function dreamWithGemini(prompt) {
    if (!GoogleGenerativeAI || !process.env.GEMINI_API_KEY) {
        console.warn("⚠️ Gemini no disponible (SDK o API key faltante)");
        setProviderError('gemini', { type: (!GoogleGenerativeAI ? 'missing_sdk' : 'missing_key') });
        return null;
    }
    try {
        console.log("🧠 Dreaming with Gemini...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const res = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt);
        const content = res.response.text().replace(/"/g, '').trim();
        if (content && content.length > 50) {
            console.log(`✅ Gemini generó ${content.length} caracteres`);
            clearProviderError('gemini');
            return content;
        }
        console.warn("⚠️ Gemini no retornó contenido válido");
        setProviderError('gemini', { type: 'bad_response', message: 'too_short' });
    } catch (e) {
        console.error("❌ Gemini Dream failed:", e.message);
        setProviderError('gemini', { type: 'exception', message: e.message });
    }
    return null;
}

// Nivel 2: Grok (xAI)
async function dreamWithGrok(prompt) {
    if (!process.env.GROK_API_KEY) {
        setProviderError('grok', { type: 'missing_key' });
        return null;
    }
    console.log("🧠 Dreaming with Grok (xAI)...");
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROK_API_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Tu voz es reflexiva, observacional y personal. Hablas en primera persona, como si estuvieras pensando en voz alta." },
                    { role: "user", content: prompt }
                ],
                model: "grok-4-latest",
                stream: false,
                temperature: 0.8,
                max_tokens: 800 // Relatos más largos
            })
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorData = {};
            try { errorData = JSON.parse(errorText || '{}'); } catch (e) { }
            console.error(`⚠️ Grok API error: ${response.status} - ${JSON.stringify(errorData)}`);
            setProviderError('grok', { type: 'http_error', status: response.status, bodyPreview: errorText || JSON.stringify(errorData) });
            return null;
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content.replace(/"/g, '').trim();
            if (content && content.length > 50) {
                console.log(`✅ Grok generó ${content.length} caracteres`);
                clearProviderError('grok');
                return content;
            }
        }
        console.warn("⚠️ Grok no retornó contenido válido");
        setProviderError('grok', { type: 'bad_response', message: 'no_choices_or_too_short' });
    } catch (e) {
        console.error("❌ Grok Dream failed:", e.message, e.stack);
        setProviderError('grok', { type: 'exception', message: e.message });
    }
    return null;
}

// Nivel 1: OpenAI
async function dreamWithOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) {
        setProviderError('openai', { type: 'missing_key' });
        return null;
    }
    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Tu voz es reflexiva, observacional y personal. Hablas en primera persona." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 800, // Aumentado para relatos más largos
                temperature: 0.8 // Más creatividad
            })
        });
        if (!resp.ok) {
            const bodyPreview = await resp.text().catch(() => '');
            setProviderError('openai', { type: 'http_error', status: resp.status, bodyPreview });
            return null;
        }
        const data = await resp.json();
        const txt = data.choices?.[0]?.message?.content?.replace(/"/g, '')?.trim() || null;
        if (!txt) {
            setProviderError('openai', { type: 'bad_response', message: 'no_choices' });
            return null;
        }
        clearProviderError('openai');
        return txt;
    } catch (e) {
        setProviderError('openai', { type: 'exception', message: e.message });
        return null;
    }
}
async function generateImageOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) return await generateImageHF(prompt);
    try {
        const resp = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" })
        });
        const data = await resp.json();
        if (data.data?.[0]?.url) {
            const buffer = Buffer.from(await (await fetch(data.data[0].url)).blob().arrayBuffer());
            const filename = `AI_DALLE_${Date.now()}.png`;
            const dir = path.join(__dirname, 'media', 'AI_Generated');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, filename), buffer);
            console.log(`✨ Saved (DALL-E): ${filename}`);
            return { filename, url: `/media/AI_Generated/${filename}` };
        }
    } catch (e) { console.error("OpenAI Gen failed"); }
    return await generateImageHF(prompt);
}

// Orquestador Principal
async function dreamNarrative(context) {
    const prompt = `Describe brevemente (max 20 palabras) esta imagen cyberpunk: "${context}".`;
    let res = await dreamWithOpenAI(prompt);
    if (!res) res = await dreamWithGrok(prompt);
    if (!res) res = await dreamWithGemini(prompt);
    return res || await dreamWithHF(prompt);
}

// SERVER
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const apiPath = parsedUrl.pathname;

    if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

    // Endpoints
    if (req.method === 'GET' && apiPath === '/status') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
            autoMode: state.autoMode,
            currentScene: state.currentScene,
            editorial: state.editorial,
            queue: state.travelQueue,
            clientTelemetry: state.clientTelemetry, // Incluir telemetría para determinar hoja del libro
            music: state.music, // Incluir estado de música
            showRunner: state.showRunner
        }));
        return;
    }

    if (req.method === 'POST' && apiPath === '/api/generate-image') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            const { prompt } = JSON.parse(body || '{}');
            if (!prompt) { res.writeHead(400, headers); res.end('{"error":"No prompt"}'); return; }

            try {
                const result = await generateImageOpenAI(prompt);
                if (result) {
                    res.writeHead(200, headers);
                    res.end(JSON.stringify(result));
                } else {
                    // Si todas las APIs fallan, retornar null para que use media curado
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ error: "No se pudo generar imagen, usar media curado", url: null }));
                }
            } catch (e) {
                console.error("Error en generate-image:", e);
                res.writeHead(200, headers);
                res.end(JSON.stringify({ error: e.message, url: null }));
            }
        });
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/media') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            const m = JSON.parse(body || '{}');
            let txt = m.narrate ? await dreamNarrative(m.name || "imagen") : null;
            // Incluir nombre y tipo en el evento para mejor tracking
            state.eventQueue.push({
                type: 'media',
                url: m.url,
                mediaType: m.type || 'image',
                name: m.name || 'Media',
                textToSpeak: txt
            });
            console.log(`📺 Media Event Queued: ${m.name || 'Unknown'} (${m.type || 'image'})`);
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true, narrative: txt, name: m.name, type: m.type || 'image' }));
        });
        return;
    }

    // NEW: API INTRO LIVE
    if (req.method === 'GET' && apiPath === '/api/intro') {
        const hour = new Date().getHours();
        const prompt = `Eres ilfass, una IA. Son las ${hour}:00. Saluda a la audiencia con una frase mística, breve y potente sobre el viaje que inician. Menciona que tus sistemas (OpenAI, Grok o Gemini) están en línea.`;

        // Priorizar Grok para demostrar integración
        let introText = await dreamWithGrok(prompt);
        if (!introText) introText = await dreamWithOpenAI(prompt);
        if (!introText) introText = await dreamWithGemini(prompt);
        introText = stripContextMetaFromNarrative(introText || '');

        res.writeHead(200, headers);
        res.end(JSON.stringify({ intro: introText || "Sistemas listos. Iniciando viaje." }));
        return;
    }

    // -------------------------
    // Videos (Pexels + IA intro/outro para videowall)
    // GET /api/videos/next?query=nature
    // GET /api/videos/outro?query=nature&id=123
    // -------------------------
    if (req.method === 'GET' && apiPath === '/api/videos/next') {
        const query = safeSlice(String(parsedUrl.query?.query || 'nature'), 80);
        const key = process.env.PEXELS_API_KEY;
        if (!key) {
            res.writeHead(200, headers);
            res.end(JSON.stringify({ ok: false, error: 'PEXELS_API_KEY not configured' }));
            return;
        }
        try {
            const r = await fetch(
                `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5`,
                { headers: { 'Authorization': key } }
            );
            const data = await r.json().catch(() => null);
            const videos = Array.isArray(data?.videos) ? data.videos : [];
            if (!videos.length) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: false, error: 'no_videos', query }));
                return;
            }
            const v = videos[Math.floor(Math.random() * videos.length)];
            const files = Array.isArray(v.video_files) ? v.video_files : [];
            const mp4 = files
                .filter(f => /video\/mp4|\.mp4/i.test(String(f?.file_type || '')) && f?.link)
                .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0));
            const best = mp4[0] || files.find(f => f?.link) || {};
            const url = best.link || null;
            if (!url) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: false, error: 'no_playable_link', query }));
                return;
            }
            const attribution = `Pexels / ${(v.user?.name || 'Videographer').toString().trim()}`;
            const introPrompt = `En una sola frase en español, presenta este video para un stream. Tema: ${query}. Breve y natural.`;
            let intro = null;
            try { intro = await dreamWithGrok(introPrompt); } catch (e) { }
            if (!intro) try { intro = await dreamWithOpenAI(introPrompt); } catch (e) { }
            if (!intro) try { intro = await dreamWithGemini(introPrompt); } catch (e) { }
            if (!intro) try { intro = await dreamWithHF(introPrompt); } catch (e) { }
            intro = stripContextMetaFromNarrative(intro || '');
            intro = safeSlice(intro || `Un momento de ${query}.`, 300);
            res.writeHead(200, headers);
            res.end(JSON.stringify({
                ok: true,
                url,
                attribution,
                intro,
                id: v.id,
                query
            }));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: 'videos_fetch_failed', message: e.message }));
        }
        return;
    }

    if (req.method === 'GET' && apiPath === '/api/videos/outro') {
        const query = safeSlice(String(parsedUrl.query?.query || 'nature'), 80);
        const id = safeSlice(String(parsedUrl.query?.id || ''), 32);
        const prompt = `En una sola frase en español, comenta o cierra el video que acaba de verse en un stream. Tema: ${query}. Breve y natural.`;
        let text = null;
        try { text = await dreamWithGrok(prompt); } catch (e) { }
        if (!text) try { text = await dreamWithOpenAI(prompt); } catch (e) { }
        if (!text) try { text = await dreamWithGemini(prompt); } catch (e) { }
        if (!text) try { text = await dreamWithHF(prompt); } catch (e) { }
        text = stripContextMetaFromNarrative(text || '');
        text = safeSlice(text || 'Hasta la próxima.', 300);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ text }));
        return;
    }

    // -------------------------
    // Images (Pexels) para modos visuales
    // GET /api/images/next?query=technology&orientation=landscape
    // -------------------------
    if (req.method === 'GET' && apiPath === '/api/images/next') {
        const query = safeSlice(String(parsedUrl.query?.query || 'technology'), 80);
        const orientation = safeSlice(String(parsedUrl.query?.orientation || 'landscape'), 20);
        const key = process.env.PEXELS_API_KEY;
        if (!key) {
            res.writeHead(200, headers);
            res.end(JSON.stringify({ ok: false, error: 'PEXELS_API_KEY not configured' }));
            return;
        }
        try {
            const r = await fetch(
                `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=${orientation}`,
                { headers: { 'Authorization': key } }
            );
            const data = await r.json().catch(() => null);
            const photos = Array.isArray(data?.photos) ? data.photos : [];
            if (!photos.length) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: false, error: 'no_photos', query }));
                return;
            }
            const p = photos[Math.floor(Math.random() * photos.length)];
            const url = p?.src?.large || p?.src?.original || null;
            const photographer = p?.photographer || 'Photographer';
            if (!url) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: false, error: 'no_image_url', query }));
                return;
            }
            res.writeHead(200, headers);
            res.end(JSON.stringify({
                ok: true,
                url,
                photographer,
                id: p.id,
                query
            }));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: 'images_fetch_failed', message: e.message }));
        }
        return;
    }

    // -------------------------
    // Space: TLE proxy (CelesTrak)
    // GET /api/space/tle?group=visual
    // -------------------------
    if (req.method === 'GET' && apiPath === '/api/space/tle') {
        try {
            const rawGroup = (parsedUrl.query.group || 'visual').toString();
            const group = rawGroup.trim();

            // Hardening: evitar proxy abierto
            const okFormat = /^[a-z0-9_-]{1,40}$/i.test(group);
            const allowed = new Set([
                'visual',
                'stations',
                'active',
                'starlink',
                'iridium-NEXT',
                'weather',
                'geo',
                'amateur',
                'gps-ops',
                'galileo',
                'glonass',
                'beidou'
            ]);
            if (!okFormat || !allowed.has(group)) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: 'invalid_group', allowed: Array.from(allowed) }));
                return;
            }

            const cached = tleCache.get(group);
            if (cached && (Date.now() - cached.ts) < TLE_CACHE_TTL_MS && cached.text && cached.text.length > 100) {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache'
                });
                res.end(cached.text);
                return;
            }

            const upstream = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
            const r = await fetch(upstream, { method: 'GET' });
            const text = await r.text();
            if (!r.ok || !text || text.length < 100) {
                res.writeHead(502, headers);
                res.end(JSON.stringify({
                    error: 'celestrak_upstream_error',
                    status: r.status,
                    body: (text || '').slice(0, 800)
                }));
                return;
            }

            tleCache.set(group, { ts: Date.now(), text });
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            res.end(text);
            return;
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: 'tle_proxy_failed', message: e.message }));
            return;
        }
    }

    // API: Memoria de presentaciones del mapa
    const MAP_INTRO_MEMORY_FILE = path.join(__dirname, 'data', 'map-intro-memory.json');

    if (req.method === 'GET' && apiPath === '/api/map-intro-memory') {
        try {
            let memory = { presentations: [] };
            if (fs.existsSync(MAP_INTRO_MEMORY_FILE)) {
                memory = JSON.parse(fs.readFileSync(MAP_INTRO_MEMORY_FILE, 'utf8'));
            }
            res.writeHead(200, headers);
            res.end(JSON.stringify(memory));
        } catch (e) {
            console.error("Error loading map intro memory:", e);
            res.writeHead(500, headers);
            res.end(JSON.stringify({ presentations: [], error: e.message }));
        }
        return;
    }

    if (req.method === 'POST' && apiPath === '/api/map-intro-memory') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const presentationData = JSON.parse(body || '{}');
                let memory = { presentations: [] };

                if (fs.existsSync(MAP_INTRO_MEMORY_FILE)) {
                    memory = JSON.parse(fs.readFileSync(MAP_INTRO_MEMORY_FILE, 'utf8'));
                }

                // Agregar nueva presentación
                memory.presentations.push({
                    timestamp: presentationData.timestamp || Date.now(),
                    text: presentationData.text || '',
                    presentationsCount: presentationData.presentationsCount || memory.presentations.length + 1
                });

                // Mantener solo las últimas 50 presentaciones
                if (memory.presentations.length > 50) {
                    memory.presentations = memory.presentations.slice(-50);
                }

                // Guardar
                fs.writeFileSync(MAP_INTRO_MEMORY_FILE, JSON.stringify(memory, null, 2));

                console.log(`💾 Presentación del mapa guardada (total: ${memory.presentations.length})`);

                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: true, total: memory.presentations.length }));
            } catch (e) {
                console.error("Error saving map intro memory:", e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // API: Noticias por país
    if (req.method === 'GET' && apiPath === '/api/news') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const country = url.searchParams.get('country') || '';

        try {
            const locale = buildLocale({ lang: 'es-419', geo: 'US' });
            const q = safeSlice(country, 80);
            const items = q
                ? await cached(`news:country:${q}`, 6 * 60 * 1000, async () => {
                    // “when:7d” limita a ventana reciente
                    const query = `${q} when:7d`;
                    const r = await fetchGoogleNewsSearch(query, locale);
                    return (r || []).slice(0, 12);
                })
                : [];

            const news = (items || []).slice(0, 5).map(x => ({
                title: x.title,
                text: x.summary || x.title,
                source: x.source || 'Google News',
                url: x.url || null
            }));

            res.writeHead(200, headers);
            res.end(JSON.stringify({ news, country }));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ news: [], error: e.message }));
        }
        return;
    }

    // API: Observador en tiempo real (multi-fuente)
    // GET /api/observer/pulse?lang=es-419&geo=US&cc=ES&max=8
    if (req.method === 'GET' && apiPath === '/api/observer/pulse') {
        const u = new URL(req.url, `http://${req.headers.host}`);
        const lang = safeSlice(u.searchParams.get('lang') || 'es-419', 12);
        const geo = safeSlice((u.searchParams.get('geo') || 'US').toUpperCase(), 2);
        const cc = safeSlice((u.searchParams.get('cc') || geo || 'ES').toUpperCase(), 2);
        const max = Math.max(3, Math.min(12, Number(u.searchParams.get('max') || 8)));
        const only = normalizeObserverOnlyParam(u.searchParams.get('only') || 'all');

        try {
            const locale = buildLocale({ lang, geo });
            const cacheKey = `pulse:${locale.hl}:${locale.gl}:${cc}:${max}:${only}`;

            const payload = await cached(cacheKey, OBSERVER_TTL_MS, async () => {
                const [newsWorld, newsTech, newsSci, newsHealth, trends, arxiv, kev, cdc, holidays, onThisDayEvents] = await Promise.all([
                    fetchGoogleNewsTopic('WORLD', locale),
                    fetchGoogleNewsTopic('TECHNOLOGY', locale),
                    fetchGoogleNewsTopic('SCIENCE', locale),
                    fetchGoogleNewsTopic('HEALTH', locale),
                    fetchGoogleTrendsDaily(locale.gl),
                    fetchArxivRss('cs.ai+cs.lg'),
                    fetchCisaKev(45),
                    fetchCdcEidRss(),
                    fetchNagerTodayHolidays(cc),
                    fetchWikipediaOnThisDay(locale.hl.split('-')[0] || 'es', 'events')
                ]);

                const allBlocks = {
                    news: ([]).concat(newsWorld, newsTech, newsSci).slice(0, max),
                    trends: (trends || []).slice(0, max),
                    culture: ([]).concat(holidays || []).slice(0, max),
                    scitech: (arxiv || []).slice(0, Math.max(3, Math.floor(max / 2))),
                    health: ([]).concat(newsHealth || [], cdc || []).slice(0, Math.max(3, Math.floor(max / 2))),
                    security: (kev || []).slice(0, Math.max(3, Math.floor(max / 2)))
                };

                const blocks = filterObserverBlocks(allBlocks, only);
                const flat = []
                    .concat(blocks.news, blocks.trends, blocks.culture, blocks.scitech, blocks.health, blocks.security)
                    .filter(Boolean);
                const keywords = topKeywords(flat, 10);

                const prompt = buildObserverPrompt({
                    localeLang: locale.hl,
                    geo: locale.gl,
                    blocks,
                    keywords,
                    onThisDay: onThisDayEvents
                });
                const commentary = await generateObserverCommentary(prompt);

                return {
                    ok: true,
                    generatedAt: nowIso(),
                    locale,
                    only,
                    title: titleForOnly(only),
                    blocks,
                    keywords,
                    onThisDay: onThisDayEvents.slice(0, 6),
                    commentary
                };
            });

            res.writeHead(200, headers);
            res.end(JSON.stringify(payload));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // EVENT: Disparar narración del Observador (Pulso) como evento directo a clientes
    // POST /event/observer/pulse  body: { lang, geo, cc, only, max }
    if (req.method === 'POST' && apiPath === '/event/observer/pulse') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const lang = safeSlice(data.lang || 'es-419', 12);
                const geo = safeSlice(String(data.geo || 'US').toUpperCase(), 2);
                const cc = safeSlice(String(data.cc || geo || 'ES').toUpperCase(), 2);
                const max = Math.max(3, Math.min(12, Number(data.max || 10)));
                const only = normalizeObserverOnlyParam(data.only || 'all');

                // Reusar el mismo endpoint (cacheado) internamente
                const locale = buildLocale({ lang, geo });
                const cacheKey = `pulse:${locale.hl}:${locale.gl}:${cc}:${max}:${only}`;
                const payload = await cached(cacheKey, OBSERVER_TTL_MS, async () => {
                    // llamar a la ruta GET sin HTTP, copiando la lógica (simple): hacemos fetches aquí también
                    const [newsWorld, newsTech, newsSci, newsHealth, trends, arxiv, kev, cdc, holidays, onThisDayEvents] = await Promise.all([
                        fetchGoogleNewsTopic('WORLD', locale),
                        fetchGoogleNewsTopic('TECHNOLOGY', locale),
                        fetchGoogleNewsTopic('SCIENCE', locale),
                        fetchGoogleNewsTopic('HEALTH', locale),
                        fetchGoogleTrendsDaily(locale.gl),
                        fetchArxivRss('cs.ai+cs.lg'),
                        fetchCisaKev(45),
                        fetchCdcEidRss(),
                        fetchNagerTodayHolidays(cc),
                        fetchWikipediaOnThisDay(locale.hl.split('-')[0] || 'es', 'events')
                    ]);

                    const allBlocks = {
                        news: ([]).concat(newsWorld, newsTech, newsSci).slice(0, max),
                        trends: (trends || []).slice(0, max),
                        culture: ([]).concat(holidays || []).slice(0, max),
                        scitech: (arxiv || []).slice(0, Math.max(3, Math.floor(max / 2))),
                        health: ([]).concat(newsHealth || [], cdc || []).slice(0, Math.max(3, Math.floor(max / 2))),
                        security: (kev || []).slice(0, Math.max(3, Math.floor(max / 2)))
                    };

                    const blocks = filterObserverBlocks(allBlocks, only);
                    const flat = []
                        .concat(blocks.news, blocks.trends, blocks.culture, blocks.scitech, blocks.health, blocks.security)
                        .filter(Boolean);
                    const keywords = topKeywords(flat, 10);

                    const prompt = buildObserverPrompt({
                        localeLang: locale.hl,
                        geo: locale.gl,
                        blocks,
                        keywords,
                        onThisDay: onThisDayEvents
                    });
                    const commentary = await generateObserverCommentary(prompt);
                    return {
                        ok: true,
                        generatedAt: nowIso(),
                        locale,
                        only,
                        title: titleForOnly(only),
                        blocks,
                        keywords,
                        onThisDay: onThisDayEvents.slice(0, 6),
                        commentary
                    };
                });

                // Encolar evento para clientes
                state.eventQueue.push({
                    type: 'observer_speak',
                    payload: {
                        title: payload.title,
                        only: payload.only,
                        commentary: payload.commentary,
                        keywords: payload.keywords
                    }
                });

                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: true, title: payload.title, only: payload.only }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // =========================
    // CITY LIVE (PROXY ENDPOINTS)
    // =========================
    // TfL (London) - Line status (requires free keys)
    if (req.method === 'GET' && apiPath === '/api/city/tfl/status') {
        const appId = process.env.TFL_APP_ID;
        const appKey = process.env.TFL_APP_KEY;
        if (!appId || !appKey) {
            res.writeHead(501, headers);
            res.end(JSON.stringify({ error: 'TFL_APP_ID/TFL_APP_KEY no configurados' }));
            return;
        }
        try {
            const upstream = `https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;
            const r = await fetch(upstream, { method: 'GET' });
            const text = await r.text();
            if (!r.ok) {
                res.writeHead(r.status, headers);
                res.end(JSON.stringify({ error: 'TfL upstream error', status: r.status, body: text.slice(0, 800) }));
                return;
            }
            // devolvemos el JSON original de TfL (array)
            res.writeHead(200, headers);
            res.end(text);
            return;
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: 'TfL fetch failed', message: e.message }));
            return;
        }
    }

    // TomTom Traffic Flow tiles (requires free key)
    // GET /api/city/tomtom/traffic/{z}/{x}/{y}.png?style=relative
    if (req.method === 'GET' && apiPath.startsWith('/api/city/tomtom/traffic/')) {
        const key = process.env.TOMTOM_API_KEY;
        if (!key) {
            res.writeHead(501, headers);
            res.end(JSON.stringify({ error: 'TOMTOM_API_KEY no configurado' }));
            return;
        }
        try {
            const parts = apiPath.split('/').filter(Boolean);
            // parts: ['api','city','tomtom','traffic', z, x, y.png]
            const z = parts[4];
            const x = parts[5];
            const yPng = parts[6] || '';
            const y = yPng.replace(/\.png$/i, '');
            const style = (parsedUrl.query.style || 'relative').toString();

            const upstream = `https://api.tomtom.com/traffic/map/4/tile/flow/${encodeURIComponent(style)}/${encodeURIComponent(z)}/${encodeURIComponent(x)}/${encodeURIComponent(y)}.png?key=${encodeURIComponent(key)}`;
            const r = await fetch(upstream, { method: 'GET' });
            if (!r.ok) {
                const body = await r.text().catch(() => '');
                res.writeHead(r.status, headers);
                res.end(JSON.stringify({ error: 'TomTom upstream error', status: r.status, body: body.slice(0, 800) }));
                return;
            }
            const buf = Buffer.from(await (await r.blob()).arrayBuffer());
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(buf);
            return;
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: 'TomTom tile fetch failed', message: e.message }));
            return;
        }
    }

    // TomTom Health check (quick diagnostic)
    // GET /api/city/tomtom/health
    if (req.method === 'GET' && apiPath === '/api/city/tomtom/health') {
        const key = process.env.TOMTOM_API_KEY;
        if (!key) {
            res.writeHead(200, headers);
            res.end(JSON.stringify({ ok: false, reason: 'missing_key' }));
            return;
        }
        try {
            const upstream = `https://api.tomtom.com/traffic/map/4/tile/flow/relative/0/0/0.png?key=${encodeURIComponent(key)}`;
            const r = await fetch(upstream, { method: 'GET' });
            if (r.ok) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: true }));
                return;
            }
            const body = await r.text().catch(() => '');
            res.writeHead(200, headers);
            res.end(JSON.stringify({
                ok: false,
                reason: 'upstream_error',
                status: r.status,
                body: body.slice(0, 300)
            }));
            return;
        } catch (e) {
            res.writeHead(200, headers);
            res.end(JSON.stringify({ ok: false, reason: 'fetch_failed', message: e.message }));
            return;
        }
    }

    if (req.method === 'GET' && apiPath === '/api/media-list') {
        const getFiles = (dir, base = '') => {
            let res = [];
            if (!fs.existsSync(dir)) return res;
            fs.readdirSync(dir).forEach(file => {
                const fp = path.join(dir, file);
                if (fs.statSync(fp).isDirectory()) res = res.concat(getFiles(fp, path.join(base, file)));
                else if (/\.(jpg|jpeg|png|gif|mp4|webm|mp3|txt)$/i.test(file)) {
                    const folder = base.split(path.sep)[0] || 'Global';
                    const urlPath = path.posix.join(...base.split(path.sep), file);
                    res.push({ name: file, path: base, folder, url: `/media/${urlPath}`, type: /\.(mp4|webm)$/.test(file) ? 'video' : 'image' });
                }
            });
            return res;
        };
        try {
            res.writeHead(200, headers);
            res.end(JSON.stringify(getFiles(path.join(__dirname, 'media'))));
        } catch (e) { res.writeHead(500, headers); res.end('[]'); }
        return;
    }

    // Legacy / Other
    if (apiPath === '/poll') {
        // Preparar respuesta con estado de música
        const musicState = {
            isPlaying: state.music.isPlaying,
            currentTrack: state.music.currentTrack,
            command: state.music.command // Incluir comando si existe
        };

        // Limpiar comando después de enviarlo (para evitar que se procese múltiples veces)
        const commandToSend = state.music.command;
        if (state.music.command) {
            state.music.command = null;
        }

        res.writeHead(200, headers);
        res.end(JSON.stringify({
            autoMode: state.autoMode,
            events: state.eventQueue,
            music: {
                ...musicState,
                command: commandToSend // Enviar el comando que acabamos de limpiar
            }
        }));
        state.eventQueue = [];
        return;
    }

    // Auto toggle
    if (apiPath === '/event/auto_toggle') {
        state.autoMode = !state.autoMode;
        state.eventQueue.push({ type: 'mode_change', autoMode: state.autoMode });
        saveState(); // PERSIST
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Auto explicit on/off (para guion/ruta sin depender de "toggle")
    if (apiPath === '/event/auto_on') {
        state.autoMode = true;
        state.eventQueue.push({ type: 'mode_change', autoMode: true });
        saveState();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, autoMode: true }));
        return;
    }

    if (apiPath === '/event/auto_off') {
        state.autoMode = false;
        state.eventQueue.push({ type: 'mode_change', autoMode: false });
        saveState();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, autoMode: false }));
        return;
    }

    // Travel
    if (apiPath.startsWith('/event/travel/')) {
        state.eventQueue.push({ type: 'travel_to', payload: apiPath.split('/').pop() });
        saveState();
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Queue management
    if (req.method === 'POST' && apiPath === '/event/queue/add') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const { code } = JSON.parse(body || '{}');
            if (code) {
                if (!state.travelQueue) state.travelQueue = [];
                state.travelQueue.push(code);
                saveState();
            }
            res.writeHead(200, headers);
            res.end('{"success":true}');
        });
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/queue/clear') {
        state.travelQueue = [];
        saveState();
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Narration controls
    if (req.method === 'POST' && apiPath === '/event/pause') {
        state.eventQueue.push({ type: 'pause_narration' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/resume') {
        state.eventQueue.push({ type: 'resume_narration' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/skip') {
        state.eventQueue.push({ type: 'skip_current' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Event: News
    if (apiPath === '/event/news') {
        state.eventQueue.push({ type: 'news' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Event: Fact
    if (apiPath === '/event/fact') {
        state.eventQueue.push({ type: 'fact' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Event: Glitch
    if (apiPath === '/event/glitch') {
        state.eventQueue.push({ type: 'glitch' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // TV Controls (recap / bumper / agenda)
    if (req.method === 'POST' && apiPath === '/event/recap/now') {
        state.eventQueue.push({ type: 'recap_now' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }
    if (req.method === 'POST' && apiPath === '/event/bumper/now') {
        state.eventQueue.push({ type: 'bumper_now' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }
    if (req.method === 'POST' && apiPath === '/event/agenda/reset') {
        state.eventQueue.push({ type: 'agenda_reset' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }
    if (req.method === 'POST' && apiPath === '/event/tv/toggles') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                state.eventQueue.push({ type: 'tv_toggles', payload: data });
                saveState();
                res.writeHead(200, headers);
                res.end('{"success":true}');
            } catch (e) {
                res.writeHead(400, headers);
                res.end('{"success":false,"error":"bad_json"}');
            }
        });
        return;
    }

    // =========================
    // SHOW RUNNER (60’ wheel)
    // =========================
    if (req.method === 'POST' && apiPath === '/event/show/start') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            let mission = '';
            try {
                const data = JSON.parse(body || '{}');
                mission = String(data.mission || '').trim().slice(0, 260);
            } catch (e) { }
            // El Show Runner implica automatización (sin blancos): forzamos AutoMode ON.
            state.autoMode = true;
            state.showRunner = { active: true, mission, startedAt: Date.now() };
            state.eventQueue.push({ type: 'show_start', payload: { mission } });
            saveState();
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true, showRunner: state.showRunner }));
        });
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/show/stop') {
        state.showRunner = { active: false, mission: state.showRunner?.mission || '', startedAt: 0 };
        state.eventQueue.push({ type: 'show_stop' });
        saveState();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, showRunner: state.showRunner }));
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/show/next') {
        state.eventQueue.push({ type: 'show_next' });
        saveState();
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/show/mission') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            let mission = '';
            try {
                const data = JSON.parse(body || '{}');
                mission = String(data.mission || '').trim().slice(0, 260);
            } catch (e) { }
            if (!state.showRunner) state.showRunner = { active: false, mission: '', startedAt: 0 };
            state.showRunner.mission = mission;
            state.eventQueue.push({ type: 'show_mission', payload: { mission } });
            saveState();
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true, showRunner: state.showRunner }));
        });
        return;
    }

    // Ruta: Controles remotos (panel) — play/follow
    if (req.method === 'POST' && apiPath === '/event/ruta/play_toggle') {
        state.eventQueue.push({ type: 'ruta_play_toggle' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }
    if (req.method === 'POST' && apiPath === '/event/ruta/follow_toggle') {
        state.eventQueue.push({ type: 'ruta_follow_toggle' });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Music Control: Pausar/Reanudar música
    if (req.method === 'POST' && apiPath === '/event/music/toggle') {
        // Solo establecer comando si no hay uno pendiente para evitar duplicados
        if (!state.music.command) {
            state.music.command = 'toggle';
        }
        state.music.isPlaying = !state.music.isPlaying;
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, isPlaying: state.music.isPlaying }));
        return;
    }

    // Music Control: Siguiente track
    if (req.method === 'POST' && apiPath === '/event/music/next') {
        // Solo establecer comando si no hay uno pendiente para evitar duplicados
        if (!state.music.command) {
            state.music.command = 'next';
        }
        state.music.currentTrack = (state.music.currentTrack + 1) % 2; // Por ahora 2 tracks
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, currentTrack: state.music.currentTrack }));
        return;
    }

    // Music Control: Obtener estado de música
    if (req.method === 'GET' && apiPath === '/api/music-status') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
            isPlaying: state.music.isPlaying,
            currentTrack: state.music.currentTrack,
            command: state.music.command
        }));
        // Limpiar comando después de enviarlo
        state.music.command = null;
        return;
    }

    // Text-to-Speech: Generar audio con Edge TTS
    if (req.method === 'POST' && apiPath === '/api/tts') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const { text, voice } = JSON.parse(body || '{}');

                if (!text || text.trim().length === 0) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ error: 'Texto requerido' }));
                    return;
                }

                // Usar el servicio de Edge TTS
                const { exec } = require('child_process');
                const ttsServicePath = path.join(__dirname, 'scripts', 'edge-tts-service.js');
                const inputData = JSON.stringify({ text, voice: voice || 'es-ES-AlvaroNeural' });

                exec(`echo '${inputData.replace(/'/g, "'\\''")}' | node "${ttsServicePath}"`,
                    { maxBuffer: 1024 * 1024 * 10, cwd: __dirname },
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error('[TTS] Error:', error);
                            res.writeHead(500, headers);
                            res.end(JSON.stringify({
                                error: 'Error generando audio',
                                message: error.message,
                                fallback: true // Indicar que debe usar fallback
                            }));
                            return;
                        }

                        try {
                            const result = JSON.parse(stdout);
                            if (result.success) {
                                res.writeHead(200, headers);
                                res.end(JSON.stringify(result));
                            } else {
                                res.writeHead(500, headers);
                                res.end(JSON.stringify({
                                    error: result.error || 'Error desconocido',
                                    message: result.message,
                                    fallback: true
                                }));
                            }
                        } catch (parseError) {
                            console.error('[TTS] Error parseando resultado:', parseError);
                            res.writeHead(500, headers);
                            res.end(JSON.stringify({
                                error: 'Error procesando resultado',
                                message: parseError.message,
                                fallback: true
                            }));
                        }
                    }
                );
            } catch (e) {
                console.error('Error en /api/tts:', e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ error: 'Error procesando solicitud', message: e.message, fallback: true }));
            }
        });
        return;
    }

    // Scene Change
    if (apiPath.startsWith('/event/scene/')) {
        const targetScene = apiPath.split('/').pop();
        state.eventQueue.push({ type: 'scene_change', payload: targetScene });
        state.currentScene = targetScene;
        saveState();
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Navigate to Page (para botones de Hojas Dinámicas)
    if (req.method === 'POST' && apiPath.startsWith('/event/navigate/')) {
        const targetPage = apiPath.split('/').pop();
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const path = data.path || `/vivos/${targetPage}/`;
                // Enviar evento de navegación
                state.eventQueue.push({ type: 'navigate', payload: path });
                res.writeHead(200, headers);
                res.end('{"success":true}');
            } catch (e) {
                res.writeHead(400, headers);
                res.end('{"error":"Invalid request"}');
            }
        });
        return;
    }

    // Day controls
    if (req.method === 'POST' && (apiPath === '/event/day/start' || apiPath === '/event/day/end')) {
        let body = ''; req.on('data', c => body += c); req.on('end', () => {
            if (apiPath.includes('start')) {
                const { id, isTest } = JSON.parse(body || '{}');
                state.editorial = { status: 'LIVE', dayId: id || 'Day', isTest: !!isTest, startTime: Date.now(), visits: [], currentVisit: null };
            } else {
                if (state.editorial.status === 'LIVE') {
                    saveEditorialDay({ ...state.editorial, endTime: Date.now(), status: 'ARCHIVED' });
                    state.editorial.status = 'IDLE';
                }
            }
            saveState(); // PERSIST
            res.writeHead(200, headers); res.end('{"success":true}');
        });
        return;
    }

    // Telemetry (Client updates server)
    if (req.method === 'POST' && apiPath === '/api/telemetry') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const t = JSON.parse(body || '{}');
            state.clientTelemetry = { ...state.clientTelemetry, ...t, lastUpdate: Date.now() };
            if (t.country && state.editorial.status === 'LIVE') {
                // Si estamos en VIVO, actualizamos la visita actual
                state.editorial.currentVisit = { country: t.country, time: Date.now() };
                state.editorial.visits.push(state.editorial.currentVisit);
                saveState();
            }
            res.writeHead(200, headers);
            res.end('{"success":true}');
        });
        return;
    }

    // Country Memory: Listar todas las memorias
    if (req.method === 'GET' && apiPath === '/api/country-memory') {
        try {
            const memories = [];
            if (fs.existsSync(COUNTRY_MEMORIES_DIR)) {
                const files = fs.readdirSync(COUNTRY_MEMORIES_DIR);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(COUNTRY_MEMORIES_DIR, file);
                            const memory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            const stats = fs.statSync(filePath);
                            memories.push({
                                countryId: memory.countryId,
                                totalVisits: memory.totalVisits || 0,
                                lastVisit: memory.lastVisit,
                                fileSize: stats.size,
                                lastModified: stats.mtime.toISOString()
                            });
                        } catch (e) {
                            console.warn(`Error reading memory file ${file}:`, e.message);
                        }
                    }
                }
            }
            res.writeHead(200, headers);
            res.end(JSON.stringify({ memories, total: memories.length }));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // Curiosities: Endpoint para obtener curiosidades generadas
    if (req.method === 'GET' && apiPath === '/api/curiosities') {
        try {
            const curiosities = [];

            // Generar curiosidades desde las memorias
            if (fs.existsSync(COUNTRY_MEMORIES_DIR)) {
                const files = fs.readdirSync(COUNTRY_MEMORIES_DIR);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(COUNTRY_MEMORIES_DIR, file);
                            const memory = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                            if (memory.visits && memory.visits.length > 0) {
                                for (const visit of memory.visits) {
                                    if (visit.narrative) {
                                        // Extraer curiosidades del relato
                                        const extracted = extractCuriositiesFromNarrative(
                                            visit.narrative,
                                            memory.countryId,
                                            visit.timestamp || visit.visitId || Date.now()
                                        );
                                        curiosities.push(...extracted);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn(`Error processing memory for curiosities ${file}:`, e.message);
                        }
                    }
                }
            }

            // Ordenar por timestamp (más recientes primero)
            curiosities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            res.writeHead(200, headers);
            res.end(JSON.stringify({ curiosities, total: curiosities.length }));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // Country Memory: Cargar memoria de un país específico
    // API: Obtener entradas del diario
    if (req.method === 'GET' && apiPath === '/api/diary-entries') {
        try {
            const entries = [];
            if (fs.existsSync(COUNTRY_MEMORIES_DIR)) {
                const files = fs.readdirSync(COUNTRY_MEMORIES_DIR);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(COUNTRY_MEMORIES_DIR, file);
                            const memory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            if (memory.visits && memory.visits.length > 0) {
                                for (const visit of memory.visits) {
                                    if (visit.narrative) {
                                        entries.push({
                                            country: memory.countryName || `País ${memory.countryId}`,
                                            time: new Date(visit.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                                            topic: visit.isFirstVisit ? 'Primera Visita' : 'Visita Subsecuente',
                                            content: visit.narrative.substring(0, 200) + (visit.narrative.length > 200 ? '...' : ''),
                                            timestamp: visit.timestamp
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn(`[DiaryEntries] Error procesando ${file}:`, e.message);
                        }
                    }
                }
            }

            // Ordenar por timestamp (más recientes primero)
            entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Limitar a 20 entradas más recientes
            const recentEntries = entries.slice(0, 20);

            res.writeHead(200, headers);
            res.end(JSON.stringify({ entries: recentEntries }));
        } catch (e) {
            console.error('[DiaryEntries] Error:', e);
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: 'Failed to load diary entries', message: e.message }));
        }
        return;
    }

    if (req.method === 'GET' && apiPath.startsWith('/api/country-memory/') && !apiPath.endsWith('/visit')) {
        const countryId = apiPath.split('/').pop();
        const memoryFile = path.join(COUNTRY_MEMORIES_DIR, `${countryId}.json`);

        try {
            if (fs.existsSync(memoryFile)) {
                const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
                res.writeHead(200, headers);
                res.end(JSON.stringify(memory));
            } else {
                // Retornar estructura vacía
                res.writeHead(200, headers);
                res.end(JSON.stringify({
                    countryId: countryId,
                    visits: [],
                    totalVisits: 0,
                    lastVisit: null,
                    accumulatedNarrative: ""
                }));
            }
        } catch (e) {
            console.error("Error loading country memory:", e);
            res.writeHead(500, headers);
            res.end('{"error":"Failed to load memory"}');
        }
        return;
    }

    // Country Memory: Guardar visita
    if (req.method === 'POST' && apiPath.startsWith('/api/country-memory/') && apiPath.endsWith('/visit')) {
        const countryId = apiPath.split('/')[3];
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const visitData = JSON.parse(body || '{}');
                const memoryFile = path.join(COUNTRY_MEMORIES_DIR, `${countryId}.json`);

                // Cargar memoria existente o crear nueva
                let memory = {
                    countryId: countryId,
                    visits: [],
                    totalVisits: 0,
                    lastVisit: null,
                    accumulatedNarrative: ""
                };

                if (fs.existsSync(memoryFile)) {
                    memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
                }

                // Agregar nueva visita
                memory.visits.push(visitData);
                memory.totalVisits = memory.visits.length;
                memory.lastVisit = visitData.timestamp;

                // Actualizar narrativa acumulada
                if (memory.accumulatedNarrative) {
                    memory.accumulatedNarrative += "\n\n" + visitData.narrative;
                } else {
                    memory.accumulatedNarrative = visitData.narrative;
                }

                // Guardar
                fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));

                console.log(`💾 Memoria guardada para país ${countryId} (${memory.totalVisits} visitas)`);

                res.writeHead(200, headers);
                res.end(JSON.stringify(memory));
            } catch (e) {
                console.error("Error saving visit:", e);
                res.writeHead(500, headers);
                res.end('{"error":"Failed to save visit"}');
            }
        });
        return;
    }

    // Generate Narrative: Endpoint para generar relato con IA
    if (req.method === 'POST' && apiPath === '/api/generate-narrative') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                let prompt = data.prompt;
                const debug = !!data.debug;
                const forceModelRaw = (data.forceModel || '').toString().trim().toLowerCase();
                const forceModel = forceModelRaw || null;
                const attempts = [];

                // Si se envía countryCode en lugar de prompt, generar el prompt
                if (!prompt && data.countryCode) {
                    const countryInfo = COUNTRY_INFO[data.countryCode];
                    if (countryInfo) {
                        prompt = `Genera un relato narrativo sobre ${countryInfo.name}, enfocándote en aspectos culturales, geográficos y humanos. El relato debe ser natural, fluido y adecuado para streaming.`;
                    } else {
                        res.writeHead(400, headers);
                        res.end('{"error":"Invalid country code"}');
                        return;
                    }
                }

                if (!prompt) {
                    res.writeHead(400, headers);
                    res.end('{"error":"No prompt or countryCode provided"}');
                    return;
                }

                // Inyectar biblia/guion + continuidad (centralizado, aplica a todos los modos)
                const rawPrompt = prompt;
                prompt = buildNarrativePromptWithStory(prompt);

                console.log(`[GenerateNarrative] Iniciando generación con prompt de ${prompt.length} caracteres...`);

                // ESTRATEGIA HÍBRIDA DE GENERACIÓN
                // Prioridad: Calidad (OpenAI/Grok/Gemini) > Modelos Alternativos > Fallback Gratuito > Reserva Local
                let narrative = null;
                let modelUsed = null;
                let status = 'UNKNOWN';
                const kp = keysPresent();

                async function tryProvider(name, fn) {
                    attempts.push(name);
                    try {
                        const out = await fn();
                        const txt = String(out || '').trim();
                        if (txt && txt.length >= 50) {
                            modelUsed = name;
                            status = 'ONLINE';
                            return txt;
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                }

                async function tryForced(name) {
                    // Cuando se fuerza un modelo, NO hacemos cascade ni fallback local.
                    // Esto permite al testing_lab detectar keys faltantes/caídas reales.
                    attempts.push(name);
                    let out = null;
                    if (name === 'openai') out = await dreamWithOpenAI(prompt);
                    else if (name === 'grok') out = await dreamWithGrok(prompt);
                    else if (name === 'gemini') out = await dreamWithGemini(prompt);
                    else if (name === 'deepseek') out = await dreamWithDeepSeek(prompt);
                    else if (name === 'qwen') out = await dreamWithQwen(prompt);
                    else if (name === 'hf') out = await dreamWithHF(prompt);
                    else if (name === 'pollinations') out = await dreamWithPollinations(`Eres ilfass, una IA futurista observando el mundo: ${rawPrompt}`);
                    else if (name === 'local') out = await dreamWithLocalEngine(rawPrompt);
                    const txt = String(out || '').trim();
                    if (txt && txt.length >= 10) {
                        modelUsed = name;
                        status = 'ONLINE';
                        return txt;
                    }
                    modelUsed = name;
                    status = 'OFFLINE';
                    return null;
                }

                if (forceModel) {
                    narrative = await tryForced(forceModel);
                    if (!narrative) {
                        const providerErrors = {};
                        if (debug) {
                            const pe = getProviderError(forceModel);
                            if (pe) providerErrors[forceModel] = pe;
                        }
                        res.writeHead(200, headers);
                        res.end(JSON.stringify({
                            narrative: '',
                            status,
                            modelUsed,
                            attempts,
                            length: 0,
                            is_emergency: true,
                            server_info: debug ? { keys_present: kp, provider_errors: providerErrors } : undefined
                        }));
                        return;
                    }
                } else {
                    narrative = await tryProvider('openai', () => dreamWithOpenAI(prompt));
                    if (!narrative) narrative = await tryProvider('grok', () => dreamWithGrok(prompt));
                    if (!narrative) narrative = await tryProvider('gemini', () => dreamWithGemini(prompt));
                    if (!narrative) {
                        narrative = await tryProvider('deepseek', async () => {
                            return await Promise.race([
                                dreamWithDeepSeek(prompt),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 25000))
                            ]);
                        });
                    }
                    if (!narrative) narrative = await tryProvider('qwen', () => dreamWithQwen(prompt));
                    if (!narrative) narrative = await tryProvider('hf', () => dreamWithHF(prompt));
                    if (!narrative) narrative = await tryProvider('local', () => dreamWithLocalEngine(rawPrompt));

                    // Pollinations text (gratis). Nota: en algunos VPS devuelve 502.
                    if (!narrative) {
                        attempts.push('pollinations');
                        try {
                            const simpleContext = `Eres ilfass, una IA futurista observando el mundo: ${rawPrompt}`;
                            const out = await dreamWithPollinations(simpleContext);
                            const txt = String(out || '').trim();
                            if (txt && txt.length >= 50) {
                                narrative = txt;
                                modelUsed = 'pollinations';
                                status = 'ONLINE';
                            }
                        } catch (e) { }
                    }

                    // Emergencia local (no hardcodeado)
                    if (!narrative || String(narrative).trim().length < 50) {
                        status = 'FALLBACK';
                        modelUsed = modelUsed || 'emergency_local';
                        narrative = generateEmergencyNarrative(rawPrompt);
                    }
                }

                // Ensure protocol format for Router (al menos Ilfass)
                if (narrative && !String(narrative).includes('[ILFASS]') && !String(narrative).includes('[COMPANION]')) {
                    narrative = `[ILFASS]: ${String(narrative).trim()}`;
                }
                narrative = stripContextMetaFromNarrative(narrative);

                console.log(`[GenerateNarrative] Relato FINAL generado: ${narrative.length} caracteres`);

                // Persistir “hilo” (resumen corto para evitar repetición y para auditoría)
                try {
                    const telemetry = state?.clientTelemetry || {};
                    const hint = String(narrative || '').replace(/\s+/g, ' ').trim().slice(0, 260);
                    const promptHint = String(rawPrompt || '').replace(/\s+/g, ' ').trim().slice(0, 160);
                    if (!storyState.lastN) storyState.lastN = [];
                    storyState.lastN.push({
                        ts: Date.now(),
                        scene: telemetry.scene || 'UNKNOWN',
                        country: telemetry.country || 'GLOBAL',
                        dayId: state?.editorial?.dayId || null,
                        promptHint,
                        narrativeHint: hint
                    });
                    // Mantener buffer acotado
                    if (storyState.lastN.length > 40) storyState.lastN = storyState.lastN.slice(-40);
                    saveStoryState();
                } catch (e) { }

                res.writeHead(200, headers);
                const providerErrors = {};
                if (debug) {
                    for (const a of attempts) {
                        const pe = getProviderError(a);
                        if (pe) providerErrors[a] = pe;
                    }
                }
                res.end(JSON.stringify({
                    narrative,
                    status,
                    modelUsed,
                    attempts,
                    length: String(narrative || '').length,
                    is_emergency: status !== 'ONLINE',
                    server_info: debug ? { keys_present: kp, provider_errors: providerErrors } : undefined
                }));
            } catch (e) {
                console.error("Error generating narrative:", e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ error: "Failed to generate narrative", message: e.message }));
            }
        });
        return;
    }

    // Story: ver estado actual (para auditoría y dirección)
    if (req.method === 'GET' && apiPath === '/api/story/state') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
            ok: true,
            activeArcId: storyState?.activeArcId || null,
            lastN: (storyState?.lastN || []).slice(-10),
            telemetry: state?.clientTelemetry || null,
            dayId: state?.editorial?.dayId || null
        }));
        return;
    }

    // Story: cambiar arco activo (control editorial)
    if (req.method === 'POST' && apiPath === '/api/story/arc') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const arcId = (data.arcId || '').toString().trim();
                const arcs = (storyBible?.arcs || []).map(a => a.id);
                if (!arcId || !arcs.includes(arcId)) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ error: 'invalid_arc', arcs }));
                    return;
                }
                storyState.activeArcId = arcId;
                saveStoryState();
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: true, activeArcId: arcId }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: 'bad_json' }));
            }
        });
        return;
    }

    // Story: reset del historial (útil si cambia el tono)
    if (req.method === 'POST' && apiPath === '/api/story/reset') {
        storyState.lastN = [];
        saveStoryState();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // Story Bible: exponer subset seguro para panel (arcos + meta)
    if (req.method === 'GET' && apiPath === '/api/story/bible') {
        const bible = loadStoryBible();
        const arcs = Array.isArray(bible?.arcs) ? bible.arcs : [];
        res.writeHead(200, headers);
        res.end(JSON.stringify({
            ok: true,
            canon: bible?.canon || {},
            voice: bible?.voice ? { persona: bible.voice.persona, language: bible.voice.language } : {},
            arcs: arcs.map(a => ({
                id: a?.id,
                title: a?.title,
                beats: Array.isArray(a?.beats) ? a.beats : []
            })).filter(a => a.id && a.title)
        }));
        return;
    }

    // =========================
    // Clips: marcas de recorte (para shorts/edición)
    // =========================
    if (req.method === 'POST' && apiPath === '/api/clip/mark') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const now = Date.now();
                const dayStart = state?.editorial?.startTime ? Number(state.editorial.startTime) : null;
                const sinceStartSec = dayStart ? Math.max(0, Math.round((now - dayStart) / 1000)) : null;

                const telemetry = state?.clientTelemetry || {};
                const marker = {
                    ts: now,
                    sinceStartSec,
                    dayId: state?.editorial?.dayId || null,
                    type: data.type || 'clip',
                    title: data.title || null,
                    scene: data.scene || telemetry.scene || null,
                    next: data.next || null,
                    url: data.url || null,
                    note: data.note || null
                };
                clipMarkers.push(marker);
                if (clipMarkers.length > 400) clipMarkers = clipMarkers.slice(-400);
                saveClipMarkers();
                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: true, marker }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ ok: false, error: 'bad_json' }));
            }
        });
        return;
    }

    if (req.method === 'GET' && apiPath === '/api/clip/marks') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: true, marks: clipMarkers.slice(-80) }));
        return;
    }

    if (req.method === 'POST' && apiPath === '/api/clip/clear') {
        clipMarkers = [];
        saveClipMarkers();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // POST /api/clips/marker - Guardar marcador de clip
    if (req.method === 'POST' && apiPath === '/api/clips/marker') {
        try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const marker = JSON.parse(body);
                    clipMarkers.push({
                        ...marker,
                        savedAt: nowIso()
                    });
                    saveClipMarkers();
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ ok: true, id: marker.id }));
                } catch (e) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // POST /api/notifications/twitter - Enviar notificación a Twitter
    if (req.method === 'POST' && apiPath === '/api/notifications/twitter') {
        try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { message } = JSON.parse(body);
                    // TODO: Implementar integración con Twitter API
                    // Por ahora solo loguear
                    console.log('[Notifications] Twitter:', message);
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ ok: true, sent: false, note: 'Twitter integration not implemented' }));
                } catch (e) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // POST /api/notifications/discord - Enviar webhook a Discord
    if (req.method === 'POST' && apiPath === '/api/notifications/discord') {
        try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { embed, webhookUrl } = JSON.parse(body);
                    const discordWebhookUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL;

                    if (!discordWebhookUrl) {
                        res.writeHead(200, headers);
                        res.end(JSON.stringify({ ok: false, error: 'Discord webhook URL not configured' }));
                        return;
                    }

                    // Enviar webhook a Discord
                    const discordRes = await fetch(discordWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ embeds: [embed] })
                    });

                    if (discordRes.ok) {
                        res.writeHead(200, headers);
                        res.end(JSON.stringify({ ok: true, sent: true }));
                    } else {
                        res.writeHead(200, headers);
                        res.end(JSON.stringify({ ok: false, error: 'Discord webhook failed' }));
                    }
                } catch (e) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // POST /api/notifications/email - Enviar email
    if (req.method === 'POST' && apiPath === '/api/notifications/email') {
        try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { subject, body: emailBody, to } = JSON.parse(body);
                    // TODO: Implementar envío de email (usar nodemailer o similar)
                    console.log('[Notifications] Email:', { subject, to });
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ ok: true, sent: false, note: 'Email integration not implemented' }));
                } catch (e) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // =========================
    // YOUTUBE CHAT INTEGRATION
    // =========================
    // Cache de Video ID -> Live Chat ID para ahorrar quota
    const ytVideoChatMap = new Map(); // videoId -> liveChatId

    // Endpoint: Obtener chat en vivo (real con fallback a simulación)
    // GET /api/chat/live?videoId=XYZ
    if (req.method === 'GET' && apiPath === '/api/chat/live') {
        const u = new URL(req.url, `http://${req.headers.host}`);
        const videoId = safeSlice(u.searchParams.get('videoId'), 20);
        let accessToken = req.headers['authorization'] || '';
        if (accessToken.startsWith('Bearer ')) accessToken = accessToken.slice(7);

        // Si no hay token o videoId, devolvemos simulación (fallback mode)
        if (!accessToken || !videoId) {
            const sim = [
                { id: `sim-${Date.now()}-1`, author: 'Usuario1', text: 'Increíble vista desde el satélite!', timestamp: Date.now() - 5000 },
                { id: `sim-${Date.now()}-2`, author: 'Viajero_X', text: 'Saludos desde México 🇲🇽', timestamp: Date.now() - 12000 },
                { id: `sim-${Date.now()}-3`, author: 'AnaM', text: '¿Saben qué ciudad es esa?', timestamp: Date.now() - 25000 }
            ];
            res.writeHead(200, headers);
            // Solo devolvemos si la "suerte" dice que hay actividad, para no saturar
            res.end(JSON.stringify({ messages: Math.random() > 0.3 ? sim : [] }));
            return;
        }

        try {
            // 1. Obtener Live Chat ID si no lo tenemos cacheado
            let liveChatId = ytVideoChatMap.get(videoId);
            if (!liveChatId) {
                const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (vidRes.status === 401 || vidRes.status === 403) {
                    throw new Error('youtube_auth_error');
                }

                const vidData = await vidRes.json();
                const DETAILS = vidData?.items?.[0]?.liveStreamingDetails;
                liveChatId = DETAILS?.activeLiveChatId;

                if (liveChatId) {
                    ytVideoChatMap.set(videoId, liveChatId);
                } else {
                    // El video no está en vivo o no tiene chat activo.
                    // Devolver array vacío (no simulación, porque se pidió real explícitamente y falló por lógica de negocio)
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ messages: [], status: 'no_live_chat' }));
                    return;
                }
            }

            // 2. Leer mensajes del chat
            // Usamos nextPageToken para paginación si quisiéramos persistencia, 
            // pero para "live pulse" nos basta lo último.
            const chatRes = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=15`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!chatRes.ok) {
                // Si falla (ej: chat terminó), invalidar cache y lanzar
                ytVideoChatMap.delete(videoId);
                const errText = await chatRes.text();
                throw new Error('chat_fetch_failed: ' + errText);
            }

            const chatData = await chatRes.json();
            const items = chatData.items || [];

            const messages = items.map(item => ({
                id: item.id,
                author: item.authorDetails?.displayName || 'Anónimo',
                text: item.snippet?.displayMessage || '',
                timestamp: new Date(item.snippet?.publishedAt).getTime(),
                isMod: item.authorDetails?.isChatModerator || false,
                isOwner: item.authorDetails?.isChatOwner || false
            }));

            res.writeHead(200, headers);
            res.end(JSON.stringify({ messages, pollingInterval: chatData.pollingIntervalMillis || 5000 }));

        } catch (e) {
            console.warn(`[YouTubeChat] Error fetching real chat for ${videoId}:`, e.message);
            // Fallback silencioso o error explícito
            res.writeHead(200, headers);
            // En caso de error de auth real, forzamos re-login en el cliente enviando error especifico
            if (e.message === 'youtube_auth_error') {
                res.end(JSON.stringify({ error: 'auth_required', messages: [] }));
            } else {
                res.end(JSON.stringify({ error: e.message, messages: [] }));
            }
        }
        return;
    }

    // =========================
    // YOUTUBE OAUTH ENDPOINTS
    // =========================

    // POST /api/youtube/oauth/token - Intercambiar código por tokens
    if (req.method === 'POST' && apiPath === '/api/youtube/oauth/token') {
        try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { code, redirectUri } = JSON.parse(body);
                    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID || '';
                    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET || '';

                    if (!clientId || !clientSecret) {
                        res.writeHead(400, headers);
                        res.end(JSON.stringify({ ok: false, error: 'OAuth credentials not configured' }));
                        return;
                    }

                    // Intercambiar código por tokens
                    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            code: code,
                            client_id: clientId,
                            client_secret: clientSecret,
                            redirect_uri: redirectUri,
                            grant_type: 'authorization_code'
                        })
                    });

                    if (!tokenRes.ok) {
                        const error = await tokenRes.text();
                        console.error('[YouTubeOAuth] Token exchange error:', error);
                        res.writeHead(400, headers);
                        res.end(JSON.stringify({ ok: false, error: 'Failed to exchange code for tokens' }));
                        return;
                    }

                    const tokenData = await tokenRes.json();
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ ok: true, ...tokenData }));
                } catch (e) {
                    console.error('[YouTubeOAuth] Error:', e);
                    res.writeHead(500, headers);
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // POST /api/youtube/oauth/refresh - Refrescar access token
    if (req.method === 'POST' && apiPath === '/api/youtube/oauth/refresh') {
        try {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { refreshToken } = JSON.parse(body);
                    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID || '';
                    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET || '';

                    if (!clientId || !clientSecret) {
                        res.writeHead(400, headers);
                        res.end(JSON.stringify({ ok: false, error: 'OAuth credentials not configured' }));
                        return;
                    }

                    // Refrescar token
                    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            refresh_token: refreshToken,
                            client_id: clientId,
                            client_secret: clientSecret,
                            grant_type: 'refresh_token'
                        })
                    });

                    if (!tokenRes.ok) {
                        const error = await tokenRes.text();
                        console.error('[YouTubeOAuth] Refresh error:', error);
                        res.writeHead(400, headers);
                        res.end(JSON.stringify({ ok: false, error: 'Failed to refresh token' }));
                        return;
                    }

                    const tokenData = await tokenRes.json();
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ ok: true, ...tokenData }));
                } catch (e) {
                    console.error('[YouTubeOAuth] Refresh error:', e);
                    res.writeHead(500, headers);
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // =========================
    // MEDIA MEMORY (Persistencia de imágenes/video)
    // =========================

    // GET /api/media-memory?query=xyz
    if (req.method === 'GET' && apiPath === '/api/media-memory') {
        const u = new URL(req.url, `http://${req.headers.host}`);
        const q = (u.searchParams.get('query') || '').trim().toLowerCase();

        try {
            let memory = [];
            if (fs.existsSync(MEDIA_MEMORY_FILE)) {
                memory = JSON.parse(fs.readFileSync(MEDIA_MEMORY_FILE, 'utf8'));
            }

            // Si hay query, filtrar. Si no, retornar vacío o últimos.
            let results = [];
            if (q) {
                // Búsqueda simple: coincidencia en 'query' tag o 'context'
                results = memory.filter(m => {
                    const matchQuery = (m.query || '').toLowerCase().includes(q);
                    const matchCtx = (m.context || '').toLowerCase().includes(q);
                    return matchQuery || matchCtx;
                });
            } else {
                // Últimos 20 si no hay query
                results = memory.slice(-20);
            }

            // Ordenar por uso reciente o timestamp (aquí por ts desc)
            results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            res.writeHead(200, headers);
            res.end(JSON.stringify({ ok: true, results }));
        } catch (e) {
            console.error('[MediaMemory] GET error:', e);
            res.writeHead(500, headers);
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
    }

    // POST /api/media-memory
    if (req.method === 'POST' && apiPath === '/api/media-memory') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                // Campos esperados: query, url, type (image/video), context (opcional)
                if (!data.url) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ ok: false, error: 'missing_url' }));
                    return;
                }

                let memory = [];
                if (fs.existsSync(MEDIA_MEMORY_FILE)) {
                    memory = JSON.parse(fs.readFileSync(MEDIA_MEMORY_FILE, 'utf8'));
                }

                // Verificar duplicados por URL
                const exists = memory.find(m => m.url === data.url);
                if (exists) {
                    // Actualizar timestamp
                    exists.timestamp = Date.now();
                    exists.useCount = (exists.useCount || 1) + 1;
                } else {
                    // Nuevo registro
                    memory.push({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                        query: (data.query || '').toLowerCase(),
                        url: data.url,
                        type: data.type || 'image',
                        context: data.context || '',
                        timestamp: Date.now(),
                        useCount: 1,
                        source: data.source || 'external'
                    });
                }

                // Guardar (limitar tamaño si crece mucho, ej: 2000 items)
                if (memory.length > 2000) {
                    // Eliminar los más viejos de hace mucho
                    memory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    memory = memory.slice(0, 2000);
                }

                fs.writeFileSync(MEDIA_MEMORY_FILE, JSON.stringify(memory, null, 2));

                res.writeHead(200, headers);
                res.end(JSON.stringify({ ok: true, saved: !exists }));
            } catch (e) {
                console.error('[MediaMemory] POST error:', e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }

    // POST /api/generate-image - Generar imagen con IA
    if (req.method === 'POST' && apiPath === '/api/generate-image') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const prompt = data.prompt;
                if (!prompt) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ error: 'missing_prompt' }));
                    return;
                }

                console.log(`🎨 Generando imagen IA: "${prompt.slice(0, 50)}..."`);

                // Usar generación HF (que tiene fallback a Pollinations)
                const result = await generateImageHF(prompt);

                if (result && result.url) {
                    // Guardar en memoria automáticamente
                    try {
                        let memory = [];
                        if (fs.existsSync(MEDIA_MEMORY_FILE)) {
                            memory = JSON.parse(fs.readFileSync(MEDIA_MEMORY_FILE, 'utf8'));
                        }
                        memory.push({
                            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                            query: (data.context || prompt).toLowerCase(),
                            url: result.url,
                            type: 'image',
                            context: data.context || prompt,
                            timestamp: Date.now(),
                            useCount: 1, // Cuenta como usado
                            source: 'ai_gen'
                        });
                        fs.writeFileSync(MEDIA_MEMORY_FILE, JSON.stringify(memory, null, 2));
                    } catch (e) { console.error("Error saving generated image to memory", e); }

                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ ok: true, url: result.url }));
                } else {
                    res.writeHead(500, headers);
                    res.end(JSON.stringify({ ok: false, error: 'generation_failed' }));
                }
            } catch (e) {
                console.error("Error in generate-image:", e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }

    // Serve control.html
    if (apiPath === '/control.html' || apiPath === '/') {
        const htmlPath = path.join(__dirname, 'control.html');
        try {
            if (fs.existsSync(htmlPath)) {
                const html = fs.readFileSync(htmlPath, 'utf8');
                // Evitar cache del panel (cambios frecuentes)
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(html);
            } else {
                res.writeHead(404, headers);
                res.end('{"error":"control.html not found"}');
            }
        } catch (e) {
            res.writeHead(500, headers);
            res.end('{"error":"Failed to read control.html"}');
        }
        return;
    }

    res.writeHead(404, headers); res.end('{"error":"Not Found"}');
});

server.listen(PORT, () => console.log(`🎮 Server V10 (Intro API) running on ${PORT}`));

// =========================
// SHOWRUNNER LOOP (autonomía minuto a minuto)
// =========================
let showRunnerLastTick = 0;
let showRunnerLastTravel = 0;
let showRunnerLastPulse = 0;
let showRunnerLastMedia = 0;

function showRunnerIsActive() {
    return !!(state?.autoMode && state?.showRunner?.active);
}

function pickNextCountryId(currentId) {
    const ids = Object.keys(COUNTRY_INFO || {});
    if (!ids.length) return null;
    const cur = String(currentId || '').trim();
    const pool = ids.filter(x => x && x !== cur);
    const arr = pool.length ? pool : ids;
    return arr[Math.floor(Math.random() * arr.length)];
}

function listLocalMediaFiles() {
    const out = [];
    const root = path.join(__dirname, 'media');
    const walk = (dir, base = '') => {
        if (!fs.existsSync(dir)) return;
        for (const file of fs.readdirSync(dir)) {
            const fp = path.join(dir, file);
            const rel = path.join(base, file);
            try {
                const st = fs.statSync(fp);
                if (st.isDirectory()) walk(fp, rel);
                else if (/\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(file)) {
                    const urlPath = path.posix.join(...rel.split(path.sep));
                    out.push({
                        name: file,
                        url: `/media/${urlPath}`,
                        mediaType: /\.(mp4|webm)$/i.test(file) ? 'video' : 'image'
                    });
                }
            } catch (e) { }
        }
    };
    walk(root, '');
    return out;
}

function parseDialogueFromNarrative(text) {
    const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
    const script = [];
    for (const line of lines) {
        const u = line.toUpperCase();
        if (u.includes('[ILFASS]')) {
            const content = line.replace(/\[ILFASS\]:?/i, '').trim();
            if (content) script.push({ role: 'ILFASS', text: content });
        } else if (u.includes('[COMPANION]')) {
            const content = line.replace(/\[COMPANION\]:?/i, '').trim();
            if (content) script.push({ role: 'COMPANION', text: content });
        }
    }
    // Si vino en un solo bloque sin tags, igual lo leemos como ILFASS para no romper
    if (!script.length) {
        const clean = String(text || '').replace(/^\s*\[ILFASS\]:\s*/i, '').trim();
        if (clean) script.push({ role: 'ILFASS', text: clean });
    }
    return script.slice(0, 8);
}

async function showRunnerTick() {
    if (!showRunnerIsActive()) return;
    const now = Date.now();
    // Evitar “spam” de eventos
    if (now - showRunnerLastTick < 18_000) return;
    showRunnerLastTick = now;

    const telemetry = state?.clientTelemetry || {};
    const currentCountry = String(telemetry.country || '').trim();
    const mission = String(state?.showRunner?.mission || '').trim().slice(0, 200);

    const shouldTravel = (now - showRunnerLastTravel) > 110_000; // ~2 min
    const shouldPulse = (now - showRunnerLastPulse) > 45_000;
    const shouldMedia = (now - showRunnerLastMedia) > 150_000;

    if (shouldTravel) {
        // Preferir pool global si está disponible
        let nextId = null;
        let nextName = null;
        const wc = await ensureWorldCountries().catch(() => null);
        if (wc && wc.size) {
            const cur = String(currentCountry || '').trim();
            const keys = Array.from(wc.keys());
            const pool = keys.filter(x => x && x !== cur);
            const arr = pool.length ? pool : keys;
            nextId = arr[Math.floor(Math.random() * arr.length)];
            nextName = wc.get(nextId) || null;
        } else {
            nextId = pickNextCountryId(currentCountry);
            nextName = COUNTRY_INFO?.[nextId]?.name || null;
        }

        if (nextId) {
            showRunnerLastTravel = now;
            state.eventQueue.push({ type: 'travel_to', payload: nextId });

            const name = nextName || telemetry.countryName || COUNTRY_INFO?.[nextId]?.name || nextId;
            const travelLine = `[ILFASS]: Giro el globo hacia ${name}. Me guío por lo visible: costas, sombras, densidad de luces.`;
            state.eventQueue.push({
                type: 'observer_speak',
                payload: { title: 'Viaje', only: 'travel', commentary: travelLine, keywords: [] }
            });

            // Flash visual procedural (si no hay generación de imagen externa)
            state.eventQueue.push({
                type: 'procedural_image',
                payload: { seed: now, theme: `Mapa: ${name}`, title: `Señal visual — ${name}` }
            });

            // Secuencia de ARRIBO (delays): comentario + diálogo (roles) + pulso breve
            setTimeout(async () => {
                try {
                    const arrival = `[ILFASS]: Ya estamos sobre ${name}. No describo un país: describo lo que el mapa deja ver ahora mismo.`;
                    state.eventQueue.push({
                        type: 'observer_speak',
                        payload: { title: `Arribo — ${name}`, only: 'arrival', commentary: arrival, keywords: [] }
                    });
                } catch (e) { }
            }, 6500);

            setTimeout(async () => {
                try {
                    const prompt = `Arribo a ${name}. Comentá lo visible del mapa. Elegí un tema nuevo en 1 idea.`;
                    const narrative = await dreamWithLocalEngine(prompt);
                    const script = parseDialogueFromNarrative(narrative);
                    if (script.length) {
                        state.eventQueue.push({
                            type: 'dialogue',
                            payload: { script, countryId: nextId, countryName: name, source: 'local' }
                        });
                    }
                } catch (e) { }
            }, 10500);

            // Crear VISITA (página) en vivo, publicada en /vivos/visitas/
            setTimeout(async () => {
                try {
                    const visit = await createLiveVisitPage({
                        countryId: nextId,
                        countryName: name,
                        seed: now,
                        mission: mission || '',
                        telemetry: state?.clientTelemetry || {},
                        urlBase: '/vivos/visitas/'
                    });
                    if (visit?.url) {
                        state.eventQueue.push({
                            type: 'visit_created',
                            payload: {
                                url: visit.url,
                                title: visit.title,
                                countryName: visit.countryName,
                                slug: visit.slug
                            }
                        });
                        state.eventQueue.push({
                            type: 'observer_speak',
                            payload: {
                                title: 'Bitácora',
                                only: 'visit',
                                commentary: `[ILFASS]: Quedó registrada una visita. Podés verla en Capítulos.`,
                                keywords: []
                            }
                        });
                    }
                } catch (e) { }
            }, 14000);

            setTimeout(async () => {
                try {
                    // Pulso breve (cacheado) para sembrar tema, con fallback local ya implementado
                    const r = await fetch(`http://127.0.0.1:${PORT}/api/observer/pulse?lang=es-419&geo=US&cc=US&max=6&only=trends,news`);
                    const payload = await r.json().catch(() => null);
                    const commentary = String(payload?.commentary || '').trim();
                    if (commentary) {
                        state.eventQueue.push({
                            type: 'observer_speak',
                            payload: {
                                title: payload?.title || 'Pulso breve',
                                only: payload?.only || 'trends,news',
                                commentary,
                                keywords: Array.isArray(payload?.keywords) ? payload.keywords : []
                            }
                        });
                    }
                } catch (e) { }
            }, 19500);

            return;
        }
    }

    if (shouldPulse) {
        showRunnerLastPulse = now;
        try {
            // Reusar el endpoint existente (cacheado) desde el propio servidor.
            const r = await fetch(`http://127.0.0.1:${PORT}/api/observer/pulse?lang=es-419&geo=US&cc=US&max=8&only=all`);
            const payload = await r.json().catch(() => null);
            const commentary = String(payload?.commentary || '').trim();
            const keywords = Array.isArray(payload?.keywords) ? payload.keywords : [];
            if (commentary) {
                state.eventQueue.push({
                    type: 'observer_speak',
                    payload: {
                        title: payload?.title || 'Pulso del mundo',
                        only: payload?.only || 'all',
                        commentary,
                        keywords
                    }
                });
                return;
            }
        } catch (e) { }

        // Fallback: comentario local sobre pantalla/mission
        const fallback = await dreamWithLocalEngine(`Misión: ${mission || 'mantener ritmo'}. Comentá lo visible en el mapa y abrí un tema nuevo sin inventar hechos.`);
        state.eventQueue.push({
            type: 'observer_speak',
            payload: { title: 'Pulso (local)', only: 'local', commentary: fallback, keywords: [] }
        });
        return;
    }

    if (shouldMedia) {
        showRunnerLastMedia = now;
        const list = listLocalMediaFiles();
        const pick = list.length ? list[Math.floor(Math.random() * list.length)] : null;
        if (pick) {
            state.eventQueue.push({
                type: 'media',
                url: pick.url,
                mediaType: pick.mediaType,
                name: pick.name,
                textToSpeak: `[ILFASS]: Aparece una imagen. No la explico: la dejo atravesarme y sigo el hilo.`
            });
            return;
        }
    }
}

setInterval(() => { showRunnerTick().catch(() => { }); }, 7_000);

