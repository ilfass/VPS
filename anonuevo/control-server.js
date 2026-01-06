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

// Asegurar que el directorio de memorias existe
if (!fs.existsSync(COUNTRY_MEMORIES_DIR)) {
    fs.mkdirSync(COUNTRY_MEMORIES_DIR, { recursive: true });
}

// Estado Global
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
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - pollinationsLastRequest;
    if (timeSinceLastRequest < POLLINATIONS_MIN_DELAY) {
        await new Promise(resolve => setTimeout(resolve, POLLINATIONS_MIN_DELAY - timeSinceLastRequest));
    }
    
    try {
        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
        
        if (response.status === 429) {
            console.warn("⚠️ Pollinations rate limit alcanzado para texto");
            return null;
        }
        
        if (!response.ok) {
            return null;
        }
        
        const text = await response.text();
        pollinationsLastRequest = Date.now();
        return text.trim();
    } catch (e) {
        console.warn(`⚠️ Pollinations texto error: ${e.message}`);
        return null;
    }
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
        const pollResult = await dreamWithPollinations(prompt);
        return pollResult || null;
    }
    try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2`, {
            method: "POST", headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: `[INST] ${prompt} [/INST]`, parameters: { max_new_tokens: 100, return_full_text: false } })
        });
        const data = await resp.json();
        const hfText = (data[0]?.generated_text || "").replace(/"/g, '').trim();
        if (hfText) return hfText;
        
        const pollResult = await dreamWithPollinations(prompt);
        return pollResult || null;
    } catch (e) {
        const pollResult = await dreamWithPollinations(prompt);
        return pollResult || null;
    }
}

// Nivel 3: Gemini
async function dreamWithGemini(prompt) {
    if (!GoogleGenerativeAI || !process.env.GEMINI_API_KEY) return null;
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const res = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt);
        return res.response.text().replace(/"/g, '').trim();
    } catch (e) { return null; }
}

// Nivel 2: Grok (xAI)
async function dreamWithGrok(prompt) {
    if (!process.env.GROK_API_KEY) return null;
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
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content.replace(/"/g, '').trim();
        }
    } catch (e) { console.error("Grok Dream failed:", e.message); }
    return null;
}

// Nivel 1: OpenAI
async function dreamWithOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) return null;
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
            clientTelemetry: state.clientTelemetry // Incluir telemetría para determinar hoja del libro
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

        res.writeHead(200, headers);
        res.end(JSON.stringify({ intro: introText || "Sistemas listos. Iniciando viaje." }));
        return;
    }

    // API: Noticias por país
    if (req.method === 'GET' && apiPath === '/api/news') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const country = url.searchParams.get('country') || '';
        
        try {
            // Simular noticias (en producción se usaría una API real)
            const news = [
                { title: `Actualidad en ${country}`, text: `Noticias recientes sobre ${country}` },
                { title: `Contexto actual de ${country}`, text: `Situación contemporánea en ${country}` }
            ];
            
            res.writeHead(200, headers);
            res.end(JSON.stringify({ news, country }));
        } catch (e) {
            res.writeHead(500, headers);
            res.end(JSON.stringify({ news: [], error: e.message }));
        }
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
        saveState(); // PERSIST
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Travel
    if (apiPath.startsWith('/event/travel/')) {
        state.eventQueue.push({ type: 'travel_to', payload: apiPath.split('/').pop() });
        // Podríamos guardar el país actual en el state si quisiéramos persistencia de ubicación
        // state.clientTelemetry.country = ... (mejor esperar telemetría real)
        saveState();
        res.writeHead(200, headers);
        res.end('{"success":true}');
        return;
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

    // Country Memory: Cargar memoria de un país
    if (req.method === 'GET' && apiPath.startsWith('/api/country-memory/')) {
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
                const { prompt } = JSON.parse(body || '{}');
                if (!prompt) {
                    res.writeHead(400, headers);
                    res.end('{"error":"No prompt provided"}');
                    return;
                }
                
                console.log(`[GenerateNarrative] Iniciando generación con prompt de ${prompt.length} caracteres...`);
                
                // Usar el sistema de IA disponible (prioridad: Grok > OpenAI > Gemini > HF)
                // Con timeout más largo para relatos más extensos
                let narrative = null;
                
                try {
                    narrative = await Promise.race([
                        dreamWithGrok(prompt),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
                    ]);
                } catch (e) {
                    console.warn(`[GenerateNarrative] Grok falló o timeout: ${e.message}`);
                }
                
                if (!narrative || narrative.length < 100) {
                    try {
                        narrative = await Promise.race([
                            dreamWithOpenAI(prompt),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
                        ]);
                    } catch (e) {
                        console.warn(`[GenerateNarrative] OpenAI falló o timeout: ${e.message}`);
                    }
                }
                
                if (!narrative || narrative.length < 100) {
                    try {
                        narrative = await Promise.race([
                            dreamWithGemini(prompt),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
                        ]);
                    } catch (e) {
                        console.warn(`[GenerateNarrative] Gemini falló o timeout: ${e.message}`);
                    }
                }
                
                if (!narrative || narrative.length < 100) {
                    try {
                        narrative = await dreamWithHF(prompt);
                    } catch (e) {
                        console.warn(`[GenerateNarrative] HF falló: ${e.message}`);
                    }
                }
                
                // Fallback mejorado si todo falla
                if (!narrative || narrative.length < 100) {
                    console.warn(`[GenerateNarrative] Usando fallback - todas las IAs fallaron`);
                    narrative = "Estoy observando este lugar. Hay algo que me llama la atención, algo que siento que debo documentar. El tiempo pasa diferente aquí, o tal vez soy yo quien percibe el tiempo de manera distinta. Cada país tiene su propia historia, su propia cultura, su propia forma de ver el mundo. Y aquí, en este momento, estoy siendo testigo de una pequeña parte de esa historia humana que se desarrolla en tiempo real.";
                }
                
                console.log(`[GenerateNarrative] Relato generado: ${narrative.length} caracteres`);
                
                res.writeHead(200, headers);
                res.end(JSON.stringify({ narrative }));
            } catch (e) {
                console.error("Error generating narrative:", e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ error: "Failed to generate narrative", message: e.message }));
            }
        });
        return;
    }

    res.writeHead(404, headers); res.end('{"error":"Not Found"}');
});

server.listen(PORT, () => console.log(`🎮 Server V10 (Intro API) running on ${PORT}`));

