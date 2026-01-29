import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';

export default class OndasMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.canvas = null;
        this.ctx = null;
        this.waves = [];
        this.animationId = null;
        this.time = 0;
    }

    async mount() {
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'ondas',
            title: 'ONDAS',
            subtitle: 'Propagación de señales',
            accent: '#06b6d4'
        });
        this.container.appendChild(this.scene.root);

        // NO inicializar avatar si ya existe uno (Studio ya tiene uno)
        if (!document.getElementById('avatar-subtitles-container')) {
          avatarSubtitlesManager.init(this.scene.root);
        }
        // NO mostrar automáticamente, el Studio lo maneja

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Generando ondas de información…');

        // Canvas para ondas
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
                    Ondas de Datos
                </div>
                <div style="font-size:18px; color: rgba(255,255,255,0.75); text-align:center; max-width:600px;">
                    Cada onda representa la propagación de información a través del tiempo y el espacio.
                </div>
            </div>
        `;

        await this.runBuild();
        this.initWaves();
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

    initWaves() {
        this.waves = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Crear múltiples ondas con diferentes propiedades
        for (let i = 0; i < 5; i++) {
            this.waves.push({
                x: centerX + (Math.random() - 0.5) * 200,
                y: centerY + (Math.random() - 0.5) * 200,
                radius: Math.random() * 50,
                speed: 0.5 + Math.random() * 0.5,
                amplitude: 20 + Math.random() * 30,
                frequency: 0.02 + Math.random() * 0.03,
                color: `rgba(${74 + Math.random() * 50}, ${158 + Math.random() * 50}, ${255}, `
            });
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.time += 0.016; // ~60fps
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.waves.forEach(wave => {
            wave.radius += wave.speed;
            
            // Si la onda es muy grande, reiniciarla
            if (wave.radius > Math.max(this.canvas.width, this.canvas.height) * 1.5) {
                wave.radius = Math.random() * 50;
                wave.x = Math.random() * this.canvas.width;
                wave.y = Math.random() * this.canvas.height;
            }

            // Dibujar múltiples círculos concéntricos para efecto de onda
            for (let i = 0; i < 3; i++) {
                const r = wave.radius - (i * 40);
                if (r < 0) continue;
                
                const opacity = (1 - r / (this.canvas.width * 0.8)) * 0.3;
                const variation = Math.sin(this.time * wave.frequency * 10) * wave.amplitude;
                
                this.ctx.beginPath();
                this.ctx.arc(wave.x, wave.y, r + variation, 0, Math.PI * 2);
                this.ctx.strokeStyle = wave.color + opacity + ')';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Calibrando frecuencias', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'ONDAS', v: '5 activas' });
            })
            .addStep('Sincronizando propagación', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'VELOCIDAD', v: 'Variable' });
            })
            .addStep('Sistema de ondas listo', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.sfx?.reveal?.();
            }, { delayMs: 200 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Ondas propagándose: cada expansión es una señal nueva.');
    }

    unmount() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', () => this.resizeCanvas());
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
