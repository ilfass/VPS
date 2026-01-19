export class CinematicDirector {
    constructor() {
        this.mode = null;
        this.kind = null; // 'leaflet' | 'cesium' | 'dom'
        this._timer = null;
        this._pollTimer = null;
        this._shotIndex = 0;
        this._lastShotAt = 0;
    }

    attach(mode) {
        this.detach();
        this.mode = mode;

        // Allow disabling per URL for debugging: ?cinema=0
        try {
            const params = new URLSearchParams(window.location.search);
            const cinema = params.get('cinema');
            if (cinema === '0' || cinema === 'false' || cinema === 'off') {
                return;
            }
        } catch (e) { }

        // Poll until map/viewer exists (many mounts are async but not awaited by main.js)
        this._pollTimer = setInterval(() => {
            if (!this.mode) return;

            // Leaflet maps
            if (this.mode.map && typeof this.mode.map.getCenter === 'function' && typeof this.mode.map.flyTo === 'function') {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
                this.kind = 'leaflet';
                this._startLeaflet();
                return;
            }

            // Cesium viewer
            if (this.mode.viewer && this.mode.viewer.camera && typeof this.mode.viewer.camera.flyTo === 'function') {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
                this.kind = 'cesium';
                this._startCesium();
                return;
            }
        }, 250);
    }

    detach() {
        this.kind = null;
        this.mode = null;
        this._shotIndex = 0;
        this._lastShotAt = 0;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    _startLeaflet() {
        this._shotIndex = 0;
        this._scheduleNextLeafletShot(500);
    }

    _scheduleNextLeafletShot(delayMs) {
        if (!this.mode || !this.mode.map) return;
        this._timer = setTimeout(() => {
            try {
                this._runLeafletShot();
            } finally {
                // Next shot after 8–18s (randomized) so it feels “cinematic”
                const base = this.mode?.isNarrating ? 14000 : 9000;
                const jitter = this.mode?.isNarrating ? 8000 : 9000;
                this._scheduleNextLeafletShot(base + Math.random() * jitter);
            }
        }, delayMs);
    }

    _runLeafletShot() {
        const map = this.mode?.map;
        if (!map) return;

        // Targets from mode if provided
        const targets = this._getLeafletTargets();
        const center = map.getCenter();
        const currentZoom = map.getZoom?.() ?? 2;

        const pickTarget = () => {
            if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
            return { lat: center.lat, lon: center.lng };
        };

        const t = pickTarget();

        // Shot types rotate: wide -> medium -> close -> sweep
        const phase = this._shotIndex % 4;
        this._shotIndex++;

        // Establishing zoom based on map zoom range
        const zWide = Math.max(2, Math.min(4, currentZoom - 2));
        const zMed = Math.max(3, Math.min(7, currentZoom));
        const zClose = Math.max(5, Math.min(12, (t.zoom ?? (currentZoom + 2))));

        const duration = this.mode?.isNarrating ? 5.5 : 4.0;
        const ease = true;

        if (phase === 0) {
            map.flyTo([t.lat, t.lon], t.wideZoom ?? zWide, { animate: ease, duration });
            return;
        }
        if (phase === 1) {
            map.flyTo([t.lat, t.lon], t.medZoom ?? zMed, { animate: ease, duration });
            return;
        }
        if (phase === 2) {
            map.flyTo([t.lat, t.lon], t.closeZoom ?? zClose, { animate: ease, duration });
            return;
        }

        // Sweep: move slightly around the target (pseudo “camera angle”)
        const drift = (t.driftDeg ?? 0.8) * (this.mode?.isNarrating ? 0.45 : 1);
        const dLat = (Math.random() - 0.5) * drift;
        const dLon = (Math.random() - 0.5) * drift * 1.3;
        const sweepZoom = t.sweepZoom ?? Math.max(3, Math.min(9, zMed + 1));
        map.flyTo([t.lat + dLat, t.lon + dLon], sweepZoom, { animate: ease, duration: duration + 0.6 });
    }

    _getLeafletTargets() {
        const mode = this.mode;
        try {
            if (mode && typeof mode.getCinematicTargets === 'function') {
                const t = mode.getCinematicTargets();
                if (Array.isArray(t)) return t.filter(Boolean);
            }
        } catch (e) { }
        return [];
    }

    _startCesium() {
        // Cesium (globo) ya tiene su propia coreografía; por defecto solo agregamos micro-movimientos
        this._shotIndex = 0;
        this._scheduleNextCesiumShot(1200);
    }

    _scheduleNextCesiumShot(delayMs) {
        if (!this.mode?.viewer?.camera) return;
        this._timer = setTimeout(() => {
            try {
                this._runCesiumShot();
            } finally {
                const base = this.mode?.isNarrating ? 12000 : 9000;
                const jitter = 9000;
                this._scheduleNextCesiumShot(base + Math.random() * jitter);
            }
        }, delayMs);
    }

    _runCesiumShot() {
        const cam = this.mode?.viewer?.camera;
        const scene = this.mode?.viewer?.scene;
        if (!cam || !scene) return;

        // Very gentle “breathing” to avoid fighting globo.js travel logic.
        // Only apply if globo mode isn't actively flying (heuristic: avoid rapid successive shots).
        const now = Date.now();
        if (now - this._lastShotAt < 7000) return;
        this._lastShotAt = now;

        try {
            const height = cam.positionCartographic?.height ?? null;
            if (!height || !Number.isFinite(height)) return;
            const factor = this.mode?.isNarrating ? 0.03 : 0.06;
            const delta = height * factor * (Math.random() - 0.5);
            cam.zoomIn(delta);
        } catch (e) { }
    }
}

export const cinematicDirector = new CinematicDirector();
