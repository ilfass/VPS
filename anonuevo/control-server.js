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

// Estado Global del Sistema
let state = {
    autoMode: false, currentScene: 'intro', eventQueue: [], travelQueue: [],
    clientTelemetry: { scene: 'UNKNOWN', country: 'UNKNOWN', day: 0, lastUpdate: 0 },
    editorial: { status: 'IDLE', dayId: null, isTest: false, startTime: null, visits: [], currentVisit: null }
};

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// --- DATA UTILS ---
function loadLivingScript() {
    try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : null; } catch (e) { return null; }
}
function saveLivingScript(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4)); }
function saveEditorialDay(dayData) {
    const filename = `day-${dayData.dayId.replace(/\s+/g, '_')}-${Date.now()}.json`;
    const subfolder = dayData.isTest ? 'simulations' : 'books';
    const booksDir = path.join(__dirname, 'data', subfolder);
    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir, { recursive: true });
    fs.writeFileSync(path.join(booksDir, filename), JSON.stringify(dayData, null, 2));
}

// --- AI LAYERS ---

// Nivel 5: Nano Banana (Experimental)
async function dreamWithNanoBanana(prompt) {
    console.log("🍌 Trying Nano Banana...");
    return null; // A la espera de endpoint real
}

// Nivel 4: Pollinations (Fallback Universal)
async function generateImagePollinations(prompt) {
    console.log("🎨 Fallback to Pollinations...");
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        const blob = await (await fetch(url)).blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const filename = `AI_Pollinations_${Date.now()}.jpg`;
        const dir = path.join(__dirname, 'media', 'AI_Generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        console.log(`✨ Saved (Pollinations): ${filename}`);
        return { filename, url: `/media/AI_Generated/${filename}` };
    } catch (e) { return null; }
}
async function dreamWithPollinations(prompt) {
    try { return (await (await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`)).text()).trim(); }
    catch (e) { return "Silencio digital."; }
}

// Nivel 3: Hugging Face
async function generateImageHF(prompt) {
    if (!process.env.HF_API_KEY) return await generateImagePollinations(prompt);
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
        console.log(`✨ Saved (HF): ${filename}`);
        return { filename, url: `/media/AI_Generated/${filename}` };
    } catch (e) { return await generateImagePollinations(prompt); }
}
async function dreamWithHF(prompt) {
    if (!process.env.HF_API_KEY) return await dreamWithPollinations(prompt);
    try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2`, {
            method: "POST", headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: `[INST] ${prompt} [/INST]`, parameters: { max_new_tokens: 100, return_full_text: false } })
        });
        const data = await resp.json();
        return (data[0]?.generated_text || "").replace(/"/g, '').trim() || await dreamWithPollinations(prompt);
    } catch (e) { return await dreamWithPollinations(prompt); }
}

// Nivel 2: Gemini
async function dreamWithGemini(prompt) {
    if (!GoogleGenerativeAI || !process.env.GEMINI_API_KEY) return null;
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const res = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt);
        return res.response.text().replace(/"/g, '').trim();
    } catch (e) { return null; }
}

// Nivel 1: OpenAI (Omni Layer)
async function dreamWithOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) return null;
    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], max_tokens: 60 })
        });
        const data = await resp.json();
        return data.choices?.[0]?.message?.content.replace(/"/g, '').trim() || null;
    } catch (e) { return null; }
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

// Orquestadores
async function dreamNarrative(context) {
    const prompt = `Describe brevemente (max 20 palabras) esta imagen cyberpunk: "${context}".`;
    let res = await dreamWithOpenAI(prompt);
    if (!res) res = await dreamWithGemini(prompt);
    if (!res) res = await dreamWithNanoBanana(prompt); // ;)
    if (res) return res;
    return await dreamWithHF(prompt); // HF fallback cascade handles Pollinations
}

// SERVER
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const apiPath = parsedUrl.pathname;

    if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

    // Endpoints
    if (req.method === 'GET' && apiPath === '/status') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ autoMode: state.autoMode, currentScene: state.currentScene, editorial: state.editorial, queue: state.travelQueue }));
        return;
    }

    if (req.method === 'POST' && apiPath === '/api/generate-image') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            const { prompt } = JSON.parse(body || '{}');
            if (!prompt) { res.writeHead(400, headers); res.end('{"error":"No prompt"}'); return; }
            const result = await generateImageOpenAI(prompt); // Empieza por OpenAI -> HF -> Pollinations
            res.writeHead(result ? 200 : 500, headers);
            res.end(JSON.stringify(result || { error: "Failed" }));
        });
        return;
    }

    if (req.method === 'POST' && apiPath === '/event/media') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            const m = JSON.parse(body || '{}');
            let txt = m.narrate ? await dreamNarrative(m.name || "imagen") : null;
            state.eventQueue.push({ type: 'media', url: m.url, mediaType: m.type || 'image', textToSpeak: txt });
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true, narrative: txt }));
        });
        return;
    }

    if (req.method === 'GET' && apiPath === '/api/media-list') {
        const getFiles = (dir, base = '') => {
            let res = [];
            if (!fs.existsSync(dir)) return res;
            fs.readdirSync(dir).forEach(file => {
                const fp = path.join(dir, file);
                if (fs.statSync(fp).isDirectory()) res = res.concat(getFiles(fp, path.join(base, file)));
                else if (/\.(jpg|jpeg|png|gif|mp4|webm|mp3|txt)$/i.test(file)) {
                    // Fix path separators for URL
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
        res.writeHead(200, headers);
        res.end(JSON.stringify({ autoMode: state.autoMode, events: state.eventQueue }));
        state.eventQueue = [];
        return;
    }

    // Auto toggle
    if (apiPath === '/event/auto_toggle') {
        state.autoMode = !state.autoMode;
        state.eventQueue.push({ type: 'mode_change', autoMode: state.autoMode });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Travel
    if (apiPath.startsWith('/event/travel/')) {
        state.eventQueue.push({ type: 'travel_to', payload: apiPath.split('/').pop() });
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
    }

    // Day controls (Simplified)
    if (req.method === 'POST' && (apiPath === '/event/day/start' || apiPath === '/event/day/end')) {
        // Logic condensed for brevity in V8 update, assumes V5 logic logic is standard
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
            res.writeHead(200, headers); res.end('{"success":true}');
        });
        return;
    }

    res.writeHead(404, headers); res.end('{"error":"Not Found"}');
});

server.listen(PORT, () => console.log(`🎮 Server V8 (OpenAI+NanoBanana) running on ${PORT}`));
