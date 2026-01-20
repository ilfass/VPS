import { timeEngine } from '../utils/time.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';

export default class ClockMode {
    constructor(container) {
        this.container = container;
        this.unsubscribe = null;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;
        this._pollTimer = null;
        this._beatTimer = null;
        this._beatIdx = 0;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'reloj',
            title: 'RELOJ / INTERLUDIO',
            subtitle: 'Respirar, resetear, y preparar la próxima escena',
            accent: '#4a9eff'
        });
        this.container.appendChild(this.scene.root);

        // Telemetría
        try { eventManager.reportTelemetry('RELOJ', 'GLOBAL', 0); } catch (e) { }

        // Avatar + narrador móvil
        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('bl');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 14000, positions: ['bl', 'br', 'tr', 'tl'] });

        // Layout principal: reloj grande + “cosas formándose”
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                <div style="width:min(980px,92%); display:grid; grid-template-columns: 1.15fr 0.85fr; gap:14px;">
                    <div style="border-radius: 18px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.30); backdrop-filter: blur(10px); padding: 22px 22px;">
                        <div style="font-size: 14px; color: rgba(255,255,255,0.55); font-weight:800; letter-spacing:0.14em;">TIEMPO LOCAL</div>
                        <div id="clock-display" style="margin-top:10px; font-size: 110px; font-weight: 900; letter-spacing: -2px; line-height: 1; text-shadow: 0 0 40px rgba(74,158,255,0.18); font-variant-numeric: tabular-nums;">00:00:00</div>
                        <div id="date-display" style="margin-top:12px; font-size: 18px; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.14em;">Cargando fecha…</div>

                        <div style="margin-top:18px; height: 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); overflow:hidden;">
                            <div id="sec-bar" style="height:100%; width:0%; background: linear-gradient(90deg, rgba(74,158,255,0.75), rgba(168,85,247,0.65)); transition: width 180ms linear;"></div>
                        </div>
                        <div style="margin-top:10px; font-size: 12px; color: rgba(255,255,255,0.55);">
                            Consejo: este interludio es ideal para “respirar” antes de un cambio de escena.
                        </div>
                    </div>

                    <div style="border-radius: 18px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.22); backdrop-filter: blur(10px); padding: 18px 18px; overflow:hidden;">
                        <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.18em; color: rgba(255,255,255,0.62);">SE ESTÁ FORMANDO…</div>
                        <div id="forming" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;"></div>
                    </div>
                </div>
            </div>
        `;

        this.timeEl = this.scene.main.querySelector('#clock-display');
        this.dateEl = this.scene.main.querySelector('#date-display');
        this.secBar = this.scene.main.querySelector('#sec-bar');
        this.formingEl = this.scene.main.querySelector('#forming');

        // Build progresivo
        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        await this.runBuildOnce();

        // Suscribirse al motor de tiempo
        this.unsubscribe = timeEngine.subscribe((now) => this.update(now));

        // Micro-beats internos (varias mini-escenas)
        this._beatTimer = setInterval(() => this.nextBeat(), 16000);
        this.nextBeat(true);

        // Poll suave para traer status del director y mostrar “próximo”
        this._pollTimer = setInterval(() => this.pollStatus(), 6000);
        this.pollStatus();
    }

    update(now) {
        if (!this.timeEl) return;

        // Formato HH:MM:SS
        const timeStr = now.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Formato Fecha Completa
        const dateStr = now.toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.timeEl.textContent = timeStr;
        this.dateEl.textContent = dateStr;

        try {
            const s = now.getSeconds();
            const pct = (s / 60) * 100;
            if (this.secBar) this.secBar.style.width = `${pct}%`;
        } catch (e) { }
    }

    async runBuildOnce() {
        this.builder.clear();
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Preparando interludio, calibrando ritmo…');

        this.builder
            .addStep('Sincronizando reloj', async () => {
                this.scene.addCard({ k: 'MODO', v: 'INTERLUDIO' });
            })
            .addStep('Chequeando señales', async () => {
                this.scene.addCard({ k: 'AUTO', v: 'Dream Mode' });
            })
            .addStep('Listo para cambiar', async () => {
                this.scene.sfx?.reveal?.();
            }, { delayMs: 400 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Interludio activo. Listo para saltar a la próxima escena cuando quieras.');
    }

    nextBeat(isFirst = false) {
        if (!this.formingEl) return;
        const beats = [
            { t: 'Armando la próxima escena', a: 'Se está preparando el siguiente bloque editorial…' },
            { t: 'Chequeo de estabilidad', a: 'Sin pantallas vacías. Sin bloqueos. Continuidad: OK.' },
            { t: 'Momento clipable', a: '“El silencio también es contenido: deja que la imagen respire.”' }
        ];
        const b = beats[this._beatIdx % beats.length];
        this._beatIdx++;

        const row = document.createElement('div');
        row.style.cssText = `
            border:1px solid rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.05);
            border-radius: 14px;
            padding: 10px 10px;
            opacity: 0;
            transform: translateY(8px);
            transition: opacity 220ms ease, transform 220ms ease;
        `;
        row.innerHTML = `
            <div style="font-weight: 900; color: rgba(255,255,255,0.88);">${b.t}</div>
            <div style="margin-top:6px; font-size: 12px; color: rgba(255,255,255,0.60);">${b.a}</div>
        `;
        this.formingEl.prepend(row);
        requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = 'translateY(0)'; });
        while (this.formingEl.children.length > 6) this.formingEl.removeChild(this.formingEl.lastChild);

        if (isFirst) {
            try { avatarSubtitlesManager.updateSubtitles('Interludio. Respiro. En segundos volvemos a acción.', 2.4); } catch (e) { }
        }
    }

    async pollStatus() {
        try {
            const r = await fetch('/control-api/status');
            if (!r.ok) return;
            const data = await r.json();
            const scene = (data?.clientTelemetry?.scene || data?.currentScene || '').toString();
            if (scene) this.scene.setTicker(`Estado: ${scene.toUpperCase()} · Interludio listo para transición.`);
        } catch (e) { }
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
        if (this._pollTimer) clearInterval(this._pollTimer);
        if (this._beatTimer) clearInterval(this._beatTimer);
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}
