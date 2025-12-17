const http = require('http');
const { exec } = require('child_process');

const SECRET = process.env.WEBHOOK_SECRET || 'tu-secreto-seguro';
const PORT = 9000;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/deploy') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            console.log('Webhook recibido, desplegando...');
            
            exec('cd /app/.. && git pull && docker-compose up -d --build', (err, stdout, stderr) => {
                if (err) {
                    console.error('Error:', stderr);
                    res.writeHead(500);
                    res.end('Error en deploy');
                    return;
                }
                console.log('Deploy exitoso:', stdout);
                res.writeHead(200);
                res.end('Deploy completado');
            });
        });
    } else {
        res.writeHead(200);
        res.end('Webhook server activo');
    }
});

server.listen(PORT, () => {
    console.log(`Webhook server en puerto ${PORT}`);
});

