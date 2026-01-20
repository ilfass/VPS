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

export default class AireMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;

        this.map = null;
        this.markers = [];
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
            modeId: 'aire',
            title: 'AIRE',
            subtitle: 'Calidad del aire (OpenAQ)',
            accent: '#22c55e'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('br');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 9000 });

        try { eventManager.reportTelemetry('AIRE', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Calibrando sensores globales…');

        this.buildUi();
        await this.runBootBuild();

        const ok = await ensureLeaflet();
        if (ok) this.initMap();

        await this.refreshAir({ playSfx: true });
        this.updateInterval = setInterval(() => this.refreshAir({ playSfx: false }), 2 * 60 * 1000);

        // micro-narración inicial
        this.startNarration();
        this.scheduleNextPage();
    }

    buildUi() {
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <div id="air-map" style="position:absolute; inset:0; background:#07070c; pointer-events:none;"></div>
                <div style="position:absolute; left:18px; bottom:18px; z-index:2; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.28); backdrop-filter: blur(10px);">
                    <div style="font-weight:900; letter-spacing:.08em; font-size:12px; color: rgba(255,255,255,0.75);">MAPA AQI</div>
                    <div style="margin-top:4px; font-size:12px; color: rgba(255,255,255,0.62);">
                        Verde=bueno · Amarillo=moderado · Naranja/rojo=insalubre
                    </div>
                </div>
            </div>
        `;
        this.mapHostId = 'air-map';
    }

    async runBootBuild() {
        if (!this.builder) return;
        this.builder.clear();
        this.builder
            .addStep('Conectando fuentes', async () => {
                this.scene.setTicker('Conectando fuentes OpenAQ…');
                this.scene.sfx?.tick?.();
            })
            .addStep('Normalizando partículas', async () => {
                this.scene.setTicker('Normalizando PM2.5/PM10 → AQI…');
                this.scene.sfx?.woosh?.();
            })
            .addStep('Publicando señales', async () => {
                this.scene.setTicker('Publicando señales (puntos en el mapa)…');
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

    pm25ToAQI(pm25) {
        if (pm25 <= 12) return Math.round((50 / 12) * pm25);
        if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12)) * (pm25 - 12) + 51);
        if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.4)) * (pm25 - 35.4) + 101);
        if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.4)) * (pm25 - 55.4) + 151);
        if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.4)) * (pm25 - 150.4) + 201);
        return Math.round(((400 - 301) / (350.4 - 250.4)) * (pm25 - 250.4) + 301);
    }

    pm10ToAQI(pm10) {
        if (pm10 <= 54) return Math.round((50 / 54) * pm10);
        if (pm10 <= 154) return Math.round(((100 - 51) / (154 - 54)) * (pm10 - 54) + 51);
        if (pm10 <= 254) return Math.round(((150 - 101) / (254 - 154)) * (pm10 - 154) + 101);
        if (pm10 <= 354) return Math.round(((200 - 151) / (354 - 254)) * (pm10 - 254) + 151);
        if (pm10 <= 424) return Math.round(((300 - 201) / (424 - 354)) * (pm10 - 354) + 201);
        return Math.round(((400 - 301) / (504 - 424)) * (pm10 - 424) + 301);
    }

    getAQILabel(aqi) {
        if (aqi >= 300) return 'Peligroso';
        if (aqi >= 200) return 'Muy insalubre';
        if (aqi >= 150) return 'Insalubre';
        if (aqi >= 100) return 'Moderado';
        if (aqi >= 50) return 'Aceptable';
        return 'Bueno';
    }

    aqiToColor(aqi) {
        if (aqi >= 300) return '#a855f7';
        if (aqi >= 200) return '#ff004c';
        if (aqi >= 150) return '#ff7a00';
        if (aqi >= 100) return '#ffd000';
        if (aqi >= 50) return '#9dff00';
        return '#00ff7a';
    }

    async refreshAir({ playSfx = false } = {}) {
        this.lastRefreshAt = Date.now();
        if (!this.map) return;

        this.scene.setStatus('LIVE');
        this.scene.setTicker('Actualizando sensores…');

        try {
            // OpenAQ v2
            const countries = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'BR', 'AR', 'MX', 'CL', 'CO', 'PE', 'IN', 'CN', 'JP', 'AU'];
            const promises = countries.map(country =>
                fetch(`https://api.openaq.org/v2/latest?limit=10&page=1&country_id=${country}&order_by=lastUpdated&sort=desc`)
                    .then(r => r.json())
                    .then(data => data.results || [])
                    .catch(() => [])
            );

            const all = (await Promise.all(promises)).flat().slice(0, 100);
            if (!all || all.length < 10) throw new Error('openaq_insufficient');

            // limpiar
            try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
            this.markers = [];

            let good = 0, moderate = 0, unhealthy = 0, total = 0;
            let worst = null; // {aqi, city, country}

            for (const loc of all) {
                const lat = loc?.coordinates?.latitude;
                const lon = loc?.coordinates?.longitude;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

                const city = loc.city || loc.name || '—';
                const country = loc.country || '—';

                // pm25 o pm10
                const m = (loc.measurements || []).find(x => x.parameter === 'pm25') || (loc.measurements || []).find(x => x.parameter === 'pm10');
                if (!m || !Number.isFinite(m.value)) continue;

                const aqi = m.parameter === 'pm25' ? this.pm25ToAQI(m.value) : this.pm10ToAQI(m.value);
                if (!Number.isFinite(aqi)) continue;

                total++;
                if (aqi < 50) good++;
                else if (aqi < 100) moderate++;
                else unhealthy++;

                if (!worst || aqi > worst.aqi) worst = { aqi, city, country };

                const color = this.aqiToColor(aqi);
                const radius = Math.max(6, Math.min(18, 7 + (aqi / 22)));

                const marker = L.circleMarker([lat, lon], {
                    radius,
                    fillColor: color,
                    color: 'rgba(255,255,255,0.85)',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.82
                }).addTo(this.map);

                // Broadcast-only: sin popups (sin interacción local)

                this.markers.push(marker);
            }

            this.lastStats = {
                totalStations: total,
                good,
                moderate,
                unhealthy,
                worst
            };

            // cards
            this.scene.cards.innerHTML = '';
            this.scene.addCard({ k: 'ESTACIONES', v: String(total), tone: 'neutral' });
            this.scene.addCard({ k: 'BUENO', v: String(good), tone: 'good' });
            this.scene.addCard({ k: 'MODERADO', v: String(moderate), tone: 'warn' });
            this.scene.addCard({ k: 'INSALUBRE', v: String(unhealthy), tone: unhealthy > 0 ? 'bad' : 'good' });

            const worstTxt = worst ? `${worst.city} (${worst.country}) AQI ${worst.aqi}` : '—';
            this.scene.setTicker(`Aire: bueno ${good} · moderado ${moderate} · insalubre ${unhealthy} • Peor punto: ${worstTxt}`);
            if (playSfx) this.scene.sfx?.reveal?.();

            // animación ligera (parpadeo sutil)
            this.startMarkerBreath();

            // Clip factory (cooldown)
            this.maybeMarkMoment({
                title: worst ? `PEOR AIRE: AQI ${worst.aqi}` : 'AIRE',
                note: worst ? `${worst.city} (${worst.country})` : null
            });
        } catch (e) {
            this.renderDemoAir(String(e?.message || 'error'));
        }
    }

    maybeMarkMoment({ title, note } = {}) {
        const now = Date.now();
        if ((now - (this._lastMomentAt || 0)) < 90_000) return;
        this._lastMomentAt = now;
        try {
            markClip({
                type: 'moment',
                title: title || 'AIRE',
                scene: 'aire',
                note: note || null,
                url: window.location?.href
            });
        } catch (e) { }
    }

    renderDemoAir(reason = '') {
        if (!this.map) return;
        this.scene.setStatus('LIVE');
        this.scene.sfx?.alert?.();

        try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
        this.markers = [];

        // Demo “zonas” con AQI plausible
        const demo = [
            { city: 'Delhi', country: 'IN', lat: 28.61, lon: 77.20, aqi: 180 },
            { city: 'Beijing', country: 'CN', lat: 39.90, lon: 116.40, aqi: 120 },
            { city: 'Madrid', country: 'ES', lat: 40.41, lon: -3.70, aqi: 62 },
            { city: 'Londres', country: 'GB', lat: 51.50, lon: -0.12, aqi: 48 },
            { city: 'São Paulo', country: 'BR', lat: -23.55, lon: -46.63, aqi: 88 },
            { city: 'Buenos Aires', country: 'AR', lat: -34.60, lon: -58.38, aqi: 55 },
            { city: 'Los Ángeles', country: 'US', lat: 34.05, lon: -118.24, aqi: 105 },
            { city: 'Tokio', country: 'JP', lat: 35.68, lon: 139.69, aqi: 44 }
        ].map(x => ({ ...x, aqi: Math.max(20, Math.min(240, Math.round(x.aqi + (Math.random() - 0.5) * 22))) }));

        let good = 0, moderate = 0, unhealthy = 0;
        let worst = null;

        for (const d of demo) {
            if (d.aqi < 50) good++;
            else if (d.aqi < 100) moderate++;
            else unhealthy++;
            if (!worst || d.aqi > worst.aqi) worst = { aqi: d.aqi, city: d.city, country: d.country };

            const color = this.aqiToColor(d.aqi);
            const radius = Math.max(7, Math.min(18, 7 + (d.aqi / 22)));
            const marker = L.circleMarker([d.lat, d.lon], {
                radius,
                fillColor: color,
                color: 'rgba(255,255,255,0.85)',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.82
            }).addTo(this.map);
            this.markers.push(marker);
        }

        this.lastStats = {
            source: 'demo',
            reason,
            totalStations: demo.length,
            good,
            moderate,
            unhealthy,
            worst
        };

        this.scene.cards.innerHTML = '';
        this.scene.addCard({ k: 'ESTACIONES', v: String(demo.length), tone: 'warn' });
        this.scene.addCard({ k: 'BUENO', v: String(good), tone: 'good' });
        this.scene.addCard({ k: 'MODERADO', v: String(moderate), tone: 'warn' });
        this.scene.addCard({ k: 'INSALUBRE', v: String(unhealthy), tone: unhealthy > 0 ? 'bad' : 'good' });

        this.scene.setTicker(`Aire (DEMO): OpenAQ falló (${reason}). Manteniendo señal con AQI simulado. Peor: ${worst ? `${worst.city} AQI ${worst.aqi}` : '—'}`);
        this.maybeMarkMoment({ title: `AIRE DEMO (${reason})`, note: 'Fallback activo' });
        this.startMarkerBreath();
    }

    startMarkerBreath() {
        if (!this.map || !this.markers?.length) return;
        if (this.animRaf) cancelAnimationFrame(this.animRaf);
        const loop = () => {
            const t = Date.now() / 1000;
            for (let i = 0; i < this.markers.length; i++) {
                const m = this.markers[i];
                const base = m?.options?.fillOpacity ?? 0.8;
                const v = base + 0.08 * Math.sin(t * 1.6 + i * 0.08);
                try { m.setStyle({ fillOpacity: v }); } catch (e) { }
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
            const sample = (this.markers || []).slice(0, 10);
            sample.forEach(m => {
                const ll = m?.getLatLng?.();
                if (ll) targets.push({ lat: ll.lat, lon: ll.lng, closeZoom: 5, sweepZoom: 4, driftDeg: 3.5 });
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
        const s = this.lastStats;
        const txt = s
            ? `Aire en vivo: ${s.totalStations} estaciones. Bueno ${s.good}, moderado ${s.moderate}, insalubre ${s.unhealthy}.`
            : 'Aire en vivo: calibrando estaciones y partículas.';
        try { avatarSubtitlesManager.updateSubtitles(txt, 3.4); } catch (e) { }
        setTimeout(() => { this.isNarrating = false; }, 1200);
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('aire');
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

