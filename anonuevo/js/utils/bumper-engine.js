import { eventManager } from './event-manager.js?v=2';
import { audioManager } from './audio-manager.js';
import { TvOverlays } from './tv-overlays.js';
import { multimediaOrchestrator } from './multimedia-orchestrator.js';
import { markClip } from './clip-markers.js';

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}

export class BumperEngine {
    constructor() {
        this.stage = null;
        this.modeName = null;
        this.modeInstance = null;
        this.timer = null;
        this.overlays = new TvOverlays();
        this.nextAt = 0;
    }

    init(stage) {
        this.stage = stage;
        this.overlays.ensure(stage);
        multimediaOrchestrator.init(stage);
        this.scheduleNext(true);
        setInterval(() => this.tick(), 5000);
    }

    attach(modeName, modeInstance) {
        this.modeName = modeName;
        this.modeInstance = modeInstance;
    }

    detach() {
        this.modeName = null;
        this.modeInstance = null;
    }

    scheduleNext(reset = false) {
        const now = Date.now();
        // bumpers cada 12–18 min
        const delay = reset ? rand(8 * 60 * 1000, 12 * 60 * 1000) : rand(12 * 60 * 1000, 18 * 60 * 1000);
        this.nextAt = now + delay;
    }

    isBusy() {
        if (!this.modeInstance) return true;
        if (this.modeInstance.isNarrating) return true;
        if (audioManager.isSpeaking) return true;
        const mediaOverlay = document.getElementById('media-overlay-container');
        if (mediaOverlay) return true;
        return false;
    }

    async tick() {
        if (!this.stage || !this.modeName) return;
        if (!eventManager.canProceedAuto()) return;
        try {
            const pref = localStorage.getItem('tv_bumpers_enabled');
            if (pref === '0') return;
        } catch (e) { }
        const now = Date.now();
        if (now < this.nextAt) return;
        if (this.isBusy()) {
            this.nextAt = now + 60_000;
            return;
        }
        await this.runBumper();
        this.scheduleNext(false);
    }

    async runBumper() {
        // 10–20 segundos
        const ttlMs = rand(10_000, 20_000);
        let videos = [];
        try {
            const res = await fetch('/control-api/api/media-list');
            if (res.ok) {
                const list = await res.json();
                videos = (list || []).filter(m => m && m.type === 'video');
            }
        } catch (e) { }

        if (!videos.length) return;

        // Priorizar carpeta Global si existe
        const globals = videos.filter(v => String(v.folder || '').toLowerCase().includes('global'));
        const pool = globals.length ? globals : videos;
        const pick = pool[Math.floor(Math.random() * pool.length)];

        this.overlays.showLowerThird('BUMPER', `🎥 ${pick.name || 'Video'} · ${Math.round(ttlMs / 1000)}s`, ttlMs + 3000);
        audioManager.playSfx?.('tick');
        markClip({ type: 'bumper', title: `Bumper: ${pick.name || 'video'}`, scene: this.modeName, url: pick.url });

        multimediaOrchestrator.showMediaOverlay({
            type: 'video',
            url: pick.url,
            context: `🎥 BUMPER • ${pick.name || 'Video'}`,
            ttlMs
        }, 0);
    }

    async forceNow() {
        if (!eventManager.canProceedAuto()) return;
        if (this.isBusy()) return;
        await this.runBumper();
        this.scheduleNext(false);
    }
}

export const bumperEngine = new BumperEngine();

