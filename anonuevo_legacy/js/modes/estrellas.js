import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';

export default class EstrellasMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.canvas = null;
        this.ctx = null;
        this.stars = [];
        this.animationId = null;
        this.time = 0;
    }

    async mount() {
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'estrellas',
            title: 'ESTRELLAS',
            subtitle: 'Galaxia de datos',
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
        this.scene.setTicker('Generando campo de estrellas…');

        // Canvas para estrellas
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
                    Campo Estelar
                </div>
                <div style="font-size:18px; color: rgba(255,255,255,0.75); text-align:center; max-width:600px;">
                    Cada estrella es un punto de datos, brillando en la oscuridad del conocimiento.
                </div>
            </div>
        `;

        await this.runBuild();
        this.initStars();
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

    initStars() {
        const starCount = 200;
        this.stars = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < starCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * Math.min(this.canvas.width, this.canvas.height) * 0.6;
            this.stars.push({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                baseX: centerX + Math.cos(angle) * distance,
                baseY: centerY + Math.sin(angle) * distance,
                radius: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                twinkleSpeed: 0.01 + Math.random() * 0.02,
                twinklePhase: Math.random() * Math.PI * 2,
                orbitRadius: distance,
                orbitAngle: angle,
                orbitSpeed: (Math.random() - 0.5) * 0.001
            });
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        
        this.ctx.fillStyle = 'rgba(5,5,15,0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Actualizar y dibujar estrellas
        this.stars.forEach(star => {
            // Rotación orbital
            star.orbitAngle += star.orbitSpeed;
            star.x = centerX + Math.cos(star.orbitAngle) * star.orbitRadius;
            star.y = centerY + Math.sin(star.orbitAngle) * star.orbitRadius;

            // Twinkle
            star.twinklePhase += star.twinkleSpeed;
            const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
            const brightness = star.brightness * (0.5 + twinkle * 0.5);

            // Dibujar estrella
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255,255,255,${brightness})`;
            this.ctx.fill();

            // Estrellas brillantes tienen halo
            if (brightness > 0.7) {
                const gradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 4);
                gradient.addColorStop(0, `rgba(168,85,247,${brightness * 0.5})`);
                gradient.addColorStop(1, 'rgba(168,85,247,0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Conectar estrellas cercanas (constelaciones)
        this.ctx.strokeStyle = 'rgba(168,85,247,0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.stars.length; i++) {
            for (let j = i + 1; j < this.stars.length; j++) {
                const s1 = this.stars[i];
                const s2 = this.stars[j];
                const dx = s1.x - s2.x;
                const dy = s1.y - s2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 80) {
                    const opacity = (1 - dist / 80) * 0.15;
                    this.ctx.beginPath();
                    this.ctx.moveTo(s1.x, s1.y);
                    this.ctx.lineTo(s2.x, s2.y);
                    this.ctx.strokeStyle = `rgba(168,85,247,${opacity})`;
                    this.ctx.stroke();
                }
            }
        }
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Generando estrellas', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'ESTRELLAS', v: String(this.stars.length) });
            })
            .addStep('Formando constelaciones', async () => {
                await new Promise(r => setTimeout(r, 400));
                this.scene.addCard({ k: 'ORBITAS', v: 'Activas' });
            })
            .addStep('Campo estelar listo', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.sfx?.reveal?.();
            }, { delayMs: 200 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Estrellas brillando: cada punto es un dato en el universo.');
    }

    unmount() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', () => this.resizeCanvas());
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
