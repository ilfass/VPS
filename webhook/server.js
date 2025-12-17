const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');

const PORT = 9000;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/deploy') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            console.log('Webhook recibido, creando señal de deploy...');
            
            // Crear archivo de señal para que el host lo detecte
            fs.writeFileSync('/vps/deploy.trigger', Date.now().toString());
            
            res.writeHead(200);
            res.end('Deploy señalizado');
        });
    } else {
        res.writeHead(200);
        res.end('Webhook server activo');
    }
});

server.listen(PORT, () => {
    console.log(`Webhook server en puerto ${PORT}`);
});

