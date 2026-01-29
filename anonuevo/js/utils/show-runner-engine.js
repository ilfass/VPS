import { eventManager } from './event-manager.js?v=2';
import { audioManager } from './audio-manager.js';
import { TvOverlays } from './tv-overlays.js';
import { markClip } from './clip-markers.js';
import { getModeLabel } from './stream-rotation.js';
import { avatarSubtitlesManager } from './avatar-subtitles.js';

const SHOW_ACTIVE_KEY = 'show_runner_active_v1';
const SHOW_STATE_KEY = 'show_runner_state_v1';
const SHOW_MISSION_KEY = 'show_runner_mission_v1';

function safeText(s) {
    return String(s || '').trim().slice(0, 260);
}

function readJson(key, fallback) {
    try {
        const v = JSON.parse(localStorage.getItem(key) || 'null');
        return (v && typeof v === 'object') ? v : fallback;
    } catch (e) { return fallback; }
}

function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
}

export class ShowRunnerEngine {
    constructor() {
        this.stage = null;
        this.overlays = new TvOverlays();
        this.modeName = null;
        this.modeInstance = null;
        this.timer = null;

        // 60' = 5 bloques de 12'
        this.segmentMs = 12 * 60 * 1000;
        this.segments = [
            { id: 'open', label: 'APERTURA', preferred: 'mapa' },
            { id: 'urbano', label: 'URBANO', preferred: 'clima' },
            { id: 'rutas', label: 'RUTAS', preferred: 'aereo' },
            { id: 'espacio', label: 'ESPACIO', preferred: 'satelites' },
            { id: 'memoria', label: 'MEMORIA', preferred: 'diario' }
        ];
    }

    init(stage) {
        this.stage = stage;
        this.overlays.ensure(stage);
        if (!this.timer) this.timer = setInterval(() => this.tick(), 1000);
        // Si venimos navegando entre hojas con el show activo, rehidratar estado.
        this.ensureState();
    }

    attach(modeName, modeInstance) {
        this.modeName = modeName;
        this.modeInstance = modeInstance;
    }

    detach() {
        this.modeName = null;
        this.modeInstance = null;
    }

    isActive() {
        try { return localStorage.getItem(SHOW_ACTIVE_KEY) === '1'; } catch (e) { return false; }
    }

    getMission() {
        try { return safeText(localStorage.getItem(SHOW_MISSION_KEY) || ''); } catch (e) { return ''; }
    }

    setMission(mission) {
        const m = safeText(mission);
        try { localStorage.setItem(SHOW_MISSION_KEY, m); } catch (e) { }
        if (this.isActive()) {
            this.overlays.setTicker(this.buildTicker());
        }
    }

    ensureState() {
        const s = readJson(SHOW_STATE_KEY, null);
        if (s && typeof s.startTs === 'number') return s;
        const fresh = {
            startTs: Date.now(),
            lastSegmentIdx: -1,
            lastRecapSegmentIdx: -1,
            lastBumperSegmentIdx: -1,
            lastNavSegmentIdx: -1,
            lastPulseSegmentIdx: -1
        };
        writeJson(SHOW_STATE_KEY, fresh);
        return fresh;
    }

    start({ mission } = {}) {
        try { localStorage.setItem(SHOW_ACTIVE_KEY, '1'); } catch (e) { }
        if (mission != null) this.setMission(mission);
        const state = this.ensureState();
        state.startTs = Date.now();
        state.lastSegmentIdx = -1;
        state.lastRecapSegmentIdx = -1;
        state.lastBumperSegmentIdx = -1;
        state.lastNavSegmentIdx = -1;
        state.lastPulseSegmentIdx = -1;
        writeJson(SHOW_STATE_KEY, state);

        audioManager.playSfx?.('stinger');
        this.overlays.showLowerThird('SHOW RUNNER 60’', `Misión: ${this.getMission() || '—'}`, 12000);
        this.overlays.setTicker(this.buildTicker());
        this.coldOpen();
    }

    stop() {
        try { localStorage.setItem(SHOW_ACTIVE_KEY, '0'); } catch (e) { }
        try { localStorage.removeItem(SHOW_STATE_KEY); } catch (e) { }
        audioManager.playSfx?.('alert');
        this.overlays.showLowerThird('SHOW RUNNER', 'Detenido', 8000);
        this.overlays.setTicker('Modo manual. El director decide la próxima escena.');
    }

    nextSegment() {
        if (!this.isActive()) return;
        const state = this.ensureState();
        const now = Date.now();
        const elapsed = Math.max(0, now - state.startTs);
        const segIdx = Math.floor(elapsed / this.segmentMs);
        // “Ajustar” startTs para forzar el salto al siguiente bloque
        state.startTs = now - ((segIdx + 1) * this.segmentMs);
        writeJson(SHOW_STATE_KEY, state);
        this.tick(true);
    }

    buildTicker() {
        const mission = this.getMission();
        const title = mission ? `Misión del día: ${mission}` : 'Misión del día: (sin definir)';
        const nowScene = this.modeName ? getModeLabel(this.modeName) : '—';
        return `${title} • En vivo: ${nowScene} • Comentá: ¿qué querés ver?`;
    }

    async coldOpen() {
        if (!this.isActive()) return;
        // No bloquear si está narrando.
        if (this.modeInstance?.isNarrating || audioManager.isSpeaking) return;
        const mission = this.getMission();
        const txt = mission
            ? `Bienvenido. Soy ilfass. Misión del día: ${mission}. Abrimos el mapa y buscamos una señal para seguir el hilo.`
            : `Bienvenido. Soy ilfass. Abrimos el mapa y buscamos una señal para seguir el hilo.`;
        try { await audioManager.speak(txt, 'normal', () => { }, (t) => avatarSubtitlesManager.setSubtitles(t)); } catch (e) { }
        try { markClip({ type: 'show_open', title: 'Apertura (Show Runner)', scene: this.modeName || 'UNKNOWN', note: mission || null }); } catch (e) { }
    }

    pickNextModeForSegment(segIdx) {
        const seg = this.segments[segIdx] || this.segments[0];
        // Preferencia fija por bloque; fallback a “cualquier” /vivos/ actual
        if (seg?.preferred) return seg.preferred;
        return 'mapa';
    }

    pulseOnlyForSegment(segIdx) {
        const seg = this.segments[segIdx] || this.segments[0] || {};
        switch (seg.id) {
            case 'open': return 'all';
            case 'urbano': return 'news,trends,culture';
            case 'rutas': return 'security';
            case 'espacio': return 'scitech';
            case 'memoria': return 'culture,news';
            default: return 'all';
        }
    }

    async triggerPulse(segIdx) {
        // Evitar duplicados si hay más de una pestaña /vivos/ abierta
        const lockKey = 'show_runner_pulse_lock_v1';
        const now = Date.now();
        try {
            const last = Number(localStorage.getItem(lockKey) || '0');
            if (Number.isFinite(last) && (now - last) < 90_000) return;
            localStorage.setItem(lockKey, String(now));
        } catch (e) { }

        const only = this.pulseOnlyForSegment(segIdx);
        try {
            await fetch('/control-api/event/observer/pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang: 'es-419', only, max: 8 })
            });
        } catch (e) { }
    }

    tick(force = false) {
        if (!this.isActive()) return;
        if (!this.stage) return;
        if (!eventManager.canProceedAuto()) {
            // El show runner es “automático”: si el director apagó AutoMode, no ejecutamos cortes.
            return;
        }

        const state = this.ensureState();
        const now = Date.now();
        const elapsed = Math.max(0, now - state.startTs);

        const segIdx = Math.floor(elapsed / this.segmentMs) % this.segments.length;
        const segElapsed = elapsed % this.segmentMs;

        // Inicio de bloque
        if (force || segIdx !== state.lastSegmentIdx) {
            state.lastSegmentIdx = segIdx;
            writeJson(SHOW_STATE_KEY, state);

            const seg = this.segments[segIdx] || {};
            audioManager.playSfx?.('stinger');
            this.overlays.showLowerThird(`BLOQUE: ${seg.label || 'SHOW'}`, `Misión: ${this.getMission() || '—'}`, 10000);
            this.overlays.setTicker(this.buildTicker());
            try {
                markClip({
                    type: 'show_segment',
                    title: `Bloque: ${seg.label || seg.id || segIdx}`,
                    scene: this.modeName || 'UNKNOWN',
                    note: this.getMission() || null
                });
            } catch (e) { }

            // Si el bloque sugiere otra escena, saltar suave (solo si no coincide)
            const preferred = this.pickNextModeForSegment(segIdx);
            if (preferred && this.modeName && preferred !== this.modeName) {
                // Evitar cortar si está “ocupado” (narración/overlay)
                const busy = !!(this.modeInstance?.isNarrating || audioManager.isSpeaking || document.getElementById('media-overlay-container'));
                if (!busy) {
                    setTimeout(() => {
                        try { window.location.href = `/vivos/${preferred}/`; } catch (e) { }
                    }, 900);
                }
            }
        }

        // Recap dentro del bloque (~min 3)
        if (segElapsed > 3 * 60 * 1000 && state.lastRecapSegmentIdx !== segIdx) {
            const busy = !!(this.modeInstance?.isNarrating || audioManager.isSpeaking || document.getElementById('media-overlay-container'));
            if (!busy) {
                state.lastRecapSegmentIdx = segIdx;
                writeJson(SHOW_STATE_KEY, state);
                // Se dispara por evento para reutilizar handler global
                try { eventManager.emit('recap_now'); } catch (e) { }
            }
        }

        // Pulso del mundo dentro del bloque (~min 6) para evitar “silencios”
        if (segElapsed > 6 * 60 * 1000 && state.lastPulseSegmentIdx !== segIdx) {
            const busy = !!(this.modeInstance?.isNarrating || audioManager.isSpeaking || document.getElementById('media-overlay-container'));
            if (!busy) {
                state.lastPulseSegmentIdx = segIdx;
                writeJson(SHOW_STATE_KEY, state);
                this.triggerPulse(segIdx);
            }
        }

        // Bumper antes del cambio (~min 10)
        if (segElapsed > 10 * 60 * 1000 && state.lastBumperSegmentIdx !== segIdx) {
            const busy = !!(this.modeInstance?.isNarrating || audioManager.isSpeaking || document.getElementById('media-overlay-container'));
            if (!busy) {
                state.lastBumperSegmentIdx = segIdx;
                writeJson(SHOW_STATE_KEY, state);
                try { eventManager.emit('bumper_now'); } catch (e) { }
            }
        }

        // Cambio de bloque (~min 11:30)
        if (segElapsed > 11.5 * 60 * 1000 && state.lastNavSegmentIdx !== segIdx) {
            const busy = !!(this.modeInstance?.isNarrating || audioManager.isSpeaking || document.getElementById('media-overlay-container'));
            if (!busy) {
                state.lastNavSegmentIdx = segIdx;
                writeJson(SHOW_STATE_KEY, state);
                const nextSegIdx = (segIdx + 1) % this.segments.length;
                const nextMode = this.pickNextModeForSegment(nextSegIdx);
                this.overlays.showLowerThird('SIGUIENTE', `${getModeLabel(this.modeName || 'mapa')} → ${getModeLabel(nextMode)}`, 9000);
                audioManager.playSfx?.('stinger');
                try { markClip({ type: 'show_switch', title: `Cambio: ${getModeLabel(this.modeName || 'mapa')} → ${getModeLabel(nextMode)}`, scene: this.modeName || 'UNKNOWN', next: nextMode }); } catch (e) { }
                setTimeout(() => {
                    try { window.location.href = `/vivos/${nextMode}/`; } catch (e) { }
                }, 1200);
            }
        }
    }
}

export const showRunnerEngine = new ShowRunnerEngine();

