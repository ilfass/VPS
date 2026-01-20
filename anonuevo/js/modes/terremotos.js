import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';

function ensureLeaflet() {
    if (window.L) return Promise.resolve(true);
    return new Promise((resolve) => {
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        if (document.getElementById('leaflet-js')) {
            const t = setInterval(() => {
                if (window.L) { clearInterval(t); resolve(true); }
            }, 100);
            setTimeout(() => { try { clearInterval(t); } catch { } resolve(!!window.L); }, 8000);
            return;
        }
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function magColor(mag) {
    if (mag >= 5) return '#ff004c';
    if (mag >= 4) return '#ff7a00';
    if (mag >= 3) return '#ffd000';
    return '#00ff7a';
}

export default class TerremotosMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;

        this.map = null;
        this.markers = [];
        this.waves = [];
        this.animRaf = 0;
        this.updateInterval = null;

        this.isNarrating = false;
        this.lastRefreshAt = 0;
        this.lastQuakeStats = null;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();

        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'terremotos',
            title: 'TERREMOTOS',
            subtitle: 'USGS • Ondas en vivo',
            accent: '#06b6d4'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('br');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 9000 });

        try { eventManager.reportTelemetry('TERREMOTOS', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Leyendo placas y ondas…');

        this.buildUi();
        await this.runBootBuild();

        const ok = await ensureLeaflet();
        if (ok) this.initMap();

        await this.refreshEarthquakes({ playSfx: true });

        this.updateInterval = setInterval(() => this.refreshEarthquakes({ playSfx: false }), 60_000);

        this.startNarration();
        this.scheduleNextPage();
    }

    buildUi() {
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <div id="eq-map" style="position:absolute; inset:0; background:#07070c; pointer-events:none;"></div>
                <div style="position:absolute; left:18px; bottom:18px; z-index:2; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.28); backdrop-filter: blur(10px);">
                    <div style="font-weight:900; letter-spacing:.08em; font-size:12px; color: rgba(255,255,255,0.75);">ONDAS</div>
                    <div id="eq-headline" style="margin-top:6px; font-weight:900; font-size:18px; color: rgba(255,255,255,0.92); text-wrap: balance;">
                        Preparando…
                    </div>
                </div>
            </div>
        `;
        this.mapHostId = 'eq-map';
        this.headlineEl = this.scene.main.querySelector('#eq-headline');
    }

    async runBootBuild() {
        if (!this.builder) return;
        this.builder.clear();
        this.builder
            .addStep('Conectando USGS', async () => {
                this.scene.setTicker('Conectando a USGS GeoJSON…');
                this.scene.sfx?.tick?.();
            })
            .addStep('Ordenando por magnitud', async () => {
                this.scene.setTicker('Ordenando eventos por magnitud y recencia…');
                this.scene.sfx?.woosh?.();
            })
            .addStep('Inyectando ondas', async () => {
                this.scene.setTicker('Inyectando ondas expansivas (visual)…');
                this.scene.sfx?.reveal?.();
            }, { delayMs: 450 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
    }

    initMap() {
        if (this.map || !window.L) return;
        this.map = L.map(this.mapHostId, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            touchZoom: false,
            tap: false
        }).setView([20, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    async refreshEarthquakes({ playSfx = false } = {}) {
        this.lastRefreshAt = Date.now();
        if (!this.map) return;

        this.scene.setStatus('LIVE');
        this.scene.setTicker('Terremotos: actualizando eventos…');

        try {
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { cache: 'no-store' });
            const data = await response.json();
            const features = Array.isArray(data?.features) ? data.features : [];
            if (!features.length) throw new Error('Sin datos');

            // limpiar layers
            try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
            try { this.waves.forEach(w => this.map.removeLayer(w.circle)); } catch (e) { }
            this.markers = [];
            this.waves = [];

            const sorted = features
                .slice()
                .sort((a, b) => (b?.properties?.mag || 0) - (a?.properties?.mag || 0))
                .slice(0, 50);

            // stats
            const mags = features.map(f => f?.properties?.mag).filter(m => typeof m === 'number');
            const maxMag = mags.length ? Math.max(...mags) : null;
            const recentCount1h = features.filter(f => {
                const t = Number(f?.properties?.time || 0);
                return (Date.now() - t) < 3600_000;
            }).length;
            const top3 = sorted.slice(0, 3).map(f => ({
                mag: Number((f?.properties?.mag || 0).toFixed(1)),
                place: f?.properties?.place || '—',
                time: f?.properties?.time || 0
            }));
            this.lastQuakeStats = {
                count24h: features.length,
                recentCount1h,
                maxMagnitude: (typeof maxMag === 'number') ? Number(maxMag.toFixed(1)) : null,
                top3
            };

            // pintar
            for (let idx = 0; idx < sorted.length; idx++) {
                const f = sorted[idx];
                const coords = f?.geometry?.coordinates;
                if (!Array.isArray(coords) || coords.length < 2) continue;
                const lon = Number(coords[0]);
                const lat = Number(coords[1]);
                const depth = Number(coords[2] || 0);
                const mag = Number(f?.properties?.mag || 0);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

                const color = magColor(mag);
                const radius = Math.max(6, Math.min(20, mag * 4));
                const circle = L.circleMarker([lat, lon], {
                    radius,
                    fillColor: color,
                    color: 'rgba(255,255,255,0.85)',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.map);

                const place = f?.properties?.place || '—';
                // Broadcast-only: sin popups (sin interacción local)
                this.markers.push(circle);

                // ondas
                const waveCount = mag >= 5 ? 3 : (mag >= 4 ? 2 : 1);
                const maxRadius = mag * 200_000;
                for (let i = 0; i < waveCount; i++) {
                    const w = L.circle([lat, lon], {
                        radius: 0,
                        color,
                        fillColor: color,
                        fillOpacity: 0.10,
                        weight: 2,
                        opacity: 0.55
                    }).addTo(this.map);
                    this.waves.push({
                        circle: w,
                        maxRadius,
                        currentRadius: 0,
                        speed: 25_000 + (mag * 5_000),
                        delay: i * 1700,
                        startTime: Date.now() + i * 1700,
                        color
                    });
                }
            }

            // cards + headline
            this.scene.cards.innerHTML = '';
            this.scene.addCard({ k: 'EVENTOS (2.5+)', v: String(this.lastQuakeStats.count24h), tone: 'neutral' });
            this.scene.addCard({ k: 'EN 1 HORA', v: String(this.lastQuakeStats.recentCount1h), tone: this.lastQuakeStats.recentCount1h > 8 ? 'warn' : 'neutral' });
            this.scene.addCard({ k: 'MÁX MAG', v: (this.lastQuakeStats.maxMagnitude != null) ? String(this.lastQuakeStats.maxMagnitude) : '—', tone: (this.lastQuakeStats.maxMagnitude >= 5) ? 'bad' : 'neutral' });

            const top = this.lastQuakeStats.top3?.[0];
            const headline = top ? `Mayor evento: M${top.mag} · ${top.place}` : 'Eventos en vivo';
            if (this.headlineEl) this.headlineEl.textContent = headline;

            this.scene.setTicker(`Terremotos: ${this.lastQuakeStats.count24h} eventos (2.5+) • Máx M${this.lastQuakeStats.maxMagnitude ?? '—'} • Top: ${top?.place || '—'}`);
            if (playSfx) this.scene.sfx?.stinger?.();

            this.startWaveAnimation();
        } catch (e) {
            this.scene.setTicker('Terremotos: error consultando USGS. Reintentando…');
            this.scene.sfx?.alert?.();
        }
    }

    startWaveAnimation() {
        if (this.animRaf) cancelAnimationFrame(this.animRaf);
        const loop = () => {
            const now = Date.now();
            for (const w of this.waves) {
                if (now < w.startTime) continue;
                w.currentRadius += w.speed / 60;
                if (w.currentRadius > w.maxRadius) {
                    w.currentRadius = 0;
                    w.startTime = now + (w.delay || 0);
                }
                const alpha = 0.55 * (1 - (w.currentRadius / w.maxRadius));
                try {
                    w.circle.setRadius(w.currentRadius);
                    w.circle.setStyle({ opacity: alpha, fillOpacity: alpha * 0.15 });
                } catch (e) { }
            }
            this.animRaf = requestAnimationFrame(loop);
        };
        this.animRaf = requestAnimationFrame(loop);
    }

    getRecapContext() {
        return this.lastQuakeStats;
    }

    getCinematicTargets() {
        const targets = [];
        try {
            const sample = (this.markers || []).slice(0, 8);
            sample.forEach(m => {
                const ll = m?.getLatLng?.();
                if (ll) targets.push({ lat: ll.lat, lon: ll.lng, closeZoom: 4, sweepZoom: 3, driftDeg: 4.5 });
            });
        } catch (e) { }
        try {
            const c = this.map?.getCenter?.();
            if (c) targets.push({ lat: c.lat, lon: c.lng, wideZoom: 2, medZoom: 3, driftDeg: 4.0 });
        } catch (e) { }
        return targets;
    }

    startNarration() {
        this.isNarrating = true;
        const s = this.lastQuakeStats;
        const top = s?.top3?.[0];
        const txt = s
            ? `Terremotos en vivo: ${s.count24h} eventos. Máximo M${s.maxMagnitude ?? '—'}. ${top ? `Mayor: ${top.place}.` : ''}`
            : 'Terremotos en vivo: leyendo placas.';
        try { avatarSubtitlesManager.updateSubtitles(txt, 3.8); } catch (e) { }
        setTimeout(() => { this.isNarrating = false; }, 1200);
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('terremotos');
    }

    escapeHtml(str) {
        return String(str || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    unmount() {
        try { if (this.updateInterval) clearInterval(this.updateInterval); } catch (e) { }
        this.updateInterval = null;

        try { if (this.animRaf) cancelAnimationFrame(this.animRaf); } catch (e) { }
        this.animRaf = 0;

        try { if (this.map) this.map.remove(); } catch (e) { }
        this.map = null;

        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }

        this.container.innerHTML = '';
    }
}

