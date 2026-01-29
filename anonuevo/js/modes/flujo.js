import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';

export default class FlujoMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.canvas = null;
        this.ctx = null;
        this.streams = [];
        this.animationId = null;
        this.time = 0;
    }

    async mount() {
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'flujo',
            title: 'FLUJO',
            subtitle: 'Líneas de datos en movimiento',
            accent: '#3b82f6'
        });
        this.container.appendChild(this.scene.root);

        // NO inicializar avatar si ya existe uno (Studio ya tiene uno)
        if (!document.getElementById('avatar-subtitles-container')) {
          avatarSubtitlesManager.init(this.scene.root);
        }
        // NO mostrar automáticamente, el Studio lo maneja

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Inicializando flujo de datos…');

        // Canvas para flujo
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
        `;
        this.scene.main.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Contenido principal
        this.scene.main.style.position = 'relative';
        this.scene.main.style.zIndex = '1';
        this.scene.main.innerHTML += `
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:20px; padding:40px;">
                <div style="font-size:48px; font-weight:900; color: rgba(255,255,255,0.95); text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                    Flujo de Información
                </div>
                <div style="font-size:18px; color: rgba(255,255,255,0.75); text-align:center; max-width:600px;">
                    Las líneas fluyen como ríos de datos, conectando puntos de información.
                </div>
            </div>
        `;

        await this.runBuild();
        this.initStreams();
        this.animate();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.scene.main.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    initStreams() {
        this.streams = [];
        const streamCount = 8;
        
        for (let i = 0; i < streamCount; i++) {
            const side = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left
            let startX, startY, endX, endY;
            
            switch(side) {
                case 0: // top
                    startX = Math.random() * this.canvas.width;
                    startY = 0;
                    endX = Math.random() * this.canvas.width;
                    endY = this.canvas.height;
                    break;
                case 1: // right
                    startX = this.canvas.width;
                    startY = Math.random() * this.canvas.height;
                    endX = 0;
                    endY = Math.random() * this.canvas.height;
                    break;
                case 2: // bottom
                    startX = Math.random() * this.canvas.width;
                    startY = this.canvas.height;
                    endX = Math.random() * this.canvas.width;
                    endY = 0;
                    break;
                case 3: // left
                    startX = 0;
                    startY = Math.random() * this.canvas.height;
                    endX = this.canvas.width;
                    endY = Math.random() * this.canvas.height;
                    break;
            }
            
            this.streams.push({
                startX, startY, endX, endY,
                progress: Math.random(),
                speed: 0.003 + Math.random() * 0.005,
                particles: []
            });
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        
        this.ctx.fillStyle = 'rgba(5,5,15,0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.streams.forEach(stream => {
            stream.progress += stream.speed;
            if (stream.progress > 1) {
                stream.progress = 0;
                // Regenerar puntos finales
                const side = Math.floor(Math.random() * 4);
                switch(side) {
                    case 0: stream.endX = Math.random() * this.canvas.width; stream.endY = this.canvas.height; break;
                    case 1: stream.endX = 0; stream.endY = Math.random() * this.canvas.height; break;
                    case 2: stream.endX = Math.random() * this.canvas.width; stream.endY = 0; break;
                    case 3: stream.endX = this.canvas.width; stream.endY = Math.random() * this.canvas.height; break;
                }
            }

            // Calcular posición actual
            const currentX = stream.startX + (stream.endX - stream.startX) * stream.progress;
            const currentY = stream.startY + (stream.endY - stream.startY) * stream.progress;

            // Agregar partículas al flujo
            stream.particles.push({
                x: currentX,
                y: currentY,
                life: 1.0
            });

            // Actualizar y dibujar partículas
            stream.particles = stream.particles.filter(p => {
                p.life -= 0.02;
                return p.life > 0;
            });

            // Dibujar línea principal
            this.ctx.beginPath();
            this.ctx.moveTo(stream.startX, stream.startY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.strokeStyle = `rgba(59,130,246,${0.3 + Math.sin(this.time * 2) * 0.2})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Dibujar partículas
            stream.particles.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(59,130,246,${p.life * 0.8})`;
                this.ctx.fill();
            });

            // Punto de cabeza del flujo
            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
            const gradient = this.ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 15);
            gradient.addColorStop(0, 'rgba(59,130,246,0.9)');
            gradient.addColorStop(1, 'rgba(59,130,246,0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Generando flujos', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'FLUJOS', v: String(this.streams.length) });
            })
            .addStep('Sincronizando partículas', async () => {
                await new Promise(r => setTimeout(r, 400));
                this.scene.addCard({ k: 'VELOCIDAD', v: 'Variable' });
            })
            .addStep('Sistema de flujo activo', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.sfx?.reveal?.();
            }, { delayMs: 200 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Flujos activos: cada línea transporta información.');
    }

    unmount() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', () => this.resizeCanvas());
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
