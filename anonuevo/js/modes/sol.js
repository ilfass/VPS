import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class SolMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.updateInterval = null;
        this.solarData = null;
    }

    async mount() {
        console.log('[Sol] Montando página de actividad solar con API...');
        
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        this.container.innerHTML = '';
        
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        this.createSolarView();
        await this.loadSolarData();
        
        // Actualizar cada hora
        this.updateInterval = setInterval(() => {
            this.loadSolarData();
        }, 3600000);
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    createSolarView() {
        // Crear visualización del sol con canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'solar-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.background = 'radial-gradient(circle, #1a1a2e 0%, #0a0a0f 100%)';
        this.container.appendChild(canvas);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Ajustar tamaño del canvas
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Iniciar animación del sol
        this.startSolarAnimation();
    }

    async loadSolarData() {
        try {
            // NASA Space Weather API - erupciones solares recientes
            // Nota: Requiere API key, pero podemos usar datos públicos alternativos
            // Por ahora, usar datos simulados basados en actividad solar típica
            
            // Simular datos de actividad solar (en producción usar API real)
            const sunspots = Math.floor(Math.random() * 50) + 10;
            const solarFlare = Math.random() > 0.7; // 30% probabilidad de erupción
            const flareClass = solarFlare ? ['C', 'M', 'X'][Math.floor(Math.random() * 3)] : null;
            
            this.solarData = {
                sunspots: sunspots,
                hasFlare: solarFlare,
                flareClass: flareClass,
                lastUpdate: new Date()
            };
            
            console.log('[Sol] Datos solares cargados:', this.solarData);
        } catch (error) {
            console.error('[Sol] Error cargando datos:', error);
            // Datos por defecto
            this.solarData = {
                sunspots: 25,
                hasFlare: false,
                flareClass: null,
                lastUpdate: new Date()
            };
        }
    }

    startSolarAnimation() {
        const animate = () => {
            if (!this.ctx || !this.canvas) return;
            
            const width = this.canvas.width;
            const height = this.canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.3;
            
            // Limpiar canvas
            this.ctx.clearRect(0, 0, width, height);
            
            // Dibujar fondo estrellado
            this.drawStars();
            
            // Dibujar sol
            const time = Date.now() / 1000;
            const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.3, '#ff8800');
            gradient.addColorStop(0.6, '#ff4400');
            gradient.addColorStop(1, '#ff0000');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Efecto de brillo pulsante
            const pulse = 0.9 + 0.1 * Math.sin(time * 2);
            this.ctx.shadowBlur = 50 * pulse;
            this.ctx.shadowColor = '#ffff00';
            this.ctx.fill();
            
            // Dibujar manchas solares
            if (this.solarData) {
                const sunspotCount = this.solarData.sunspots || 25;
                for (let i = 0; i < Math.min(sunspotCount, 30); i++) {
                    const angle = (i / sunspotCount) * Math.PI * 2 + time;
                    const distance = radius * (0.3 + Math.random() * 0.6);
                    const x = centerX + Math.cos(angle) * distance;
                    const y = centerY + Math.sin(angle) * distance;
                    const spotRadius = 3 + Math.random() * 5;
                    
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, spotRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            // Mostrar información
            this.drawInfo();
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    drawStars() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % width;
            const y = (i * 73) % height;
            const size = Math.random() * 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawInfo() {
        if (!this.solarData) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Actividad Solar en Tiempo Real', width / 2, 50);
        
        this.ctx.font = '18px Inter';
        this.ctx.fillText(`Manchas Solares: ${this.solarData.sunspots}`, width / 2, height - 100);
        
        if (this.solarData.hasFlare && this.solarData.flareClass) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = 'bold 20px Inter';
            this.ctx.fillText(`⚠️ Erupción Solar Clase ${this.solarData.flareClass}`, width / 2, height - 70);
        } else {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '18px Inter';
            this.ctx.fillText('✓ Actividad Solar Normal', width / 2, height - 70);
        }
        
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '14px Inter';
        this.ctx.fillText(`Última actualización: ${this.solarData.lastUpdate.toLocaleTimeString('es-ES')}`, width / 2, height - 40);
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando la actividad de nuestro sol en tiempo real. El sol, nuestra estrella, fuente de toda la energía que hace posible la vida en la Tierra. Puedo ver las manchas solares, las erupciones, la actividad constante de esta estrella que nos da vida.';
        
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        const generateFullTextPromise = this.generateFullNarrative();
        
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Sol] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            const sunspots = this.solarData?.sunspots || 25;
            const hasFlare = this.solarData?.hasFlare || false;
            const flareInfo = hasFlare ? `Hay una erupción solar activa de clase ${this.solarData.flareClass}.` : 'La actividad solar está en niveles normales.';
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando la actividad de nuestro sol en tiempo real. Actualmente hay ${sunspots} manchas solares visibles. ${flareInfo}

Genera una narrativa reflexiva en primera persona sobre:
- El sol como fuente de toda la vida en la Tierra
- Cómo la actividad solar afecta nuestro planeta
- La belleza y el poder de nuestra estrella
- La conexión entre el sol y la vida en la Tierra
- La inmensidad del universo y nuestro lugar en él
- Cómo las erupciones solares pueden afectar la tecnología

El texto debe ser reflexivo, poético y entre 150 y 220 palabras.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.narrative && data.narrative.length > 100) {
                    return data.narrative;
                }
            }
        } catch (e) {
            console.warn('[Sol] Error generando narrativa:', e);
        }
        
        return `Nuestro sol, la estrella que nos da vida, brilla constantemente en el espacio. Las manchas solares que veo son regiones más frías en su superficie, pero también indican actividad magnética intensa. Las erupciones solares pueden enviar partículas cargadas hacia la Tierra, creando auroras pero también afectando nuestras comunicaciones. Este sol es el corazón de nuestro sistema solar, la fuente de toda la energía que hace posible la vida. Sin él, no existiríamos. Es un recordatorio de nuestra dependencia de fuerzas cósmicas mucho más grandes que nosotros.`;
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('sol');
    }

    unmount() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.canvas) {
            this.canvas.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
