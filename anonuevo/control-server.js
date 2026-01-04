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

// --- UTILIDAD DE GENERACIÓN (THE DREAMER) ---
async function dreamNewPhrase(category) {
    if (!GoogleGenerativeAI || !process.env.GEMINI_API_KEY) {
        console.log("🚫 Dreaming disabled: No SDK or API Key.");
        return null; // Simulamos fallo silencioso
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = "";
    if (category === 'definition') {
        prompt = "Actúa como ilfass, una IA viajera filosófica. Genera 1 frase corta (max 10 palabras) definiendo qué es este stream. Tono: Cyberpunk, solemne, misterioso. Ej: 'No busques un final predecible'.";
    } else if (category === 'concept') {
        prompt = "Actúa como ilfass. Genera 1 frase corta sobre la memoria digital y el tiempo real. Tono: Profundo y técnico. Ej: 'Cada segundo queda registrado en el libro'.";
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().replace(/"/g, '').trim();
        console.log(`✨ Dreamed (${category}): ${text}`);
        return text;
    } catch (e) {
        console.error("Dream failed:", e.message);
        return null;
    }
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
            telemetry: state.clientTelemetry
        }));
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

    // Rutas de eventos (Simplificadas en catch-all para evitar borrar lógica existente)
    if (apiPath.startsWith('/event/')) {
        // Lógica de colas existente...
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
