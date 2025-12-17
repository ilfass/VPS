#!/bin/bash
# Watcher que detecta el archivo trigger y ejecuta deploy
cd /root/VPS
while true; do
    if [ -f deploy.trigger ]; then
        echo "Deploy trigger detectado..."
        rm deploy.trigger
        git pull origin main
        docker compose down
        docker compose up -d --build
        echo "Deploy completado!"
    fi
    sleep 2
done

