import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';
import { markClip } from '../utils/clip-markers.js';

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

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

export default class AereoMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;

        this.map = null;
        this.markers = [];
        this.trails = [];
        this.flightData = new Map();
        this.updateInterval = null;
        this.animRaf = 0;

        this.isNarrating = false;
        this.lastRefreshAt = 0;
        this.lastStats = null;
        this._lastMomentAt = 0;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();

        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'aereo',
            title: 'AÉREO',
            subtitle: 'Tráfico de vuelos (OpenSky)',
            accent: '#a78bfa'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('br');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 9500 });

        try { eventManager.reportTelemetry('AEREO', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Buscando rutas invisibles en el cielo…');

        this.buildUi();
        await this.runBootBuild();

        const ok = await ensureLeaflet();
        if (ok) this.initMap();

        await this.refreshFlights({ playSfx: true });

        // OpenSky sin auth: evitar spamear (30s ok)
        this.updateInterval = setInterval(() => this.refreshFlights({ playSfx: false }), 30_000);

        this.startNarration();
        this.scheduleNextPage();
    }

    buildUi() {
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <div id="flights-map" style="position:absolute; inset:0; background:#07070c; pointer-events:none;"></div>
                <div style="position:absolute; left:18px; bottom:18px; z-index:2; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.28); backdrop-filter: blur(10px);">
                    <div style="font-weight:900; letter-spacing:.08em; font-size:12px; color: rgba(255,255,255,0.75);">TRÁFICO AÉREO</div>
                    <div id="flights-headline" style="margin-top:6px; font-weight:900; font-size:18px; color: rgba(255,255,255,0.92); text-wrap: balance;">
                        Preparando…
                    </div>
                </div>
            </div>
        `;
        this.mapHostId = 'flights-map';
        this.headlineEl = this.scene.main.querySelector('#flights-headline');
    }

    async runBootBuild() {
        if (!this.builder) return;
        this.builder.clear();
        this.builder
            .addStep('Conectando OpenSky', async () => {
                this.scene.setTicker('Conectando a OpenSky (states/all)…');
                this.scene.sfx?.tick?.();
            })
            .addStep('Trazando trayectorias', async () => {
                this.scene.setTicker('Trazando trayectorias (última muestra)…');
                this.scene.sfx?.woosh?.();
            })
            .addStep('Publicando ranking', async () => {
                this.scene.setTicker('Publicando ranking (velocidades/alturas)…');
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

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async refreshFlights({ playSfx = false } = {}) {
        this.lastRefreshAt = Date.now();
        if (!this.map) return;

        this.scene.setStatus('LIVE');
        this.scene.setTicker('Aéreo: actualizando vuelos…');

        try {
            const response = await fetch('https://opensky-network.org/api/states/all', { cache: 'no-store' });
            if (!response.ok) throw new Error(`opensky_http_${response.status}`);
            const data = await response.json();
            const states = Array.isArray(data?.states) ? data.states : [];
            if (!states.length) throw new Error('Sin estados');

            // limpiar
            try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
            try { this.trails.forEach(t => this.map.removeLayer(t)); } catch (e) { }
            this.markers = [];
            this.trails = [];

            const newFlightData = new Map();
            const flights = states.slice(0, 300);

            let count = 0;
            const speeds = [];
            const alts = [];

            for (const state of flights) {
                const [icao24, callsign, originCountry, , , lon, lat, altitude, velocity, heading, verticalRate] = state;
                if (!icao24) continue;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
                count++;

                const vKmh = Number.isFinite(velocity) ? velocity * 3.6 : null;
                const altM = Number.isFinite(altitude) ? altitude : null;
                if (vKmh != null) speeds.push(vKmh);
                if (altM != null) alts.push(altM);

                // color por velocidad/altitud
                let color = '#00ff7a';
                if ((vKmh != null && vKmh > 800) || (altM != null && altM > 10000)) color = '#ff004c';
                else if ((vKmh != null && vKmh > 650) || (altM != null && altM > 8000)) color = '#ff7a00';
                else if ((vKmh != null && vKmh > 450) || (altM != null && altM > 5000)) color = '#ffd000';

                const radius = altM != null ? clamp(4 + (altM / 5000), 3, 8) : 4;
                const marker = L.circleMarker([lat, lon], {
                    radius,
                    fillColor: color,
                    color: 'rgba(255,255,255,0.85)',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.map);

                const prev = this.flightData.get(icao24);
                if (prev && Number.isFinite(prev.lat) && Number.isFinite(prev.lon)) {
                    const dist = this.calculateDistance(prev.lat, prev.lon, lat, lon);
                    if (dist > 0.1) {
                        const trail = L.polyline([[prev.lat, prev.lon], [lat, lon]], {
                            color,
                            weight: 1,
                            opacity: 0.35,
                            dashArray: '3, 3'
                        }).addTo(this.map);
                        this.trails.push(trail);
                    }
                }

                const cs = callsign ? String(callsign).trim() : String(icao24).slice(0, 6);
                const vTxt = (vKmh != null) ? `${Math.round(vKmh)} km/h` : '—';
                const altTxt = (altM != null) ? `${Math.round(altM)} m` : '—';
                const vrTxt = Number.isFinite(verticalRate) ? (verticalRate > 0 ? `↑${Math.round(verticalRate)}` : `↓${Math.abs(Math.round(verticalRate))}`) : '';
                const hdgTxt = Number.isFinite(heading) ? `${Math.round(heading)}°` : '—';
                // Broadcast-only: sin popups (sin interacción local)

                this.markers.push(marker);
                newFlightData.set(icao24, { lat, lon, altitude: altM, velocity: vKmh, heading, timestamp: Date.now() });
            }

            // limpiar datos viejos
            const now = Date.now();
            for (const [k, v] of this.flightData.entries()) {
                if (!v?.timestamp || (now - v.timestamp) > 120_000) this.flightData.delete(k);
            }
            for (const [k, v] of newFlightData.entries()) this.flightData.set(k, v);

            // stats
            speeds.sort((a, b) => b - a);
            alts.sort((a, b) => b - a);
            const topSpeed = speeds[0] != null ? Math.round(speeds[0]) : null;
            const topAlt = alts[0] != null ? Math.round(alts[0]) : null;

            const topSpeeds = speeds.slice(0, 3).map(v => Math.round(v));
            const topAlts = alts.slice(0, 3).map(a => Math.round(a));

            this.lastStats = {
                flightCount: count,
                topSpeedKmh: topSpeed,
                topAltitudeM: topAlt,
                topSpeeds,
                topAltitudes: topAlts
            };

            // cards + headline
            this.scene.cards.innerHTML = '';
            this.scene.addCard({ k: 'VUELOS', v: String(count), tone: count > 220 ? 'warn' : 'neutral' });
            this.scene.addCard({ k: 'TOP VEL', v: topSpeed != null ? `${topSpeed} km/h` : '—', tone: 'neutral' });
            this.scene.addCard({ k: 'TOP ALT', v: topAlt != null ? `${topAlt} m` : '—', tone: 'neutral' });

            const headline = topSpeed != null ? `Rápido: ${topSpeed} km/h • Alto: ${topAlt != null ? `${topAlt} m` : '—'}` : `Vuelos: ${count}`;
            if (this.headlineEl) this.headlineEl.textContent = headline;

            this.scene.setTicker(`Aéreo: ${count} vuelos • Top vel: ${topSpeed ?? '—'} km/h • Top alt: ${topAlt ?? '—'} m`);
            if (playSfx) this.scene.sfx?.reveal?.();

            this.startAnimations();

            // Clip factory (cooldown): “momento” cada ~90s máximo
            this.maybeMarkMoment({
                title: topSpeed != null ? `TOP VEL ${topSpeed} km/h` : `AÉREO ${count} vuelos`,
                note: topAlt != null ? `Top alt: ${topAlt} m` : null
            });
        } catch (e) {
            // Fallback demo (IMPORTANTE: OpenSky responde 429 seguido)
            this.renderDemoFlights(String(e?.message || 'error'));
        }
    }

    maybeMarkMoment({ title, note } = {}) {
        const now = Date.now();
        if ((now - (this._lastMomentAt || 0)) < 90_000) return;
        this._lastMomentAt = now;
        try {
            markClip({
                type: 'moment',
                title: title || 'AÉREO',
                scene: 'aereo',
                note: note || null,
                url: window.location?.href
            });
        } catch (e) { }
    }

    renderDemoFlights(reason = '') {
        this.scene.setStatus('LIVE');
        this.scene.sfx?.alert?.();

        // limpiar layers
        try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
        try { this.trails.forEach(t => this.map.removeLayer(t)); } catch (e) { }
        this.markers = [];
        this.trails = [];

        // Generar vuelos “demo” con corredores típicos
        const hubs = [
            { name: 'EU', lat: 50, lon: 10 },
            { name: 'US', lat: 39, lon: -98 },
            { name: 'SA', lat: -23, lon: -58 },
            { name: 'AS', lat: 30, lon: 110 },
            { name: 'AU', lat: -25, lon: 135 }
        ];

        const demo = [];
        for (let i = 0; i < 140; i++) {
            const h = hubs[i % hubs.length];
            const lat = h.lat + (Math.random() - 0.5) * 18;
            const lon = h.lon + (Math.random() - 0.5) * 26;
            const v = 420 + Math.random() * 520; // km/h
            const alt = 2500 + Math.random() * 10500; // m
            demo.push({ lat, lon, v, alt });
        }

        const speeds = demo.map(d => d.v).sort((a, b) => b - a);
        const alts = demo.map(d => d.alt).sort((a, b) => b - a);
        const topSpeed = Math.round(speeds[0] || 0);
        const topAlt = Math.round(alts[0] || 0);

        for (let i = 0; i < demo.length; i++) {
            const d = demo[i];
            let color = '#00ff7a';
            if (d.v > 800 || d.alt > 10000) color = '#ff004c';
            else if (d.v > 650 || d.alt > 8000) color = '#ff7a00';
            else if (d.v > 450 || d.alt > 5000) color = '#ffd000';

            const radius = clamp(4 + (d.alt / 5000), 3, 8);
            const marker = L.circleMarker([d.lat, d.lon], {
                radius,
                fillColor: color,
                color: 'rgba(255,255,255,0.85)',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
            this.markers.push(marker);
        }

        this.lastStats = {
            source: 'demo',
            reason,
            flightCount: demo.length,
            topSpeedKmh: topSpeed,
            topAltitudeM: topAlt
        };

        this.scene.cards.innerHTML = '';
        this.scene.addCard({ k: 'VUELOS', v: String(demo.length), tone: 'warn' });
        this.scene.addCard({ k: 'TOP VEL', v: `${topSpeed} km/h`, tone: 'neutral' });
        this.scene.addCard({ k: 'TOP ALT', v: `${topAlt} m`, tone: 'neutral' });
        this.scene.addCard({ k: 'FUENTE', v: 'DEMO', tone: 'warn' });

        this.scene.setTicker(`Aéreo (DEMO): OpenSky limitado (${reason}). Simulando ${demo.length} vuelos para no cortar el stream.`);
        this.maybeMarkMoment({ title: `OPEN SKY LIMITADO (${reason})`, note: 'Fallback DEMO activo' });
        this.startAnimations();
    }

    startAnimations() {
        if (this.animRaf) cancelAnimationFrame(this.animRaf);
        const loop = () => {
            const t = Date.now();
            for (let i = 0; i < this.markers.length; i++) {
                const m = this.markers[i];
                const baseR = m?.options?.radius || 4;
                const pulse = 0.85 + 0.15 * Math.sin((t + i * 50) / 800);
                try { m.setRadius(baseR * pulse); } catch (e) { }
            }
            this.animRaf = requestAnimationFrame(loop);
        };
        this.animRaf = requestAnimationFrame(loop);
    }

    getRecapContext() {
        return this.lastStats;
    }

    getCinematicTargets() {
        const targets = [];
        try {
            if (this.flightData && this.flightData.size) {
                let i = 0;
                for (const v of this.flightData.values()) {
                    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lon)) {
                        targets.push({ lat: v.lat, lon: v.lon, closeZoom: 5, sweepZoom: 4, driftDeg: 2.8 });
                        i++;
                        if (i >= 6) break;
                    }
                }
            }
        } catch (e) { }
        try {
            const c = this.map?.getCenter?.();
            if (c) targets.push({ lat: c.lat, lon: c.lng, wideZoom: 2, medZoom: 3, driftDeg: 4.0 });
        } catch (e) { }
        return targets;
    }

    startNarration() {
        this.isNarrating = true;
        const s = this.lastStats;
        const txt = s
            ? `Tráfico aéreo en vivo. ${s.flightCount} vuelos visibles. Top velocidad: ${s.topSpeedKmh ?? '—'} km/h.`
            : 'Tráfico aéreo en vivo: conectando.';
        try { avatarSubtitlesManager.updateSubtitles(txt, 3.4); } catch (e) { }
        setTimeout(() => { this.isNarrating = false; }, 1200);
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('aereo');
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

