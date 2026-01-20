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

export default class IncendiosMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;

        this.map = null;
        this.markers = [];
        this.animRaf = 0;
        this.updateInterval = null;

        this.isNarrating = false;
        this.lastRefreshAt = 0;
        this.lastStats = null;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();

        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'incendios',
            title: 'INCENDIOS',
            subtitle: 'Focos detectados (FIRMS / demo)',
            accent: '#ef4444'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('br');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 9000 });

        try { eventManager.reportTelemetry('INCENDIOS', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Buscando focos en el planeta…');

        this.buildUi();
        await this.runBootBuild();

        const ok = await ensureLeaflet();
        if (ok) this.initMap();

        await this.refreshFires({ playSfx: true });

        // FIRMS suele actualizar cada ~3h; refresco para streaming con un intervalo más largo
        this.updateInterval = setInterval(() => this.refreshFires({ playSfx: false }), 3 * 60 * 60 * 1000);

        this.startNarration();
        this.scheduleNextPage();
    }

    buildUi() {
        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <div id="fires-map" style="position:absolute; inset:0; background:#07070c; pointer-events:none;"></div>
                <div style="position:absolute; left:18px; bottom:18px; z-index:2; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.28); backdrop-filter: blur(10px);">
                    <div style="font-weight:900; letter-spacing:.08em; font-size:12px; color: rgba(255,255,255,0.75);">FOCOS</div>
                    <div id="fires-headline" style="margin-top:6px; font-weight:900; font-size:18px; color: rgba(255,255,255,0.92); text-wrap: balance;">
                        Preparando…
                    </div>
                </div>
            </div>
        `;
        this.mapHostId = 'fires-map';
        this.headlineEl = this.scene.main.querySelector('#fires-headline');
    }

    async runBootBuild() {
        if (!this.builder) return;
        this.builder.clear();
        this.builder
            .addStep('Encendiendo sensores', async () => {
                this.scene.setTicker('Encendiendo sensores: térmico + confianza…');
                this.scene.sfx?.tick?.();
            })
            .addStep('Agregando focos', async () => {
                this.scene.setTicker('Agregando focos sobre mapa oscuro…');
                this.scene.sfx?.woosh?.();
            })
            .addStep('Publicando alerta', async () => {
                this.scene.setTicker('Publicando alerta: conteos y focos principales…');
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

    // Si FIRMS no responde/CORS, generamos una demo consistente para evitar “pantalla vacía”
    generateDemoFires() {
        const seeds = [
            { lat: -8.4, lon: -63.9, brightness: 355, confidence: 'h', label: 'Amazonas' },
            { lat: 38.3, lon: 22.1, brightness: 330, confidence: 'n', label: 'Mediterráneo' },
            { lat: -33.0, lon: 147.0, brightness: 380, confidence: 'h', label: 'Australia' },
            { lat: 55.7, lon: 37.6, brightness: 310, confidence: 'l', label: 'Eurasia' },
            { lat: 34.2, lon: -118.2, brightness: 340, confidence: 'n', label: 'California' }
        ];
        const many = [];
        for (let i = 0; i < 120; i++) {
            const s = seeds[i % seeds.length];
            many.push({
                latitude: s.lat + (Math.random() - 0.5) * 7,
                longitude: s.lon + (Math.random() - 0.5) * 10,
                brightness: s.brightness + (Math.random() - 0.5) * 60,
                confidence: s.confidence,
                label: s.label
            });
        }
        return many;
    }

    parseCsv(text) {
        const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((h, i) => { obj[h] = values[i]?.trim(); });
            return obj;
        });
    }

    async fetchFirms() {
        // Nota: Este endpoint puede fallar por CORS o por requerir token.
        const countries = ['US', 'BR', 'AU', 'CA', 'RU', 'CN', 'IN', 'ID', 'AR', 'CL', 'ES', 'PT', 'GR', 'IT', 'FR'];
        const promises = countries.map(country =>
            fetch(`https://firms.modaps.eosdis.nasa.gov/api/country/csv/${country}/VIIRS_SNPP_NRT/1`)
                .then(r => r.ok ? r.text() : '')
                .then(t => this.parseCsv(t))
                .catch(() => [])
        );
        const all = (await Promise.all(promises)).flat();
        return all.slice(0, 200);
    }

    async refreshFires({ playSfx = false } = {}) {
        this.lastRefreshAt = Date.now();
        if (!this.map) return;

        this.scene.setStatus('LIVE');
        this.scene.setTicker('Incendios: actualizando focos…');

        let fires = [];
        let source = 'firms';
        try {
            fires = await this.fetchFirms();
            if (!Array.isArray(fires) || fires.length < 10) {
                source = 'demo';
                fires = this.generateDemoFires();
            }
        } catch (e) {
            source = 'demo';
            fires = this.generateDemoFires();
        }

        // limpiar markers
        try { this.markers.forEach(m => this.map.removeLayer(m)); } catch (e) { }
        this.markers = [];

        let maxBrightness = null;
        let highConfidence = 0;
        const topBuckets = new Map();

        for (const fire of fires) {
            const lat = Number(fire.latitude);
            const lon = Number(fire.longitude);
            const brightness = Number(fire.brightness) || 0;
            const confidence = String(fire.confidence || 'n').toLowerCase();
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

            if (maxBrightness === null || brightness > maxBrightness) maxBrightness = brightness;
            if (confidence === 'h') highConfidence++;

            const label = fire.label || fire.country || '—';
            topBuckets.set(label, (topBuckets.get(label) || 0) + 1);

            let color = '#ff7a00';
            if (brightness > 400) color = '#ff004c';
            else if (brightness > 350) color = '#ff3300';
            else if (brightness > 300) color = '#ff5500';

            const radius = Math.max(4, Math.min(14, 5 + (brightness / 55)));
            const marker = L.circleMarker([lat, lon], {
                radius,
                fillColor: color,
                color: 'rgba(255,255,255,0.85)',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
            this.markers.push(marker);
        }

        // stats
        const top = [...topBuckets.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, v]) => ({ region: k, count: v }));

        this.lastStats = {
            source,
            fireCount: this.markers.length,
            highConfidence,
            maxBrightness: (typeof maxBrightness === 'number') ? Number(maxBrightness.toFixed(1)) : null,
            topRegions: top
        };

        // cards
        this.scene.cards.innerHTML = '';
        this.scene.addCard({ k: 'FOCOS', v: String(this.lastStats.fireCount), tone: this.lastStats.fireCount > 120 ? 'warn' : 'neutral' });
        this.scene.addCard({ k: 'CONFIANZA ALTA', v: String(highConfidence), tone: highConfidence > 0 ? 'warn' : 'neutral' });
        this.scene.addCard({ k: 'BRILLO MAX', v: this.lastStats.maxBrightness ? `${this.lastStats.maxBrightness} K` : '—', tone: 'neutral' });
        this.scene.addCard({ k: 'FUENTE', v: source.toUpperCase(), tone: source === 'demo' ? 'warn' : 'good' });

        const headline = top[0] ? `Zona más activa: ${top[0].region} (${top[0].count})` : 'Mapa de focos activo';
        if (this.headlineEl) this.headlineEl.textContent = headline;

        this.scene.setTicker(`Incendios: ${this.lastStats.fireCount} focos • Confianza alta: ${highConfidence} • Top: ${(top[0]?.region || '—')}`);
        if (playSfx) this.scene.sfx?.alert?.();

        this.startFirePulse();
    }

    startFirePulse() {
        if (this.animRaf) cancelAnimationFrame(this.animRaf);
        const loop = () => {
            const t = Date.now();
            for (let i = 0; i < this.markers.length; i++) {
                const m = this.markers[i];
                const baseR = m?.options?.radius || 6;
                const pulse = 0.82 + 0.22 * Math.sin((t + i * 160) / 600);
                try { m.setRadius(baseR * pulse); } catch (e) { }
                const op = 0.72 + 0.22 * Math.sin((t + i * 80) / 820);
                try { m.setStyle({ fillOpacity: op }); } catch (e) { }
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
        const s = this.lastStats;
        const txt = s
            ? `Incendios en vivo: ${s.fireCount} focos. Top: ${s.topRegions?.[0]?.region || '—'}.`
            : 'Incendios en vivo: preparando focos.';
        try { avatarSubtitlesManager.updateSubtitles(txt, 3.3); } catch (e) { }
        setTimeout(() => { this.isNarrating = false; }, 1200);
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('incendios');
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

