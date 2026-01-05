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
    autoMode: false, // Por defecto MANUAL según manifiesto nuevo
    currentScene: 'intro',
    eventQueue: [],
    clientTelemetry: {
        scene: 'UNKNOWN',
        country: 'UNKNOWN',
        day: 0,
        lastUpdate: 0
    },
    travelQueue: [],
    // NUEVO: ESTADO EDITORIAL
    editorial: {
        status: 'IDLE', // IDLE, LIVE
        dayId: null,    // "Dia 1", "Especial"
        isTest: false,  // Nuevo: Flag de Simulación
        startTime: null,
        visits: [],     // Historial de visitas de este dia
        currentVisit: null // Visita activa { country, start, content: [] }
    }
};

// Headers CORS
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// --- UTILIDADES DE PERSISTENCIA ---
function loadLivingScript() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) { console.error("Error reading script:", e); }
    return null; // Fallback
}

function saveLivingScript(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
    } catch (e) { console.error("Error saving script:", e); }
}

// Helper para guardar el Libro del Día
function saveEditorialDay(dayData) {
    const filename = `day-${dayData.dayId.replace(/\s+/g, '_')}-${Date.now()}.json`;

    // Si es TEST, guardar en carpeta separada
    const subfolder = dayData.isTest ? 'simulations' : 'books';
    const booksDir = path.join(__dirname, 'data', subfolder);

    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir, { recursive: true });

    const filepath = path.join(booksDir, filename);

    try {
        fs.writeFileSync(filepath, JSON.stringify(dayData, null, 2));
        console.log(`[Editorial] 📘 ${dayData.isTest ? '[TEST]' : ''} Book Page saved: ${filepath}`);
    } catch (e) { console.error("Error saving book:", e); }
}

// --- UTILIDAD DE GENERACIÓN (THE DREAMER) ---
async function dreamWithHuggingFace(prompt) {
    if (!process.env.HF_API_KEY) return null;

    console.log("🧠 Switching to Hugging Face (Mistral)...");
    const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: `[INST] ${prompt} [/INST]`,
                parameters: { max_new_tokens: 50, return_full_text: false, temperature: 0.8 }
            })
        });

        const data = await response.json();
        if (data && data[0] && data[0].generated_text) {
            let text = data[0].generated_text.replace(/"/g, '').trim();
            console.log(`✨ Dreamed (HF): ${text}`);
            return text;
        }
        return null;
    } catch (e) {
        console.error("HF Dream failed:", e.message);
        return null;
    }
}

async function dreamNewPhrase(category) {
    let prompt = "";
    if (category === 'definition') {
        prompt = "Eres ilfass, una IA viajera y misteriosa. Genera UNA sola frase corta (max 10 palabras) filosófica y poética sobre qué es este viaje digital. Sin explicaciones, solo la frase.";
    } else if (category === 'concept') {
        prompt = "Eres ilfass. Define brevemente un concepto sobre la memoria digital, el tiempo o la soledad en la red. Una sola frase corta, estilo cyberpunk poético.";
    }

    // 1. INTENTO CON GEMINI (Principal)
    if (GoogleGenerativeAI && process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace(/"/g, '').trim();
            console.log(`✨ Dreamed (Gemini): ${text}`);
            return text;
        } catch (e) {
            console.warn("⚠️ Gemini failed (Rate Limit?), trying Fallback...", e.message);
        }
    }

    // 2. FALLBACK: HUGGING FACE
    return await dreamWithHuggingFace(prompt);
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const apiPath = parsedUrl.pathname;

    // Manejar Preflight CORS
    if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

    // GET /api/living-script
    if (req.method === 'GET' && apiPath === '/api/living-script') {
        const data = loadLivingScript();
        if (data) {
            res.writeHead(200, headers);
            res.end(JSON.stringify(data));
        } else {
            res.writeHead(404, headers);
            res.end(JSON.stringify({ error: "No data" }));
        }
        return;
    }

    // GET /api/media-list (MEJORADO: RECURSIVO)
    if (req.method === 'GET' && apiPath === '/api/media-list') {
        const mediaDir = path.join(__dirname, 'media');

        // Función recursiva para listar archivos
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
                    if (/\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(file)) {
                        // Usar path.posix para asegurar barras normales en URL
                        const urlPath = path.posix.join(base, file);
                        results.push({
                            name: file, // Nombre solo
                            path: base, // Carpeta (Pais)
                            // URL debe ser relativa al servidor web nginx -> /media/Pais/Archivo
                            url: `/media/${urlPath.replace(/\\/g, '/')}`,
                            type: /\.(mp4|webm)$/i.test(file) ? 'video' : 'image'
                        });
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
            console.error("Media list error:", e);
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: "Media Error" }));
        }
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
            const currentData = loadLivingScript() || { definitions: [], concepts: [], missions: [] };
            if (targetCat === 'definition') currentData.definitions.push(newPhrase);
            if (targetCat === 'concept') currentData.concepts.push(newPhrase);
            if (currentData.definitions.length > 20) currentData.definitions.shift();
            saveLivingScript(currentData);
        }
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
            console.log(`[Editorial] ▶ STARTED DAY: ${state.editorial.dayId} (Test: ${state.editorial.isTest})`);
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true, editorial: state.editorial }));
        });
        return;
    }

    // POST /event/day/end
    if (req.method === 'POST' && apiPath === '/event/day/end') {
        if (state.editorial.status === 'LIVE') {
            // Cerrar última visita si existe
            if (state.editorial.currentVisit) {
                state.editorial.currentVisit.endTime = Date.now();
                state.editorial.visits.push(state.editorial.currentVisit);
            }

            const finalData = { ...state.editorial, endTime: Date.now(), status: 'ARCHIVED' };
            saveEditorialDay(finalData);

            console.log(`[Editorial] ⏹ ENDED DAY: ${state.editorial.dayId}`);

            // Logica Reset
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
        console.log(`[Director] Travel command: ${code}`);

        // 1. Encolar evento de viaje (Usar payload para compatibilidad con event-manager)
        state.eventQueue.push({ type: 'travel_to', payload: code });

        // 2. REGISTRO EDITORIAL (Si estamos EN VIVO)
        if (state.editorial.status === 'LIVE') {
            const now = Date.now();
            // Cerrar anterior
            if (state.editorial.currentVisit) {
                state.editorial.currentVisit.endTime = now;
                state.editorial.visits.push(state.editorial.currentVisit);
            }
            // Abrir nueva
            state.editorial.currentVisit = {
                country: code,
                startTime: now,
                endTime: null,
                mediaShown: []
            };
        }

        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // POST /event/auto_toggle
    if (req.method === 'POST' && apiPath === '/event/auto_toggle') {
        state.autoMode = !state.autoMode;
        console.log(`[Director] Auto Mode toggled to: ${state.autoMode}`);
        state.eventQueue.push({ type: 'mode_change', autoMode: state.autoMode });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, autoMode: state.autoMode }));
        return;
    }

    // POST /event/media
    if (req.method === 'POST' && apiPath === '/event/media') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const mediaData = JSON.parse(body);
                console.log(`[Director] Launching Media: ${JSON.stringify(mediaData)}`);
                state.eventQueue.push({
                    type: 'media',
                    url: mediaData.url,
                    mediaType: mediaData.type || 'image'
                });
                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: 'invalid body' }));
            }
        });
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
            try {
                const { code } = JSON.parse(body);
                if (code) {
                    if (!state.travelQueue) state.travelQueue = [];
                    state.travelQueue.push(code);
                    console.log(`[Queue] Added country: ${code}`);
                }
                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: true, queue: state.travelQueue }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: 'invalid body' }));
            }
        });
        return;
    }

    // POST /event/queue/pop
    if (req.method === 'POST' && apiPath === '/event/queue/pop') {
        const next = (state.travelQueue && state.travelQueue.length > 0) ? state.travelQueue.shift() : null;
        res.writeHead(200, headers);
        res.end(JSON.stringify({ nextCountry: next, remaining: state.travelQueue ? state.travelQueue.length : 0 }));
        return;
    }

    // POST /api/telemetry
    if (req.method === 'POST' && apiPath === '/api/telemetry') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const telemetry = JSON.parse(body);
                state.clientTelemetry = { ...state.clientTelemetry, ...telemetry, lastUpdate: Date.now() };
                res.writeHead(200, headers);
                res.end(JSON.stringify({ status: 'updated' }));
            } catch (e) {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: 'invalid json' }));
            }
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

    // Scene change
    if (apiPath.startsWith('/event/scene/')) {
        const targetScene = apiPath.split('/').pop();
        state.eventQueue.push({ type: 'scene_change', payload: targetScene });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'queued', scene: targetScene }));
        return;
    }

    // 404
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🎮 Control Server (Dreamer Edition) running on port ${PORT}`);
});
