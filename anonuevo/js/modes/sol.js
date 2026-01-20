import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function fmtTime(d) {
    try { return d.toLocaleTimeString('es-AR', { hour12: false }); } catch { return ''; }
}

export default class SolMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;

        this.canvas = null;
        this.ctx = null;
        this.animRaf = 0;

        this.updateInterval = null;
        this.isNarrating = false;
        this.lastRefreshAt = 0;

        this.solarData = null;
        this.cards = {};
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();

        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'sol',
            title: 'SOL',
            subtitle: 'Actividad solar (estilo broadcast)',
            accent: '#f59e0b'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('bl');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 10000 });

        try { eventManager.reportTelemetry('SOL', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Conectando a la heliosfera…');

        this.buildUi();
        await this.runBootBuild();
        await this.refreshSolarData({ playSfx: true });

        // refresco cada 12 min (simulado / futuro: API real)
        this.updateInterval = setInterval(() => this.refreshSolarData({ playSfx: false }), 12 * 60 * 1000);

        // micro-narración inicial (no bloqueante)
        this.startNarration();

        this.scheduleNextPage();
    }

    buildUi() {
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <canvas id="solar-canvas" style="position:absolute; inset:0; width:100%; height:100%; background: radial-gradient(circle, #14111f 0%, #06060b 60%, #04040a 100%);"></canvas>
                <div style="position:absolute; left:18px; top:18px; z-index:2; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.28); backdrop-filter: blur(10px);">
                    <div style="font-weight:900; letter-spacing:.08em; font-size:12px; color: rgba(255,255,255,0.78);">SEÑAL SOLAR</div>
                    <div id="solar-headline" style="margin-top:6px; font-weight:900; font-size:22px; color: rgba(255,255,255,0.92); text-wrap: balance;">
                        Preparando lectura…
                    </div>
                    <div id="solar-sub" style="margin-top:6px; font-size:12px; color: rgba(255,255,255,0.62);">
                        Pulso, manchas y riesgo tecnológico
                    </div>
                </div>
            </div>
        `;

        this.canvas = this.scene.main.querySelector('#solar-canvas');
        this.ctx = this.canvas?.getContext?.('2d') || null;
        this.headlineEl = this.scene.main.querySelector('#solar-headline');

        const resize = () => {
            if (!this.canvas) return;
            const rect = this.scene.main.getBoundingClientRect();
            this.canvas.width = Math.max(1, Math.floor(rect.width));
            this.canvas.height = Math.max(1, Math.floor(rect.height));
        };
        resize();
        window.addEventListener('resize', resize);
        this._onResize = resize;

        this.startSolarAnimation();
    }

    async runBootBuild() {
        if (!this.builder) return;
        this.builder.clear();
        this.builder
            .addStep('Sincronizando reloj solar', async () => {
                this.scene.setTicker('Sincronizando: tiempo, pulso y escala…');
                this.scene.sfx?.tick?.();
            })
            .addStep('Analizando manchas', async () => {
                this.scene.setTicker('Analizando manchas solares y magnetismo…');
                this.scene.sfx?.woosh?.();
            })
            .addStep('Compilando titular', async () => {
                this.scene.setTicker('Compilando titular “clipable”…');
                this.scene.sfx?.reveal?.();
            }, { delayMs: 500 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
    }

    // Simulado por ahora (se puede cambiar a API real sin tocar UI)
    generateSolarData() {
        const sunspots = Math.floor(Math.random() * 55) + 8;
        const hasFlare = Math.random() > 0.72;
        const flareClass = hasFlare ? ['C', 'M', 'X'][Math.floor(Math.random() * 3)] : null;
        const risk =
            !hasFlare ? 'BAJO'
                : (flareClass === 'X' ? 'ALTO' : (flareClass === 'M' ? 'MEDIO' : 'BAJO'));

        return {
            sunspots,
            hasFlare,
            flareClass,
            risk,
            lastUpdate: new Date()
        };
    }

    async refreshSolarData({ playSfx = false } = {}) {
        this.lastRefreshAt = Date.now();
        this.solarData = this.generateSolarData();

        // Cards
        this.scene.cards.innerHTML = '';
        const s = this.solarData;

        const toneRisk = s.risk === 'ALTO' ? 'bad' : (s.risk === 'MEDIO' ? 'warn' : 'good');
        this.scene.addCard({ k: 'RIESGO', v: s.risk, tone: toneRisk });
        this.scene.addCard({ k: 'MANCHAS', v: String(s.sunspots), tone: 'neutral' });
        this.scene.addCard({ k: 'ERUPCIÓN', v: s.hasFlare ? `CLASE ${s.flareClass}` : 'NO', tone: s.hasFlare ? 'warn' : 'good' });
        this.scene.addCard({ k: 'ACTUALIZACIÓN', v: fmtTime(s.lastUpdate), tone: 'neutral' });

        // Headline + ticker
        const headline = s.hasFlare
            ? `⚠️ Erupción solar Clase ${s.flareClass} • Riesgo ${s.risk}`
            : `✓ Actividad normal • ${s.sunspots} manchas visibles`;
        if (this.headlineEl) this.headlineEl.textContent = headline;

        this.scene.setTicker(`Sol: ${s.sunspots} manchas • Erupción: ${s.hasFlare ? `Clase ${s.flareClass}` : 'no'} • Riesgo: ${s.risk}`);

        if (playSfx) {
            try { (s.hasFlare ? this.scene.sfx?.alert?.() : this.scene.sfx?.tick?.()); } catch (e) { }
        }
    }

    startSolarAnimation() {
        const drawStars = (w, h) => {
            if (!this.ctx) return;
            this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
            for (let i = 0; i < 110; i++) {
                const x = (i * 37) % w;
                const y = (i * 73) % h;
                const r = (i % 9 === 0) ? 1.8 : 1.1;
                this.ctx.beginPath();
                this.ctx.arc(x, y, r, 0, Math.PI * 2);
                this.ctx.fill();
            }
        };

        const loop = () => {
            if (!this.ctx || !this.canvas) return;
            const w = this.canvas.width;
            const h = this.canvas.height;
            const cx = w / 2;
            const cy = h / 2;
            const baseR = Math.min(w, h) * 0.27;
            const t = Date.now() / 1000;

            this.ctx.clearRect(0, 0, w, h);
            drawStars(w, h);

            // Sol
            const pulse = 0.92 + 0.08 * Math.sin(t * 2.1);
            const r = baseR * pulse;

            const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0.0, 'rgba(255, 245, 110, 1)');
            grad.addColorStop(0.35, 'rgba(255, 160, 30, 0.98)');
            grad.addColorStop(0.7, 'rgba(255, 80, 0, 0.92)');
            grad.addColorStop(1.0, 'rgba(160, 30, 0, 0.35)');

            this.ctx.save();
            this.ctx.shadowBlur = 70 * pulse;
            this.ctx.shadowColor = 'rgba(255, 200, 60, 0.9)';
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

            // Manchas (estables por frame usando semilla simple)
            const spots = clamp(this.solarData?.sunspots || 20, 8, 40);
            for (let i = 0; i < Math.min(spots, 28); i++) {
                const ang = (i / spots) * Math.PI * 2 + t * 0.12;
                const dist = baseR * (0.25 + ((i * 17) % 100) / 100 * 0.62);
                const x = cx + Math.cos(ang) * dist;
                const y = cy + Math.sin(ang) * dist;
                const sr = 2.4 + ((i * 13) % 10) * 0.45;
                this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, sr, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // “Flares” visuales
            if (this.solarData?.hasFlare) {
                const k = this.solarData.flareClass === 'X' ? 1.0 : (this.solarData.flareClass === 'M' ? 0.7 : 0.45);
                const spikes = 8;
                for (let i = 0; i < spikes; i++) {
                    const a = (i / spikes) * Math.PI * 2 + t * 0.6;
                    const out = baseR * (1.05 + k * (0.35 + 0.18 * Math.sin(t * 4 + i)));
                    const x1 = cx + Math.cos(a) * (baseR * 0.96);
                    const y1 = cy + Math.sin(a) * (baseR * 0.96);
                    const x2 = cx + Math.cos(a) * out;
                    const y2 = cy + Math.sin(a) * out;
                    this.ctx.strokeStyle = `rgba(255, 70, 0, ${0.35 + 0.25 * k})`;
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                }
            }

            this.animRaf = requestAnimationFrame(loop);
        };

        this.animRaf = requestAnimationFrame(loop);
    }

    getRecapContext() {
        if (!this.solarData) return null;
        return {
            sunspots: this.solarData.sunspots,
            flare: this.solarData.hasFlare ? this.solarData.flareClass : null,
            risk: this.solarData.risk,
            lastUpdate: this.solarData.lastUpdate?.toISOString?.() || null
        };
    }

    async startNarration() {
        // No “bloqueamos” la escena con una narración larga, solo un arranque breve.
        this.isNarrating = true;
        const s = this.solarData;
        const intro = s?.hasFlare
            ? `Estoy mirando el sol: erupción clase ${s.flareClass}. Riesgo ${s.risk}.`
            : `Estoy mirando el sol: actividad normal. Manchas visibles: ${s?.sunspots ?? '—'}.`;
        try { avatarSubtitlesManager.updateSubtitles(intro, 3.0); } catch (e) { }
        setTimeout(() => { this.isNarrating = false; }, 1200);
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('sol');
    }

    unmount() {
        try { if (this.updateInterval) clearInterval(this.updateInterval); } catch (e) { }
        this.updateInterval = null;

        try { if (this.animRaf) cancelAnimationFrame(this.animRaf); } catch (e) { }
        this.animRaf = 0;

        try { window.removeEventListener('resize', this._onResize); } catch (e) { }
        this._onResize = null;

        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }

        this.container.innerHTML = '';
    }
}

