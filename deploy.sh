#!/bin/bash
cd /root/VPS
git pull origin main
docker-compose up -d --build




