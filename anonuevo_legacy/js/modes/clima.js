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

export default class ClimaMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;

        this.map = null;
        this.markers = [];
        this.windLines = [];
        this.animRaf = 0;
        this.updateInterval = null;

        this.weatherData = null;
        this.lastRefreshAt = 0;
        this.isNarrating = false;
        this.lastStats = null;
        this._lastMomentAt = 0;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();

        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'clima',
            title: 'CLIMA',
            subtitle: 'Temperatura · Viento · Ranking',
            accent: '#4a9eff'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('br');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 9500 });

        try { eventManager.reportTelemetry('CLIMA', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Preparando atmósfera global…');

        this.buildUi();
        await this.runBootBuild();

        const ok = await ensureLeaflet();
        if (ok) this.initMap();

        await this.refreshWeather({ playSfx: true });

        // cada 5 min
        this.updateInterval = setInterval(() => this.refreshWeather({ playSfx: false }), 5 * 60 * 1000);

        this.startNarration();
        this.scheduleNextPage();
    }

    buildUi() {
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <div id="wx-map" style="position:absolute; inset:0; background:#07070c; pointer-events:none;"></div>
                <div style="position:absolute; left:18px; bottom:18px; z-index:2; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.28); backdrop-filter: blur(10px);">
                    <div style="font-weight:900; letter-spacing:.08em; font-size:12px; color: rgba(255,255,255,0.75);">RANKING</div>
                    <div id="wx-headline" style="margin-top:6px; font-weight:900; font-size:18px; color: rgba(255,255,255,0.92); text-wrap: balance;">
                        Preparando…
                    </div>
                </div>
            </div>
        `;
        this.mapHostId = 'wx-map';
        this.headlineEl = this.scene.main.querySelector('#wx-headline');
    }

    async runBootBuild() {
        if (!this.builder) return;
        this.builder.clear();
        this.builder
            .addStep('Cargando ciudades', async () => {
                this.scene.setTicker('Cargando ciudades de referencia…');
                this.scene.sfx?.tick?.();
            })
            .addStep('Consultando Open‑Meteo', async () => {
                this.scene.setTicker('Consultando Open‑Meteo (temperatura/viento)…');
                this.scene.sfx?.woosh?.();
            })
            .addStep('Publicando ranking', async () => {
                this.scene.setTicker('Publicando ranking (más caliente / más frío)…');
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

    getWeatherDescription(code) {
        const descriptions = {
            0: '☀️ Despejado',
            1: '🌤️ Mayormente despejado',
            2: '⛅ Parcialmente nublado',
            3: '☁️ Nublado',
            45: '🌫️ Niebla',
            48: '🌫️ Niebla helada',
            51: '🌦️ Llovizna ligera',
            53: '🌦️ Llovizna moderada',
            55: '🌦️ Llovizna densa',
            61: '🌧️ Lluvia ligera',
            63: '🌧️ Lluvia moderada',
            65: '🌧️ Lluvia fuerte',
            71: '❄️ Nieve ligera',
            73: '❄️ Nieve moderada',
            75: '❄️ Nieve fuerte',
            80: '🌦️ Chubascos ligeros',
            81: '🌦️ Chubascos moderados',
            82: '🌦️ Chubascos fuertes',
            85: '❄️ Nevadas ligeras',
            86: '❄️ Nevadas fuertes',
            95: '⛈️ Tormenta',
            96: '⛈️ Tormenta con granizo'
        };
        return descriptions[code] || '🌤️';
    }

    tempColor(temp) {
        if (temp >= 35) return '#ff004c';
        if (temp >= 30) return '#ff7a00';
        if (temp >= 25) return '#ffaa00';
        if (temp >= 20) return '#00ff7a';
        if (temp >= 15) return '#9dff00';
        if (temp >= 10) return '#ffd000';
        if (temp >= 5) return '#00e5ff';
        return '#4a9eff';
    }

    async refreshWeather({ playSfx = false } = {}) {
        this.lastRefreshAt = Date.now();
        if (!this.map) return;

        this.scene.setStatus('LIVE');
        this.scene.setTicker('Clima: actualizando…');

        const cities = [
            { name: 'Buenos Aires', lat: -34.6, lon: -58.4 },
            { name: 'Madrid', lat: 40.4, lon: -3.7 },
            { name: 'Nueva York', lat: 40.7, lon: -74.0 },
            { name: 'Tokio', lat: 35.7, lon: 139.7 },
            { name: 'Sídney', lat: -33.9, lon: 151.2 },
            { name: 'Londres', lat: 51.5, lon: -0.1 },
            { name: 'Moscú', lat: 55.8, lon: 37.6 },
            { name: 'Ciudad del Cabo', lat: -33.9, lon: 18.4 },
            { name: 'Río de Janeiro', lat: -22.9, lon: -43.2 },
            { name: 'México DF', lat: 19.4, lon: -99.1 },
            { name: 'Los Ángeles', lat: 34.1, lon: -118.2 },
            { name: 'Dubái', lat: 25.2, lon: 55.3 },
            { name: 'Singapur', lat: 1.3, lon: 103.8 },
            { name: 'Bangkok', lat: 13.8, lon: 100.5 },
            { name: 'El Cairo', lat: 30.0, lon: 31.2 },
            { name: 'Mumbai', lat: 19.1, lon: 72.9 }
        ];

        try {
            const weatherPromises = cities.map(city =>
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`, { cache: 'no-store' })
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data ? ({ ...city, data }) : null)
                    .catch(() => null)
            );

            this.weatherData = (await Promise.all(weatherPromises)).filter(Boolean);
            if (!this.weatherData || this.weatherData.length < 4) {
                throw new Error('open_meteo_insufficient');
            }

            // limpiar
            try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
            try { this.windLines.forEach(l => this.map.removeLayer(l)); } catch (e) { }
            this.markers = [];
            this.windLines = [];

            // stats
            const temps = [];
            let hottest = null;
            let coldest = null;

            for (const city of this.weatherData) {
                const cur = city.data?.current;
                const temp = Number(cur?.temperature_2m);
                const weatherCode = Number(cur?.weather_code);
                const windSpeed = Number(cur?.wind_speed_10m);
                const windDir = Number(cur?.wind_direction_10m);
                const humidity = Number(cur?.relative_humidity_2m);

                if (!Number.isFinite(temp)) continue;
                temps.push(temp);
                if (!hottest || temp > hottest.temp) hottest = { name: city.name, temp };
                if (!coldest || temp < coldest.temp) coldest = { name: city.name, temp };

                const color = this.tempColor(temp);
                const radius = Math.max(6, Math.min(16, 8 + Math.abs(temp - 20) / 5));
                const marker = L.circleMarker([city.lat, city.lon], {
                    radius,
                    fillColor: color,
                    color: 'rgba(255,255,255,0.85)',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.map);

                // viento
                if (Number.isFinite(windSpeed) && windSpeed > 0 && Number.isFinite(windDir)) {
                    const windLengthM = Math.min(110_000, windSpeed * 3000); // escala visual
                    const rad = (windDir - 90) * Math.PI / 180;
                    const endLat = city.lat + (windLengthM / 111_000) * Math.cos(rad);
                    const endLon = city.lon + (windLengthM / 111_000) * Math.sin(rad);
                    const line = L.polyline([[city.lat, city.lon], [endLat, endLon]], {
                        color: 'rgba(0, 229, 255, 0.75)',
                        weight: clamp(windSpeed / 10, 1, 4),
                        opacity: 0.65,
                        dashArray: '6, 8',
                        dashOffset: '0'
                    }).addTo(this.map);
                    this.windLines.push(line);
                }

                // Broadcast-only: sin popups (sin interacción local)
                this.markers.push(marker);
            }

            const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
            const min = temps.length ? Math.min(...temps) : null;
            const max = temps.length ? Math.max(...temps) : null;
            this.lastStats = {
                cityCount: this.weatherData.length,
                avgTemp: (avg != null) ? Number(avg.toFixed(1)) : null,
                minTemp: (min != null) ? Number(min.toFixed(1)) : null,
                maxTemp: (max != null) ? Number(max.toFixed(1)) : null,
                hottest,
                coldest
            };

            // cards + headline
            this.scene.cards.innerHTML = '';
            this.scene.addCard({ k: 'CIUDADES', v: String(this.lastStats.cityCount), tone: 'neutral' });
            this.scene.addCard({ k: 'PROM', v: (this.lastStats.avgTemp != null) ? `${this.lastStats.avgTemp}°` : '—', tone: 'neutral' });
            this.scene.addCard({ k: 'MÁX', v: (this.lastStats.maxTemp != null) ? `${this.lastStats.maxTemp}°` : '—', tone: (this.lastStats.maxTemp >= 35) ? 'bad' : 'warn' });
            this.scene.addCard({ k: 'MÍN', v: (this.lastStats.minTemp != null) ? `${this.lastStats.minTemp}°` : '—', tone: (this.lastStats.minTemp <= 0) ? 'warn' : 'neutral' });

            const headline = hottest ? `Más caliente: ${hottest.name} (${hottest.temp.toFixed(1)}°C)` : 'Ranking de temperatura';
            if (this.headlineEl) this.headlineEl.textContent = headline;

            const coldTxt = coldest ? `${coldest.name} ${coldest.temp.toFixed(1)}°C` : '—';
            this.scene.setTicker(`Clima: prom ${this.lastStats.avgTemp ?? '—'}° • Hot: ${headline.replace('Más caliente: ', '')} • Cold: ${coldTxt}`);
            if (playSfx) this.scene.sfx?.reveal?.();

            this.startAnimations();

            // Clip factory (cooldown)
            this.maybeMarkMoment({
                title: hottest ? `HOT: ${hottest.name} ${hottest.temp.toFixed(1)}°C` : 'CLIMA',
                note: coldest ? `COLD: ${coldest.name} ${coldest.temp.toFixed(1)}°C` : null
            });
        } catch (e) {
            this.renderDemoWeather(String(e?.message || 'error'));
        }
    }

    maybeMarkMoment({ title, note } = {}) {
        const now = Date.now();
        if ((now - (this._lastMomentAt || 0)) < 90_000) return;
        this._lastMomentAt = now;
        try {
            markClip({
                type: 'moment',
                title: title || 'CLIMA',
                scene: 'clima',
                note: note || null,
                url: window.location?.href
            });
        } catch (e) { }
    }

    renderDemoWeather(reason = '') {
        if (!this.map) return;
        this.scene.setStatus('LIVE');
        this.scene.sfx?.alert?.();

        try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
        try { this.windLines.forEach(l => this.map.removeLayer(l)); } catch (e) { }
        this.markers = [];
        this.windLines = [];

        // Demo de ciudades para no dejar la pantalla vacía
        const demo = [
            { name: 'Buenos Aires', lat: -34.6, lon: -58.4, temp: 26.4, wind: 18, dir: 120, hum: 64, code: 2 },
            { name: 'Madrid', lat: 40.4, lon: -3.7, temp: 14.8, wind: 11, dir: 260, hum: 48, code: 3 },
            { name: 'Tokio', lat: 35.7, lon: 139.7, temp: 9.2, wind: 22, dir: 20, hum: 58, code: 61 },
            { name: 'Londres', lat: 51.5, lon: -0.1, temp: 7.6, wind: 26, dir: 310, hum: 76, code: 45 },
            { name: 'Dubái', lat: 25.2, lon: 55.3, temp: 33.5, wind: 16, dir: 90, hum: 38, code: 0 },
            { name: 'Sídney', lat: -33.9, lon: 151.2, temp: 21.3, wind: 19, dir: 200, hum: 54, code: 1 }
        ].map(x => ({
            ...x,
            temp: Number((x.temp + (Math.random() - 0.5) * 2.2).toFixed(1)),
            wind: Math.max(0, Number((x.wind + (Math.random() - 0.5) * 8).toFixed(1))),
            hum: Math.max(20, Math.min(95, Math.round(x.hum + (Math.random() - 0.5) * 10)))
        }));

        let hottest = null, coldest = null;
        const temps = [];

        for (const city of demo) {
            const temp = city.temp;
            temps.push(temp);
            if (!hottest || temp > hottest.temp) hottest = { name: city.name, temp };
            if (!coldest || temp < coldest.temp) coldest = { name: city.name, temp };

            const color = this.tempColor(temp);
            const radius = Math.max(6, Math.min(16, 8 + Math.abs(temp - 20) / 5));
            const marker = L.circleMarker([city.lat, city.lon], {
                radius,
                fillColor: color,
                color: 'rgba(255,255,255,0.85)',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
            this.markers.push(marker);

            // viento demo
            const windLengthM = Math.min(110_000, city.wind * 3000);
            const rad = (city.dir - 90) * Math.PI / 180;
            const endLat = city.lat + (windLengthM / 111_000) * Math.cos(rad);
            const endLon = city.lon + (windLengthM / 111_000) * Math.sin(rad);
            const line = L.polyline([[city.lat, city.lon], [endLat, endLon]], {
                color: 'rgba(0, 229, 255, 0.75)',
                weight: clamp(city.wind / 10, 1, 4),
                opacity: 0.65,
                dashArray: '6, 8',
                dashOffset: '0'
            }).addTo(this.map);
            this.windLines.push(line);
        }

        const avg = temps.reduce((a, b) => a + b, 0) / Math.max(1, temps.length);
        const min = Math.min(...temps);
        const max = Math.max(...temps);
        this.lastStats = {
            source: 'demo',
            reason,
            cityCount: demo.length,
            avgTemp: Number(avg.toFixed(1)),
            minTemp: Number(min.toFixed(1)),
            maxTemp: Number(max.toFixed(1)),
            hottest,
            coldest
        };

        this.scene.cards.innerHTML = '';
        this.scene.addCard({ k: 'CIUDADES', v: String(this.lastStats.cityCount), tone: 'warn' });
        this.scene.addCard({ k: 'PROM', v: `${this.lastStats.avgTemp}°`, tone: 'neutral' });
        this.scene.addCard({ k: 'MÁX', v: `${this.lastStats.maxTemp}°`, tone: 'warn' });
        this.scene.addCard({ k: 'MÍN', v: `${this.lastStats.minTemp}°`, tone: 'warn' });

        const headline = hottest ? `DEMO · Hot: ${hottest.name} (${hottest.temp.toFixed(1)}°C)` : 'DEMO · Ranking';
        if (this.headlineEl) this.headlineEl.textContent = headline;
        this.scene.setTicker(`Clima (DEMO): Open‑Meteo falló (${reason}). Manteniendo señal con datos simulados.`);
        this.maybeMarkMoment({ title: `CLIMA DEMO (${reason})`, note: 'Fallback activo' });
        this.startAnimations();
    }

    startAnimations() {
        if (this.animRaf) cancelAnimationFrame(this.animRaf);
        const loop = () => {
            const t = Date.now();
            for (let i = 0; i < this.markers.length; i++) {
                const m = this.markers[i];
                const baseR = m?.options?.radius || 8;
                const pulse = 0.88 + 0.12 * Math.sin((t + i * 90) / 900);
                try { m.setRadius(baseR * pulse); } catch (e) { }
            }
            for (let i = 0; i < this.windLines.length; i++) {
                const l = this.windLines[i];
                const off = -((t / 60) % 60);
                try { l.setStyle({ dashOffset: String(off) }); } catch (e) { }
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
        const txt = s?.hottest && s?.coldest
            ? `Clima en vivo. Más caliente: ${s.hottest.name}. Más frío: ${s.coldest.name}.`
            : 'Clima en vivo: preparando atmósfera.';
        try { avatarSubtitlesManager.updateSubtitles(txt, 3.4); } catch (e) { }
        setTimeout(() => { this.isNarrating = false; }, 1200);
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('clima');
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

