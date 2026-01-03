const http = require('http');
const url = require('url');

const PORT = 3005;

// Estado Global
let state = {
    autoMode: true,
    eventQueue: []
};

// Headers CORS para permitir control desde el navegador
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // Manejar Preflight CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    // GET /status - Consulta de estado sin consumir eventos (para el panel de control)
    if (req.method === 'GET' && path === '/status') {
        res.writeHead(200, headers);
        const response = {
            autoMode: state.autoMode
        };
        res.end(JSON.stringify(response));
        return;
    }

    // GET /poll - El frontend consulta estado y eventos
    if (req.method === 'GET' && path === '/poll') {
        res.writeHead(200, headers);
        // Devolvemos el estado y vaciamos la cola (consumo único)
        const response = {
            autoMode: state.autoMode,
            events: [...state.eventQueue]
        };
        state.eventQueue = []; // Limpiar cola tras entrega
        res.end(JSON.stringify(response));
        return;
    }

    // POST /event/auto/on
    if (req.method === 'POST' && path === '/event/auto/on') {
        state.autoMode = true;
        state.eventQueue.push({ type: 'auto_on' });
        console.log('CMD: Auto Mode ON');
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok', autoMode: true }));
        return;
    }

    // POST /event/auto/off
    if (req.method === 'POST' && path === '/event/auto/off') {
        state.autoMode = false;
        state.eventQueue.push({ type: 'auto_off' });
        console.log('CMD: Auto Mode OFF');
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok', autoMode: false }));
        return;
    }

    // POST /event/mode/:mode
    if (req.method === 'POST' && path.startsWith('/event/mode/')) {
        const mode = path.split('/').pop(); // NARRATIVE, VISUAL_TRAVEL, LOOP
        state.eventQueue.push({ type: 'mode_change', payload: mode });
        console.log(`CMD: Stream Mode ${mode}`);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok', mode: mode }));
        return;
    }

    // POST /event/scene/:sceneName
    if (req.method === 'POST' && path.startsWith('/event/scene/')) {
        const sceneName = path.split('/').pop();
        state.eventQueue.push({ type: 'scene_change', payload: sceneName });
        console.log(`CMD: Scene Change ${sceneName}`);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok', scene: sceneName }));
        return;
    }

    // POST /event/news
    if (req.method === 'POST' && path === '/event/news') {
        state.eventQueue.push({ type: 'news' });
        console.log('CMD: Trigger News');
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // POST /event/country/:code
    if (req.method === 'POST' && path.startsWith('/event/country/')) {
        const code = path.split('/').pop();
        state.eventQueue.push({ type: 'country', payload: code });
        console.log(`CMD: Trigger Country ${code}`);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok', country: code }));
        return;
    }

    // POST /event/fact
    if (req.method === 'POST' && path === '/event/fact') {
        state.eventQueue.push({ type: 'fact' });
        console.log('CMD: Trigger Fact');
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // 404
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🎮 Control Server running on port ${PORT}`);
});
