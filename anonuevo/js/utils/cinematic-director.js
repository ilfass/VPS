export class CinematicDirector {
    constructor() {
        this.mode = null;
        this.kind = null; // 'leaflet' | 'cesium' | 'dom'
        this._timer = null;
        this._pollTimer = null;
        this._shotIndex = 0;
        this._lastShotAt = 0;
        this._domHost = null;
        this._domLastTransform = '';
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
        const startedAt = Date.now();
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

            // Fallback DOM: if no map/viewer after a short grace period
            if (Date.now() - startedAt > 2500) {
                clearInterval(this._pollTimer);
                this._pollTimer = null;
                this.kind = 'dom';
                this._startDom();
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
        this._stopDom();
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
        // KEN BURNS REMOVED: Static view or very slow drift only.
        // We will not actively change shots to avoid dizziness.
        // Just ensure we are centered on target once.
    }

    _runCesiumShot() {
        // KEN BURNS REMOVED.
    }

    _runDomShot() {
        // KEN BURNS REMOVED.
        // Static presentation.
        const host = this._domHost;
        if (!host) return;
        host.style.transform = 'none';
    }

    _getDomTargets(stageRect) {
        // Si el modo ofrece targets, usarlos (coords en viewport)
        try {
            if (this.mode && typeof this.mode.getCinematicDomTargets === 'function') {
                const res = this.mode.getCinematicDomTargets();
                if (Array.isArray(res) && res.length) {
                    const pts = res
                        .map((r) => {
                            if (!r) return null;
                            // selector string
                            if (typeof r === 'string') {
                                const el = document.querySelector(r);
                                if (!el) return null;
                                const b = el.getBoundingClientRect();
                                return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
                            }
                            // element
                            if (r instanceof Element) {
                                const b = r.getBoundingClientRect();
                                return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
                            }
                            // explicit point {x,y}
                            if (typeof r.x === 'number' && typeof r.y === 'number') {
                                return { x: r.x, y: r.y };
                            }
                            return null;
                        })
                        .filter(Boolean);
                    if (pts.length) return pts;
                }
            }
        } catch (e) { }

        // Fallback: 6 puntos (tercios) dentro del stage
        const { left, top, width, height } = stageRect;
        const xs = [left + width * 0.25, left + width * 0.5, left + width * 0.75];
        const ys = [top + height * 0.32, top + height * 0.62];
        const pts = [];
        ys.forEach(y => xs.forEach(x => pts.push({ x, y })));
        return pts;
    }
}

export const cinematicDirector = new CinematicDirector();
