import { STREAM_ROTATION, getModeLabel } from './stream-rotation.js';

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}

/**
 * Agenda editorial simple:
 * - Define bloques (10–15 min) con secuencias de escenas.
 * - Decide la “próxima escena” de forma determinista (no random puro).
 * - Persiste en localStorage para continuidad aunque cambies de hoja.
 */
export class AgendaEngine {
    constructor() {
        this.stateKey = 'stream_agenda_state_v1';
        this.blocks = [
            { id: 'clima', label: 'Clima', modes: ['clima', 'mapa'], minMin: 10, maxMin: 15 },
            { id: 'tierra', label: 'Planeta', modes: ['mapa', 'terremotos', 'aire', 'incendios', 'sol'], minMin: 10, maxMin: 15 },
            { id: 'rutas', label: 'Rutas', modes: ['aereo', 'mapa'], minMin: 10, maxMin: 15 },
            { id: 'espacio', label: 'Espacio', modes: ['satelites', 'globo'], minMin: 10, maxMin: 15 },
            { id: 'memoria', label: 'Libro vivo', modes: ['diario', 'galeria', 'estadisticas', 'ruta', 'continente'], minMin: 10, maxMin: 15 }
        ];
        this.state = this.load();
    }

    load() {
        try {
            const raw = JSON.parse(localStorage.getItem(this.stateKey) || 'null');
            if (raw && typeof raw === 'object') return raw;
        } catch (e) { }
        return {
            blockIdx: 0,
            blockStart: Date.now(),
            blockDurationMs: rand(10, 15) * 60 * 1000
        };
    }

    save() {
        try {
            localStorage.setItem(this.stateKey, JSON.stringify(this.state));
        } catch (e) { }
    }

    reset() {
        const now = Date.now();
        this.state.blockIdx = 0;
        this.state.blockStart = now;
        const b = this.currentBlock();
        this.state.blockDurationMs = rand(b.minMin, b.maxMin + 1) * 60 * 1000;
        this.save();
    }

    currentBlock() {
        const b = this.blocks[this.state.blockIdx] || this.blocks[0];
        return b;
    }

    rotateIfNeeded() {
        const now = Date.now();
        if (!this.state.blockStart || !this.state.blockDurationMs) {
            this.state.blockStart = now;
            this.state.blockDurationMs = rand(10, 15) * 60 * 1000;
            this.save();
            return;
        }
        if ((now - this.state.blockStart) > this.state.blockDurationMs) {
            this.state.blockIdx = (this.state.blockIdx + 1) % this.blocks.length;
            this.state.blockStart = now;
            const b = this.currentBlock();
            this.state.blockDurationMs = rand(b.minMin, b.maxMin + 1) * 60 * 1000;
            this.save();
        }
    }

    getAgendaLabel() {
        this.rotateIfNeeded();
        return this.currentBlock().label;
    }

    pickNextMode(currentMode) {
        this.rotateIfNeeded();
        const block = this.currentBlock();
        const seq = (block.modes || []).filter(m => STREAM_ROTATION.includes(m));
        if (!seq.length) return STREAM_ROTATION.find(m => m !== currentMode) || 'mapa';

        const idx = seq.indexOf(currentMode);
        if (idx === -1) return seq[0];
        const next = seq[(idx + 1) % seq.length];
        return next === currentMode ? (STREAM_ROTATION.find(m => m !== currentMode) || 'mapa') : next;
    }

    getStatus(currentMode) {
        this.rotateIfNeeded();
        const b = this.currentBlock();
        const now = Date.now();
        const remainingMs = Math.max(0, (this.state.blockStart + this.state.blockDurationMs) - now);
        return {
            blockId: b.id,
            blockLabel: b.label,
            remainingMin: Math.ceil(remainingMs / 60000),
            current: getModeLabel(currentMode),
            next: getModeLabel(this.pickNextMode(currentMode))
        };
    }
}

export const agendaEngine = new AgendaEngine();

