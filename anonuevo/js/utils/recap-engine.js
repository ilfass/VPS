import { eventManager } from './event-manager.js?v=2';
import { audioManager } from './audio-manager.js';
import { TvOverlays } from './tv-overlays.js';
import { getModeLabel, markVisited } from './stream-rotation.js';
import { agendaEngine } from './agenda-engine.js';
import { markClip } from './clip-markers.js';

function randBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}

function safeJson(obj) {
    try { return JSON.stringify(obj); } catch { return '{}'; }
}

function getThemeOfDay() {
    const key = 'stream_theme_of_day';
    const tsKey = 'stream_theme_of_day_ts';
    const now = Date.now();
    const lastTs = Number(localStorage.getItem(tsKey) || '0');
    const current = localStorage.getItem(key);

    // Rotar cada ~30 minutos
    if (current && (now - lastTs) < 30 * 60 * 1000) return current;

    const themes = [
        'Ciudades y ruido humano',
        'Clima y respiración del planeta',
        'Rutas invisibles (aire y mar)',
        'Señales del espacio',
        'Memoria del viaje',
        'Datos que parecen poesía'
    ];
    const next = themes[Math.floor(Math.random() * themes.length)];
    localStorage.setItem(key, next);
    localStorage.setItem(tsKey, String(now));
    return next;
}

export class RecapEngine {
    constructor() {
        this.enabled = true;
        this.minMs = 3 * 60 * 1000;
        this.maxMs = 5 * 60 * 1000;
        this.nextAt = 0;
        this.modeInstance = null;
        this.modeName = null;
        this.stage = null;
        this.overlays = new TvOverlays();
        this.timer = null;
        this.lastRecapAt = 0;
    }

    init() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('recap') === '0') this.enabled = false;
        try {
            const pref = localStorage.getItem('tv_recaps_enabled');
            if (pref === '0') this.enabled = false;
        } catch (e) { }

        // Ticker siempre activo (aunque no haya recap aún)
        this.overlays.ensure(document.getElementById('stage'));
        this.overlays.setTicker(`Tema del día: ${getThemeOfDay()} • ¿Qué escena querés ver después?`);

        this.scheduleNext(true);
        this.timer = setInterval(() => this.tick(), 2000);
    }

    attach(modeInstance, modeName, stage) {
        this.modeInstance = modeInstance;
        this.modeName = modeName;
        this.stage = stage;
        this.overlays.ensure(stage);
        markVisited(modeName);
        this.scheduleNext(true);
    }

    detach() {
        this.modeInstance = null;
        this.modeName = null;
        this.stage = null;
    }

    scheduleNext(reset = false) {
        const now = Date.now();
        // Evitar que se dispare inmediatamente al cargar
        const base = reset ? this.minMs : 0;
        this.nextAt = now + base + randBetween(0, this.maxMs - this.minMs);
    }

    isBusy() {
        if (!this.modeInstance) return true;
        if (this.modeInstance.isNarrating) return true;
        if (audioManager.currentAudio) return true;
        if (audioManager.currentUtterance) return true;
        // Evitar recaps durante overlays “pesados”
        const mediaOverlay = document.getElementById('media-overlay-container');
        if (mediaOverlay) return true;
        return false;
    }

    // Watchdog suave: si un modo deja de actualizar su “pulso” y estamos en Auto, saltar.
    maybeWatchdog(now) {
        if (!this.modeInstance || !this.modeName) return;
        if (!eventManager.canProceedAuto()) return;
        if (this.isBusy()) return;

        const last = this.modeInstance.lastRefreshAt
            || this.modeInstance.lastRefresh
            || this.modeInstance.lastPosition?.timestamp
            || 0;

        if (!last) return;

        // 5 minutos sin pulso = probablemente algo colgado / API muerta
        if ((now - last) > 5 * 60 * 1000) {
            const nextMode = pickNextMode(this.modeName);
            this.overlays.showLowerThird('RECUPERANDO ESCENA', `Sin actualización. Saltando a: ${getModeLabel(nextMode)}`, 8000);
            audioManager.playSfx?.('alert');
            setTimeout(() => {
                try { window.location.href = `/vivos/${nextMode}/`; } catch (e) { }
            }, 1200);
        }
    }

    async tick() {
        if (!this.enabled) return;
        if (!this.modeInstance || !this.modeName) return;

        // Recaps pensados para modo automático
        if (!eventManager.canProceedAuto()) return;

        const now = Date.now();
        this.maybeWatchdog(now);
        if (now < this.nextAt) return;
        if (this.isBusy()) {
            // Reintentar en breve sin “spamear”
            this.nextAt = now + 20_000;
            return;
        }

        await this.runRecap();
        this.lastRecapAt = now;
        this.scheduleNext(false);
    }

    async runRecap() {
        const theme = getThemeOfDay();
        const nextMode = agendaEngine.pickNextMode(this.modeName);

        // Contexto opcional del modo (ranking/datos)
        let recapContext = null;
        try {
            recapContext = this.modeInstance.getRecapContext?.() || null;
        } catch (e) { }

        const prompt = `
Necesito un RECÁP automático para un streaming.

Formato OBLIGATORIO (4 líneas, sin markdown):
1) TITULO (máx 8 palabras, estilo TV)
2) RECAP (2-3 frases, 15-25s en voz, primera persona)
3) DATO SORPRESA (1 frase corta, clipable)
4) PROXIMO (1 frase: menciona la próxima escena: "${getModeLabel(nextMode)}")

Contexto:
- Escena actual: "${getModeLabel(this.modeName)}"
- Tema del día: "${theme}"
- Próxima escena sugerida: "${getModeLabel(nextMode)}"
- Datos del modo (JSON): ${safeJson(recapContext)}

Reglas:
- Sonido humano, reflexivo, observacional. No inventes cifras si no están en el JSON.
- Si hay datos, incluye un mini‑arco: inicio → hallazgo → cierre.
`.trim();

        // Lower third inmediato, antes de hablar
        audioManager.playSfx?.('stinger');
        this.overlays.showLowerThird('RECAP EN VIVO', `${getModeLabel(this.modeName)} → Próximo: ${getModeLabel(nextMode)}`, 12000);
        this.overlays.setTicker(`Tema del día: ${theme} • Próximo: ${getModeLabel(nextMode)} • Comentá: ¿qué querés ver?`);

        let txt = null;
        try {
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            if (res.ok) {
                const data = await res.json();
                txt = data?.narrative || null;
            }
        } catch (e) { }

        const lines = String(txt || '').split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0] || 'RECAP EN VIVO';
        const recap = lines[1] || `Estoy aquí, mirando ${getModeLabel(this.modeName)}.`;
        const surprise = lines[2] || 'Dato sorpresa: a veces lo obvio es lo más raro.';
        const next = lines[3] || `Próximo: ${getModeLabel(nextMode)}.`;

        // Actualizar lower‑third con el título real
        this.overlays.showLowerThird(title, `${getModeLabel(this.modeName)} · Próximo: ${getModeLabel(nextMode)}`, 14000);

        // Hablar (sin bloquear navegación del modo; solo recap)
        await audioManager.speak(`${recap} ${surprise} ${next}`, 'normal', () => { });

        // Marca clip para recortes
        markClip({ type: 'recap', title: title, scene: this.modeName, next: nextMode, note: surprise });
    }

    async forceNow() {
        if (!this.enabled) return;
        if (!this.modeInstance || !this.modeName) return;
        if (this.isBusy()) return;
        await this.runRecap();
        this.lastRecapAt = Date.now();
        this.scheduleNext(false);
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
        if (this.enabled) {
            this.scheduleNext(true);
        }
    }
}

export const recapEngine = new RecapEngine();

