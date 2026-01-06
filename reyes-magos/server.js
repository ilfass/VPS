const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3006;
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Rate limiting para Pollinations
let pollinationsLastRequest = 0;
const POLLINATIONS_MIN_DELAY = 2000;

// Generar imagen con Pollinations (fallback gratuito)
async function generateImagePollinations(prompt) {
    const now = Date.now();
    const timeSinceLastRequest = now - pollinationsLastRequest;
    if (timeSinceLastRequest < POLLINATIONS_MIN_DELAY) {
        await new Promise(resolve => setTimeout(resolve, POLLINATIONS_MIN_DELAY - timeSinceLastRequest));
    }
    
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        const response = await fetch(url);
        
        if (response.status === 429) {
            console.warn("⚠️ Pollinations rate limit alcanzado");
            return null;
        }
        
        if (!response.ok) {
            return null;
        }
        
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const filename = `king_${Date.now()}.jpg`;
        const dir = path.join(__dirname, 'media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        pollinationsLastRequest = Date.now();
        console.log(`✨ Imagen generada: ${filename}`);
        return { filename, url: `/media/${filename}` };
    } catch (e) {
        console.warn(`⚠️ Error Pollinations: ${e.message}`);
        return null;
    }
}

// Generar imagen con OpenAI (si está disponible)
async function generateImageOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) {
        return await generateImagePollinations(prompt);
    }
    try {
        const resp = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024"
            })
        });
        const data = await resp.json();
        if (data.data?.[0]?.url) {
            const buffer = Buffer.from(await (await fetch(data.data[0].url)).blob().arrayBuffer());
            const filename = `king_${Date.now()}.png`;
            const dir = path.join(__dirname, 'media');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, filename), buffer);
            console.log(`✨ Imagen generada (DALL-E): ${filename}`);
            return { filename, url: `/media/${filename}` };
        }
    } catch (e) {
        console.error("Error OpenAI:", e);
    }
    return await generateImagePollinations(prompt);
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const apiPath = parsedUrl.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    // Servir archivos estáticos
    if (req.method === 'GET' && apiPath.startsWith('/media/')) {
        const filePath = path.join(__dirname, apiPath);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif'
            }[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
            return;
        }
        res.writeHead(404);
        res.end();
        return;
    }

    // Endpoint para generar imagen
    if (req.method === 'POST' && apiPath === '/api/generate-king-image') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { kingName, location, context } = JSON.parse(body || '{}');
                if (!kingName) {
                    res.writeHead(400, headers);
                    res.end(JSON.stringify({ error: 'No kingName provided' }));
                    return;
                }

                // Crear prompts más específicos y detallados para cada rey
                let prompt = '';
                if (kingName === 'melchor') {
                    prompt = `A wise old European king with white beard, Melchior, wearing golden royal robes and ornate crown, carrying gold gift, traveling on camel through ${location || 'ancient Middle Eastern landscape'}, following a bright star in the night sky, classical nativity scene style, detailed, beautiful, warm lighting, oil painting style`;
                } else if (kingName === 'gaspar') {
                    prompt = `A middle-aged Asian king, Gaspar, wearing blue royal robes and crown, carrying incense gift, traveling on camel through ${location || 'ancient Middle Eastern landscape'}, following a bright star in the night sky, classical nativity scene style, detailed, beautiful, warm lighting, oil painting style`;
                } else if (kingName === 'baltasar') {
                    prompt = `A young African king, Balthazar, wearing green royal robes and crown, carrying myrrh gift, traveling on camel through ${location || 'ancient Middle Eastern landscape'}, following a bright star in the night sky, classical nativity scene style, detailed, beautiful, warm lighting, oil painting style`;
                } else {
                    prompt = `A majestic ancient wise king, ${kingName}, wearing royal robes and crown, carrying a gift, traveling through ${location || 'ancient lands'}, following a bright star, classical nativity art style, detailed, beautiful, ${context || ''}`;
                }
                
                console.log(`🎨 Generando imagen para ${kingName} con prompt: ${prompt.substring(0, 100)}...`);
                
                const result = await generateImageOpenAI(prompt);
                if (result) {
                    console.log(`✅ Imagen generada exitosamente: ${result.url}`);
                    res.writeHead(200, headers);
                    res.end(JSON.stringify(result));
                } else {
                    console.warn(`⚠️ No se pudo generar imagen para ${kingName}`);
                    res.writeHead(200, headers);
                    res.end(JSON.stringify({ error: "No se pudo generar imagen", url: null }));
                }
            } catch (e) {
                console.error("Error generando imagen:", e);
                res.writeHead(500, headers);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 404 para otras rutas
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🎨 Servidor de imágenes de Reyes Magos en puerto ${PORT}`);
});
