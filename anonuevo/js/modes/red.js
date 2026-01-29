import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';

export default class RedMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.canvas = null;
        this.ctx = null;
        this.nodes = [];
        this.connections = [];
        this.animationId = null;
        this.time = 0;
    }

    async mount() {
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'red',
            title: 'RED',
            subtitle: 'Conexiones que se forman',
            accent: '#22c55e'
        });
        this.container.appendChild(this.scene.root);

        // NO inicializar avatar si ya existe uno (Studio ya tiene uno)
        if (!document.getElementById('avatar-subtitles-container')) {
          avatarSubtitlesManager.init(this.scene.root);
        }
        // NO mostrar automáticamente, el Studio lo maneja

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Construyendo red de conexiones…');

        // Canvas para red
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
                    Red de Conexiones
                </div>
                <div style="font-size:18px; color: rgba(255,255,255,0.75); text-align:center; max-width:600px;">
                    Cada nodo se conecta con otros, formando una red dinámica de información.
                </div>
            </div>
        `;

        await this.runBuild();
        this.initNodes();
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

    initNodes() {
        const nodeCount = 30;
        this.nodes = [];
        this.connections = [];
        
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: 4 + Math.random() * 4,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Actualizar posiciones de nodos
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            // Rebote en bordes
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;

            node.x = Math.max(0, Math.min(this.canvas.width, node.x));
            node.y = Math.max(0, Math.min(this.canvas.height, node.y));
            node.pulse += 0.05;
        });

        // Dibujar conexiones
        this.ctx.strokeStyle = 'rgba(34,197,94,0.3)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const node1 = this.nodes[i];
                const node2 = this.nodes[j];
                const dx = node1.x - node2.x;
                const dy = node1.y - node2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 150) {
                    const opacity = (1 - dist / 150) * 0.4;
                    this.ctx.beginPath();
                    this.ctx.moveTo(node1.x, node1.y);
                    this.ctx.lineTo(node2.x, node2.y);
                    this.ctx.strokeStyle = `rgba(34,197,94,${opacity})`;
                    this.ctx.stroke();
                }
            }
        }

        // Dibujar nodos
        this.nodes.forEach(node => {
            const pulseRadius = node.radius + Math.sin(node.pulse) * 2;
            
            // Halo exterior
            const gradient = this.ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseRadius * 2);
            gradient.addColorStop(0, 'rgba(34,197,94,0.6)');
            gradient.addColorStop(1, 'rgba(34,197,94,0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, pulseRadius * 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Nodo principal
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(34,197,94,0.9)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Generando nodos', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.addCard({ k: 'NODOS', v: String(this.nodes.length) });
            })
            .addStep('Estableciendo conexiones', async () => {
                await new Promise(r => setTimeout(r, 400));
                this.scene.addCard({ k: 'CONEXIONES', v: 'Dinámicas' });
            })
            .addStep('Red activa', async () => {
                await new Promise(r => setTimeout(r, 300));
                this.scene.sfx?.reveal?.();
            }, { delayMs: 200 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Red formándose: cada conexión es un nuevo vínculo.');
    }

    unmount() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', () => this.resizeCanvas());
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
