import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';

const SEEDS = [
    { category: "Espacio", text: "Un día en Venus es más largo que un año en Venus." },
    { category: "Tecnología", text: "El primer mouse de computadora estaba hecho de madera." },
    { category: "Biología", text: "Los pulpos tienen tres corazones y sangre azul." },
    { category: "Historia", text: "Cleopatra vivió más cerca del iPhone que de la Gran Pirámide." },
    { category: "Física", text: "Doblar papel 42 veces (en teoría) alcanzaría la Luna." },
    { category: "Naturaleza", text: "Las abejas pueden reconocer rostros humanos." },
    { category: "Geografía", text: "Rusia tiene una superficie mayor que Plutón." }
];

export default class CuriosidadesMode {
    constructor(container) {
        this.container = container;
        this.currentIndex = 0;
        this.intervalId = null;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;
        this.factCount = 0;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();

        // Audio ambiente
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'curiosidades',
            title: 'CURIOSIDADES',
            subtitle: 'Datos breves que se “fabrican” en vivo',
            accent: '#a855f7'
        });
        this.container.appendChild(this.scene.root);

        // Avatar y narrador móvil
        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('br');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 9000 });

        // Telemetría para panel
        try { eventManager.reportTelemetry('CURIOSIDADES', 'GLOBAL', 0); } catch (e) { }

        // Builder de “fabricación”
        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Calibrando la fábrica de curiosidades…');

        // UI principal: tarjeta + barra de reactor
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                <div id="fact-stage" style="width:min(860px,92%);">
                    <div style="display:flex; gap:12px; align-items:center; justify-content:center; margin-bottom:14px;">
                        <div id="fact-chip" style="display:inline-flex; gap:8px; align-items:center; font-weight:900; letter-spacing:0.16em; font-size:12px; padding:8px 12px; border-radius:999px; border:1px solid rgba(168,85,247,0.35); background: rgba(168,85,247,0.10); color: rgba(255,255,255,0.85);">
                            <span style="width:10px; height:10px; border-radius:999px; background: rgba(168,85,247,0.9); box-shadow:0 0 18px rgba(168,85,247,0.6);"></span>
                            <span id="fact-category">CARGANDO</span>
                        </div>
                        <div style="opacity:.6; font-family: 'JetBrains Mono', monospace; font-size:12px;">GEN#<span id="fact-gen">000</span></div>
                    </div>

                    <div id="fact-card" style="
                        padding: 22px 22px;
                        border-radius: 18px;
                        border: 1px solid rgba(255,255,255,0.12);
                        background: rgba(0,0,0,0.35);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 0 40px rgba(0,0,0,0.45);
                        transform: translateY(10px);
                        opacity: 0;
                        transition: transform 300ms ease, opacity 300ms ease;
                    ">
                        <div id="fact-text" style="font-size: 34px; line-height: 1.25; font-weight: 900; color: rgba(255,255,255,0.92); text-wrap: balance;">
                            Preparando datos curiosos…
                        </div>
                        <div id="fact-sub" style="margin-top:10px; font-size: 13px; color: rgba(255,255,255,0.55);">
                            Observá cómo se construye: señales → mezcla → revelación
                        </div>
                    </div>

                    <div id="reactor" style="
                        margin-top: 14px;
                        height: 14px;
                        border-radius: 999px;
                        border: 1px solid rgba(255,255,255,0.10);
                        background: rgba(255,255,255,0.06);
                        overflow:hidden;
                    ">
                        <div id="reactor-bar" style="
                            height: 100%;
                            width: 0%;
                            background: linear-gradient(90deg, rgba(74,158,255,0.75), rgba(168,85,247,0.75));
                            box-shadow: 0 0 18px rgba(168,85,247,0.35);
                            transition: width 380ms ease;
                        "></div>
                    </div>
                </div>
            </div>
        `;

        this.categoryEl = this.scene.main.querySelector('#fact-category');
        this.textEl = this.scene.main.querySelector('#fact-text');
        this.cardEl = this.scene.main.querySelector('#fact-card');
        this.genEl = this.scene.main.querySelector('#fact-gen');
        this.reactorBar = this.scene.main.querySelector('#reactor-bar');

        await this.runBuildOnce();
        await this.showNextFact({ speakIntro: true });

        // Rotación de “mini-escenas” internas
        this.intervalId = setInterval(() => this.showNextFact(), 18000);
    }

    async runBuildOnce() {
        if (!this.builder) return;
        this.builder.clear();

        this.builder
            .addStep('Recolectando señales', async () => {
                this.scene.setTicker('Recolectando señales: ruido, patrones, anomalías…');
                this.bumpReactor(25);
                this.scene.addCard({ k: 'FUENTES', v: '7+ señales' });
            })
            .addStep('Mezclando hallazgos', async () => {
                this.scene.setTicker('Mezclando hallazgos en una frase “clipable”…');
                this.bumpReactor(60);
                this.scene.sfx?.woosh?.();
            })
            .addStep('Sellando formato', async () => {
                this.scene.setTicker('Sellando: categoría + punchline + ritmo');
                this.bumpReactor(100);
                this.scene.sfx?.reveal?.();
            }, { delayMs: 450 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
    }

    bumpReactor(pct) {
        try { this.reactorBar.style.width = `${Math.max(0, Math.min(100, pct))}%`; } catch (e) { }
    }

    async maybeGenerateAiFact() {
        // Cada 3 facts intentamos IA (fallback a seeds si falla)
        if (this.factCount % 3 !== 2) return null;
        try {
            const prompt = [
                'Genera una curiosidad breve y contundente para streaming.',
                'Formato EXACTO:',
                'CATEGORIA: <una palabra>',
                'TEXTO: <una frase de 12 a 18 palabras, en español, sorprendente y clara>',
                'Sin comillas, sin listas, sin explicación adicional.'
            ].join('\\n');

            const r = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'curiosidades',
                    context: { prompt, kind: 'curiosity' }
                })
            });
            if (!r.ok) return null;
            const data = await r.json();
            const txt = (data?.narrative || data?.text || '').toString();
            const cat = (txt.match(/CATEGORIA:\\s*(.+)/i)?.[1] || '').trim();
            const body = (txt.match(/TEXTO:\\s*(.+)/i)?.[1] || '').trim();
            if (!cat || !body) return null;
            return { category: cat.slice(0, 24), text: body.slice(0, 140) };
        } catch (e) {
            return null;
        }
    }

    async showNextFact({ speakIntro = false } = {}) {
        if (!this.cardEl) return;
        this.factCount++;

        // salida
        this.cardEl.style.opacity = '0';
        this.cardEl.style.transform = 'translateY(14px)';
        this.bumpReactor(0);

        // “build” rápido en cada generación
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Generando la próxima curiosidad…');
        try { this.scene.sfx?.tick?.(); } catch (e) { }
        await new Promise(r => setTimeout(r, 420));

        let fact = await this.maybeGenerateAiFact();
        if (!fact) fact = SEEDS[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % SEEDS.length;

        // entrada
        this.categoryEl.textContent = (fact.category || 'Curiosidad').toUpperCase();
        this.textEl.textContent = fact.text || '';
        if (this.genEl) this.genEl.textContent = String(this.factCount).padStart(3, '0');

        this.bumpReactor(100);
        this.scene.setStatus('LIVE');
        this.scene.setTicker(`Clip posible: ${fact.text}`);

        requestAnimationFrame(() => {
            this.cardEl.style.opacity = '1';
            this.cardEl.style.transform = 'translateY(0)';
        });

        if (speakIntro) {
            try {
                avatarSubtitlesManager.updateSubtitles(
                    'Fábrica de curiosidades online. Vamos a generar datos cortos, potentes y con ritmo.',
                    2.7
                );
            } catch (e) { }
        }
    }

    unmount() {
        if (this.intervalId) clearInterval(this.intervalId);
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
