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
    console.log("⚠️ Generative AI SDK not found. Install '@google/generative-ai' to enable Dreaming.");
}

const PORT = 3005;
const DATA_FILE = path.join(__dirname, 'data', 'living-script.json');

// Estado Global del Sistema
let state = {
    autoMode: false,
    currentScene: 'intro',
    eventQueue: [],
    clientTelemetry: {
        scene: 'UNKNOWN',
        country: 'UNKNOWN',
        day: 0,
        lastUpdate: 0
    },
    travelQueue: [],
    editorial: {
        status: 'IDLE', // IDLE, LIVE
        dayId: null,
        isTest: false,
        startTime: null,
        visits: [],
        currentVisit: null
    }
};

// Headers CORS
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// --- UTILIDADES ---
function loadLivingScript() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) { console.error("Error reading script:", e); }
    return null;
}

function saveLivingScript(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
    } catch (e) { console.error("Error saving script:", e); }
}

function saveEditorialDay(dayData) {
    const filename = `day-${dayData.dayId.replace(/\s+/g, '_')}-${Date.now()}.json`;
    const subfolder = dayData.isTest ? 'simulations' : 'books';
    const booksDir = path.join(__dirname, 'data', subfolder);
    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir, { recursive: true });
    const filepath = path.join(booksDir, filename);
    try {
        fs.writeFileSync(filepath, JSON.stringify(dayData, null, 2));
        console.log(`[Editorial] 📘 ${dayData.isTest ? '[TEST]' : ''} Book Page saved: ${filepath}`);
    } catch (e) { console.error("Error saving book:", e); }
}

// --- GENERACIÓN IA (THE DREAMER) ---
async function generateImageHF(prompt) {
    if (!process.env.HF_API_KEY) return null;
    console.log("🎨 Generating Image with HF (SDXL)...");
    const HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt })
        });

        if (!response.ok) throw new Error(`HF Error: ${response.statusText}`);

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const dir = path.join(__dirname, 'media', 'AI_Generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filename = `AI_${Date.now()}_${prompt.slice(0, 10).replace(/[^a-z0-9]/gi, '_')}.jpg`;
        const filepath = path.join(dir, filename);

        fs.writeFileSync(filepath, buffer);
        console.log(`✨ Image saved: ${filename}`);
        return { filename, url: `/media/AI_Generated/${filename}` };

    } catch (e) {
        console.error("HF Image Gen failed:", e.message);
        return null;
    }
}

async function dreamWithHuggingFace(prompt) {
    if (!process.env.HF_API_KEY) return null;
    console.log("🧠 Switching to Hugging Face (Mistral)...");
    const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";
    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: `[INST] ${prompt} [/INST]`, parameters: { max_new_tokens: 100, return_full_text: false, temperature: 0.8 } })
        });
        const data = await response.json();
        if (data && data[0] && data[0].generated_text) {
            return data[0].generated_text.replace(/"/g, '').trim();
        }
        return null;
    } catch (e) { console.error("HF Dream failed:", e.message); return null; }
}

async function dreamNarrative(context) {
    const prompt = `Eres el narrador de un viaje futurista llamado "ilfass". Estás mostrando la siguiente imagen a la audiencia: "${context}". Genera una descripción muy breve (máximo 2 frases), poética y misteriosa, explicando qué estamos viendo. Estilo documental cyberpunk.`;

    // 1. Gemini
    if (GoogleGenerativeAI && process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text().replace(/"/g, '').trim();
        } catch (e) { console.warn("Gemini intent failed:", e.message); }
    }
    // 2. Fallback
    return await dreamWithHuggingFace(prompt);
}

async function dreamNewPhrase(category) {
    let prompt = "";
    if (category === 'definition') prompt = "Eres ilfass. Genera una frase corta filosófica sobre el viaje digital.";
    else if (category === 'concept') prompt = "Eres ilfass. Define un concepto sobre la memoria digital en una frase corta.";

    if (GoogleGenerativeAI && process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text().replace(/"/g, '').trim();
        } catch (e) { }
    }
    return await dreamWithHuggingFace(prompt);
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const apiPath = parsedUrl.pathname;

    if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

    // --- ENDPOINTS ---

    // GET /api/living-script
    if (req.method === 'GET' && apiPath === '/api/living-script') {
        res.writeHead(200, headers);
        res.end(JSON.stringify(loadLivingScript() || { error: "No data" }));
        return;
    }

    // GET /api/media-list (RECURSIVO)
    if (req.method === 'GET' && apiPath === '/api/media-list') {
        const mediaDir = path.join(__dirname, 'media');
        const getFiles = (dir, base = '') => {
            let results = [];
            if (!fs.existsSync(dir)) return results;
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getFiles(filePath, path.join(base, file)));
                } else {
                    if (/\.(jpg|jpeg|png|gif|mp4|webm|mp3|txt|md)$/i.test(file)) {
                        const urlPath = path.posix.join(base, file);
                        const parts = base.split(path.sep);
                        const countryFolder = parts.length > 0 ? parts[0] : 'Global';
                        let type = 'image';
                        if (/\.(mp4|webm)$/i.test(file)) type = 'video';
                        if (/\.(mp3|wav)$/i.test(file)) type = 'audio';
                        if (/\.(txt|md)$/i.test(file)) type = 'text';
                        results.push({ name: file, path: base, folder: countryFolder, url: `/media/${urlPath.replace(/\\/g, '/')}`, type: type });
                    }
                }
            });
            return results;
        };
        try {
            const mediaFiles = getFiles(mediaDir);
            res.writeHead(200, headers);
            res.end(JSON.stringify(mediaFiles));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: "Media Error" }));
        }
        return;
    }

    // POST /api/generate-image (IA)
    if (req.method === 'POST' && apiPath === '/api/generate-image') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const { prompt } = JSON.parse(body || '{}');
            if (!prompt) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: "No prompt" }));
                return;
            }
            const result = await generateImageHF(prompt);
            if (result) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: true, ...result }));
            } else {
                res.writeHead(500, headers);
                res.end(JSON.stringify({ error: "Generation failed" }));
            }
        });
        return;
    }

    // POST /api/dream
    if (req.method === 'POST' && apiPath === '/api/dream') {
        res.writeHead(202, headers);
        res.end(JSON.stringify({ status: "Dreaming started..." }));
        const categories = ['definition', 'concept'];
        const targetCat = categories[Math.floor(Math.random() * categories.length)];
        const newPhrase = await dreamNewPhrase(targetCat);
        if (newPhrase) {
            const currentData = loadLivingScript() || { definitions: [], concepts: [] };
            if (targetCat === 'definition') currentData.definitions.push(newPhrase);
            if (targetCat === 'concept') currentData.concepts.push(newPhrase);
            if (currentData.definitions.length > 20) currentData.definitions.shift();
            saveLivingScript(currentData);
        }
        return;
    }

    // POST /event/media (LANZAMIENTO + NARRACIÓN)
    if (req.method === 'POST' && apiPath === '/event/media') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const mediaData = JSON.parse(body);
                console.log(`[Director] Launching Media: ${JSON.stringify(mediaData)}`);

                let narrativeText = null;
                // Si se pide narración, generar texto con IA
                if (mediaData.narrate) {
                    // Usar nombre de archivo o prompt como contexto
                    // Eliminar extensión y caracteres raros
                    const context = mediaData.name ? mediaData.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ") : "una imagen misteriosa";
                    console.log(`[Narrator] Generating script for: ${context}`);
                    narrativeText = await dreamNarrative(context);
                }

                state.eventQueue.push({
                    type: 'media',
                    url: mediaData.url,
                    mediaType: mediaData.type || 'image',
                    textToSpeak: narrativeText // Enviamos el texto generado
                });
                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: true, narrative: narrativeText }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: 'invalid body' }));
            }
        });
        return;
    }

    // POST /event/day/start
    if (req.method === 'POST' && apiPath === '/event/day/start') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { id, isTest } = JSON.parse(body || '{}');
            state.editorial = {
                status: 'LIVE',
                dayId: id || `Dia_${new Date().toISOString().split('T')[0]}`,
                isTest: !!isTest,
                startTime: Date.now(),
                visits: [],
                currentVisit: null
            };
            console.log(`[Editorial] ▶ STARTED DAY: ${state.editorial.dayId}`);
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true, editorial: state.editorial }));
        });
        return;
    }

    // POST /event/day/end
    if (req.method === 'POST' && apiPath === '/event/day/end') {
        if (state.editorial.status === 'LIVE') {
            if (state.editorial.currentVisit) {
                state.editorial.currentVisit.endTime = Date.now();
                state.editorial.visits.push(state.editorial.currentVisit);
            }
            const finalData = { ...state.editorial, endTime: Date.now(), status: 'ARCHIVED' };
            saveEditorialDay(finalData);
            state.editorial = { status: 'IDLE', dayId: null, isTest: false, startTime: null, visits: [], currentVisit: null };
            state.autoMode = false;
        }
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // GET /event/travel/:code
    if (req.method === 'GET' && apiPath.startsWith('/event/travel/')) {
        const code = apiPath.split('/').pop();
        state.eventQueue.push({ type: 'travel_to', payload: code }); // Corrected payload
        if (state.editorial.status === 'LIVE') {
            const now = Date.now();
            if (state.editorial.currentVisit) {
                state.editorial.currentVisit.endTime = now;
                state.editorial.visits.push(state.editorial.currentVisit);
            }
            state.editorial.currentVisit = { country: code, startTime: now, endTime: null, mediaShown: [] };
        }
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // POST /event/auto_toggle
    if (req.method === 'POST' && apiPath === '/event/auto_toggle') {
        state.autoMode = !state.autoMode;
        state.eventQueue.push({ type: 'mode_change', autoMode: state.autoMode });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, autoMode: state.autoMode }));
        return;
    }

    // GET /status
    if (req.method === 'GET' && apiPath === '/status') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
            autoMode: state.autoMode,
            currentScene: state.currentScene,
            telemetry: state.clientTelemetry,
            queue: state.travelQueue || [],
            editorial: state.editorial
        }));
        return;
    }

    // POST /event/queue/add
    if (req.method === 'POST' && apiPath === '/event/queue/add') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { code } = JSON.parse(body || '{}');
            if (code) {
                if (!state.travelQueue) state.travelQueue = [];
                state.travelQueue.push(code);
            }
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // POST /event/queue/pop
    if (req.method === 'POST' && apiPath === '/event/queue/pop') {
        const next = (state.travelQueue && state.travelQueue.length > 0) ? state.travelQueue.shift() : null;
        res.writeHead(200, headers);
        res.end(JSON.stringify({ nextCountry: next }));
        return;
    }

    // POST /api/telemetry
    if (req.method === 'POST' && apiPath === '/api/telemetry') {
        // Dummy handler
        req.on('data', () => { });
        req.on('end', () => {
            res.writeHead(200, headers);
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    // GET /poll (Legacy)
    if (req.method === 'GET' && apiPath === '/poll') {
        res.writeHead(200, headers);
        const response = { autoMode: state.autoMode, events: [...state.eventQueue] };
        state.eventQueue = [];
        res.end(JSON.stringify(response));
        return;
    }

    // Scene change & 404
    if (apiPath.startsWith('/event/scene/')) {
        const targetScene = apiPath.split('/').pop();
        state.eventQueue.push({ type: 'scene_change', payload: targetScene });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'queued' }));
        return;
    }

    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🎮 Control Server (Dreamer Edition V6) running on port ${PORT}`);
});
