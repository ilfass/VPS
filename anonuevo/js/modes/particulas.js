import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';

export default class ParticulasMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
    }

    async mount() {
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'particulas',
            title: 'PARTÍCULAS',
            subtitle: 'Flujo de datos en movimiento',
            accent: '#a855f7'
        });
        this.container.appendChild(this.scene.root);

        // NO inicializar avatar si ya existe uno (Studio ya tiene uno)
        if (!document.getElementById('avatar-subtitles-container')) {
          avatarSubtitlesManager.init(this.scene.root);
        }
        // NO mostrar automáticamente, el Studio lo maneja

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Inicializando sistema de partículas…');

        // Canvas para partículas (fondo)
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

        // Contenido principal (encima del canvas)
        this.scene.main.style.position = 'relative';
        this.scene.main.style.zIndex = '1';
        this.scene.main.innerHTML += `
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:20px; padding:40px;">
                <div style="font-size:48px; font-weight:900; color: rgba(255,255,255,0.95); text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                    Flujo de Información
                </div>
                <div style="font-size:18px; color: rgba(255,255,255,0.75); text-align:center; max-width:600px;">
                    Cada partícula representa un dato, una conexión, un momento en el tiempo.
                </div>
            </div>
        `;

        await this.runBuild();
        this.initParticles();
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

    initParticles() {
        const count = 150;
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.3,
                color: this.getRandomColor()
            });
        }
    }

    getRandomColor() {
        const colors = [
            'rgba(74,158,255,',   // azul
            'rgba(168,85,247,',   // púrpura
            'rgba(34,197,94,',    // verde
            'rgba(239,68,68,',    // rojo
            'rgba(251,191,36,'     // amarillo
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Actualizar y dibujar partículas
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;

            // Rebote en bordes
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            // Mantener dentro
            p.x = Math.max(0, Math.min(this.canvas.width, p.x));
            p.y = Math.max(0, Math.min(this.canvas.height, p.y));

            // Dibujar partícula
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color + p.opacity + ')';
            this.ctx.fill();

            // Conectar partículas cercanas
            this.particles.slice(i + 1).forEach(p2 => {
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    const opacity = (1 - dist / 120) * 0.2;
                    this.ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            });
        });
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Generando partículas', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'PARTÍCULAS', v: '150' });
            })
            .addStep('Conectando nodos', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'CONEXIONES', v: 'Dinámicas' });
            })
            .addStep('Sistema activo', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.sfx?.reveal?.();
            }, { delayMs: 200 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Red de partículas activa: cada conexión es un dato en movimiento.');
    }

    unmount() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', () => this.resizeCanvas());
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
