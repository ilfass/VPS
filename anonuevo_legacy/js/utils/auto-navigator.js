import { eventManager } from './event-manager.js?v=2';
import { audioManager } from './audio-manager.js';
import { TvOverlays } from './tv-overlays.js';
import { agendaEngine } from './agenda-engine.js';
import { getModeLabel, markVisited } from './stream-rotation.js';
import { markClip } from './clip-markers.js';

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}

export class AutoNavigator {
    constructor() {
        this.stage = null;
        this.modeName = null;
        this.modeInstance = null;
        this.timer = null;
        this.overlays = new TvOverlays();
    }

    init(stage) {
        this.stage = stage;
        this.overlays.ensure(stage);
    }

    attach(modeName, modeInstance) {
        this.modeName = modeName;
        this.modeInstance = modeInstance;
        markVisited(modeName);
        this.schedule(modeName);
    }

    detach() {
        this.modeName = null;
        this.modeInstance = null;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }

    isBusy() {
        if (!this.modeInstance) return true;
        if (this.modeInstance.isNarrating) return true;
        if (audioManager.isSpeaking) return true;
        if (audioManager.currentAudio) return true;
        if (audioManager.currentUtterance) return true;
        const mediaOverlay = document.getElementById('media-overlay-container');
        if (mediaOverlay) return true;
        return false;
    }

    schedule(currentMode) {
        if (!eventManager.canProceedAuto()) return;
        // Si está activo el Plan 3h, la navegación la controla el plan (no rotación random).
        try {
            if (localStorage.getItem('streaming_plan_active_v1') === '1') return;
        } catch (e) { }
        // Si hay “Show Runner” activo, el cambio de escenas lo decide la rueda.
        try {
            if (localStorage.getItem('show_runner_active_v1') === '1') return;
        } catch (e) { }
        if (!currentMode) return;
        if (this.timer) clearTimeout(this.timer);

        // Bloques de 10–15 min
        const delayMs = rand(10 * 60 * 1000, 15 * 60 * 1000);
        const status = agendaEngine.getStatus(currentMode);
        this.overlays.setTicker(`Agenda: ${status.blockLabel} · Quedan ~${status.remainingMin} min · Próximo: ${status.next} · Comentá: ¿qué querés ver?`);

        this.timer = setTimeout(() => {
            if (!eventManager.canProceedAuto()) return;
            if (this.isBusy()) {
                // Reintentar en 45s
                this.schedule(currentMode);
                return;
            }
            const nextMode = agendaEngine.pickNextMode(currentMode);
            this.overlays.showLowerThird('CAMBIO DE BLOQUE', `${getModeLabel(currentMode)} → ${getModeLabel(nextMode)}`, 12000);
            audioManager.playSfx?.('stinger');
            markClip({ type: 'scene_switch', title: `Cambio: ${getModeLabel(currentMode)} → ${getModeLabel(nextMode)}`, scene: currentMode, next: nextMode });
            window.location.href = `/vivos/${nextMode}/`;
        }, delayMs);
    }
}

export const autoNavigator = new AutoNavigator();

