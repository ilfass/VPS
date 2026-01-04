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

// Estado Global
let state = {
    autoMode: true,
    eventQueue: [],
    clientTelemetry: {
        scene: 'UNKNOWN',
        country: 'UNKNOWN',
        day: 0,
        lastUpdate: 0
    },
    travelQueue: [] // COLA DE VIAJE (Playlist)
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

// --- UTILIDAD DE GENERACIÓN (THE DREAMER) ---
// --- UTILIDAD DE GENERACIÓN (MULTI-CEREBRO) ---

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
    // Prompts mejorados para que funcionen bien en ambos modelos
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

    // GET /api/living-script - Frontend pide los bloques de Lego
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

    // POST /api/dream - Trigger asíncrono para generar contenido futuro
    if (req.method === 'POST' && apiPath === '/api/dream') {
        res.writeHead(202, headers);
        res.end(JSON.stringify({ status: "Dreaming started..." }));

        // Ejecución en background (Fire & Forget)
        // Solo soñamos 1 frase por vez para no saturar
        const categories = ['definition', 'concept'];
        const targetCat = categories[Math.floor(Math.random() * categories.length)];

        const newPhrase = await dreamNewPhrase(targetCat);
        if (newPhrase) {
            const currentData = loadLivingScript() || { definitions: [], concepts: [], missions: [] };

            // Añadir y limitar a 20 frases para no crecer infinitamente
            if (targetCat === 'definition') currentData.definitions.push(newPhrase);
            if (targetCat === 'concept') currentData.concepts.push(newPhrase);

            // Trim
            if (currentData.definitions.length > 20) currentData.definitions.shift();

            saveLivingScript(currentData);
        }
        return;
    }

    // ... (RUTAS VIEJAS DE POLLING MANTENIDAS) ...
    // GET /status
    if (req.method === 'GET' && apiPath === '/status') {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
            autoMode: state.autoMode,
            telemetry: state.clientTelemetry,
            queue: state.travelQueue || []
        }));
        return;
    }

    // POST /event/queue/add - Añadir a la playlist
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

    // POST /event/queue/pop - Consumir siguiente destino (Lo usa el AutoPilot)
    if (req.method === 'POST' && apiPath === '/event/queue/pop') {
        const next = (state.travelQueue && state.travelQueue.length > 0) ? state.travelQueue.shift() : null;
        res.writeHead(200, headers);
        res.end(JSON.stringify({ nextCountry: next, remaining: state.travelQueue ? state.travelQueue.length : 0 }));
        return;
    }

    // POST /api/telemetry - Frontend reporta su estado real
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

    // GET /poll
    if (req.method === 'GET' && apiPath === '/poll') {
        res.writeHead(200, headers);
        const response = { autoMode: state.autoMode, events: [...state.eventQueue] };
        state.eventQueue = [];
        res.end(JSON.stringify(response));
        return;
    }

    // Endpoint específico para viajar a un país
    if (apiPath.startsWith('/event/travel/')) {
        const targetCountry = apiPath.split('/').pop();
        state.eventQueue.push({
            type: 'travel_to',
            payload: targetCountry
        });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'queued', country: targetCountry }));
        return;
    }

    // Endpoint específico para cambio de escena con payload
    if (apiPath.startsWith('/event/scene/')) {
        const targetScene = apiPath.split('/').pop();
        state.eventQueue.push({
            type: 'scene_change',
            payload: targetScene
        });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'queued', scene: targetScene }));
        return;
    }

    // Rutas de eventos simples (news, fact)
    if (apiPath.startsWith('/event/')) {
        state.eventQueue.push({ type: apiPath.split('/').pop() });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // 404
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🎮 Control Server (Dreamer Edition) running on port ${PORT}`);
});
