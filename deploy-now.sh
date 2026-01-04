#!/bin/bash
echo "🚀 Iniciando Deploy Remoto a VPS (Hostinger)..."
echo "Conectando a root@147.93.36.212..."

ssh -t root@147.93.36.212 "cd /root/VPS && echo '📥 Actualizando código...' && git pull origin main && echo '🐳 Reiniciando contenedores...' && docker compose up -d --build anonuevo anonuevo-control anonuevo-nginx && echo '✅ LISTO!'"

echo "Prueba entrar a https://habilispro.com/"
