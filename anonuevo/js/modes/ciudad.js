import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

const CITY_CONFIG = {
    london: {
        name: 'Londres',
        center: [51.5074, -0.1278],
        zoom: 11,
        transportProvider: 'tfl'
    },
    buenosaires: {
        name: 'Buenos Aires',
        center: [-34.6037, -58.3816],
        zoom: 11,
        transportProvider: null
    },
    madrid: {
        name: 'Madrid',
        center: [40.4168, -3.7038],
        zoom: 11,
        transportProvider: null
    }
};

function getSelectedCity() {
    const params = new URLSearchParams(window.location.search);
    const key = (params.get('city') || 'london').toLowerCase();
    return CITY_CONFIG[key] || CITY_CONFIG.london;
}

export default class CiudadMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.city = getSelectedCity();

        this.map = null;
        this.trafficLayer = null;
        this.particlesCanvas = null;
        this.particlesCtx = null;
        this.particles = [];

        this.sidebar = null;
        this.statusEl = null;

        this.updateInterval = null;
        this.animationFrame = null;
    }

    async mount() {
        console.log('[Ciudad] Montando página Ciudad en vivo...');

        if (!eventManager.pollInterval) eventManager.init();

        this.container.innerHTML = '';

        avatarSubtitlesManager.init(this.container);
        setTimeout(() => avatarSubtitlesManager.show(), 100);

        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.createLayout();
        this.createMap();
        this.addTrafficOverlay();
        this.createParticleOverlay();

        await this.refreshCityData();

        // refresco frecuente para streaming (status) + tráfico es tiles (se refresca al moverse)
        this.updateInterval = setInterval(() => this.refreshCityData(), 60000);

        this.startParticles();
        await this.startNarration();
        this.scheduleNextPage();
    }

    // Targets sugeridos para el director de cámara global (Leaflet)
    getCinematicTargets() {
        // Tomar la ciudad como “escena”: centro + ligeros sweeps
        const t = [];
        try {
            const c = this.city?.center;
            if (Array.isArray(c) && c.length === 2) {
                t.push({ lat: c[0], lon: c[1], wideZoom: Math.max(9, (this.city.zoom || 11) - 2), medZoom: this.city.zoom || 11, closeZoom: (this.city.zoom || 11) + 1, driftDeg: 0.18 });
            }
        } catch (e) { }
        return t;
    }

    createLayout() {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.inset = '0';
        wrapper.style.display = 'grid';
        wrapper.style.gridTemplateColumns = '1fr 360px';
        wrapper.style.gap = '0';

        const mapHost = document.createElement('div');
        mapHost.id = 'city-map';
        mapHost.style.position = 'relative';
        mapHost.style.width = '100%';
        mapHost.style.height = '100%';
        mapHost.style.background = '#0a0a0f';

        const sidebar = document.createElement('div');
        sidebar.style.background = 'rgba(0,0,0,0.78)';
        sidebar.style.borderLeft = '1px solid rgba(255,255,255,0.08)';
        sidebar.style.padding = '14px';
        sidebar.style.fontFamily = 'Inter, system-ui, sans-serif';
        sidebar.style.color = '#fff';
        sidebar.style.overflow = 'auto';

        sidebar.innerHTML = `
            <div style="font-weight:800; font-size:16px; letter-spacing:.3px;">🏙️ Ciudad en vivo: ${this.city.name}</div>
            <div style="margin-top:6px; color: rgba(255,255,255,.7); font-size:12px;">
                Tráfico (TomTom) + Transporte (TfL Londres) + overlays animados
            </div>
            <div id="city-live-status" style="margin-top:12px; display:grid; gap:10px;"></div>
            <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.65); font-size:12px;">
                Tip: puedes elegir ciudad con <code>?city=london</code>, <code>?city=buenosaires</code>, <code>?city=madrid</code>.
            </div>
        `;

        wrapper.appendChild(mapHost);
        wrapper.appendChild(sidebar);
        this.container.appendChild(wrapper);

        this.sidebar = sidebar;
        this.statusEl = sidebar.querySelector('#city-live-status');
    }

    createMap() {
        const mapContainer = this.container.querySelector('#city-map');
        if (!mapContainer) return;

        if (!window.L) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => this.initMap();
            document.body.appendChild(script);
            return;
        }

        this.initMap();
    }

    initMap() {
        if (this.map) return;
        this.map = L.map('city-map', { zoomControl: false, attributionControl: false }).setView(this.city.center, this.city.zoom);

        // base tiles (claros) + overlay tráfico (colores)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }

    addTrafficOverlay() {
        // Usa un proxy en /control-api para no exponer la key en el cliente
        // Si no hay key configurada en el servidor, el endpoint responde 501 y dejamos “modo demo”.
        const trafficUrl = '/control-api/api/city/tomtom/traffic/{z}/{x}/{y}.png?style=relative';

        const maybeAdd = () => {
            if (!this.map || !window.L) return;
            this.trafficLayer = L.tileLayer(trafficUrl, {
                opacity: 0.75,
                maxZoom: 19,
                tileSize: 256,
                crossOrigin: true
            });
            this.trafficLayer.addTo(this.map);
        };

        // esperar a map init si todavía no está
        const timer = setInterval(() => {
            if (this.map) {
                clearInterval(timer);
                maybeAdd();
            }
        }, 100);
    }

    createParticleOverlay() {
        const mapHost = this.container.querySelector('#city-map');
        if (!mapHost) return;

        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.mixBlendMode = 'screen';
        canvas.style.opacity = '0.65';

        mapHost.appendChild(canvas);
        this.particlesCanvas = canvas;
        this.particlesCtx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = mapHost.clientWidth;
            canvas.height = mapHost.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // seed
        this.particles = Array.from({ length: 220 }, () => this.createParticle());
    }

    createParticle() {
        const w = this.particlesCanvas?.width || 1;
        const h = this.particlesCanvas?.height || 1;
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            r: 0.6 + Math.random() * 1.8,
            a: 0.15 + Math.random() * 0.35
        };
    }

    startParticles() {
        const draw = () => {
            if (!this.particlesCtx || !this.particlesCanvas) return;
            const ctx = this.particlesCtx;
            const w = this.particlesCanvas.width;
            const h = this.particlesCanvas.height;
            ctx.clearRect(0, 0, w, h);

            const t = Date.now() / 1000;
            for (const p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                // leve “viento” oscilante
                p.x += 0.15 * Math.sin(t + p.y * 0.01);

                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                ctx.beginPath();
                ctx.fillStyle = `rgba(0, 255, 255, ${p.a})`;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            this.animationFrame = requestAnimationFrame(draw);
        };
        draw();
    }

    async refreshCityData() {
        if (!this.statusEl) return;

        const cards = [];

        const traffic = await this.fetchTomTomHealth();
        cards.push(this.renderTrafficCard(traffic));

        // Transporte (TfL) – solo si city.transportProvider=tfl
        if (this.city.transportProvider === 'tfl') {
            const tfl = await this.fetchTfLStatus();
            cards.push(this.renderTransportCard(tfl));
        } else {
            cards.push(this.renderTransportCard({ ok: false, message: 'Transporte: sin proveedor configurado para esta ciudad.' }));
        }

        // “Indicador” de directo
        cards.push(this.renderLiveCard());

        this.statusEl.innerHTML = cards.join('');
    }

    async fetchTomTomHealth() {
        try {
            const res = await fetch('/control-api/api/city/tomtom/health');
            if (!res.ok) return { ok: false, reason: 'http', status: res.status };
            return await res.json();
        } catch (e) {
            return { ok: false, reason: 'fetch_failed', message: e?.message || 'Error' };
        }
    }

    renderTrafficCard(health) {
        // health: { ok:true } | { ok:false, reason, status, body }
        let title = '🚗 Tráfico (TomTom)';
        let detail = 'Overlay de flujo de tráfico sobre el mapa.';
        let hint = 'Si no ves colores, revisa la key/plan.';
        let color = '#00ffff';

        if (!health || health.ok !== true) {
            color = '#ffcc00';
            if (health?.reason === 'missing_key') {
                detail = 'Falta TOMTOM_API_KEY en el servidor.';
                hint = 'Crea una key en TomTom y actívala.';
            } else if (health?.reason === 'upstream_error') {
                detail = `TomTom responde ${health.status}.`;
                hint = (health.status === 403)
                    ? 'Tu key no tiene permiso para Traffic Flow Tiles. En TomTom Portal crea/edita la key y habilita el producto “Traffic”/“Traffic Flow Tiles”.'
                    : 'Revisa el plan/productos asociados a la key en el portal de TomTom.';
            } else {
                detail = 'No se pudo validar TomTom.';
                hint = 'Revisa conectividad y variables de entorno.';
            }
        }

        return `
            <div style="padding:10px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background: rgba(255,255,255,.04);">
                <div style="font-weight:800; color:${color};">${title}</div>
                <div style="margin-top:6px; color: rgba(255,255,255,.75); font-size:12px;">${this.escapeHtml(detail)}</div>
                <div style="margin-top:8px; color: rgba(255,255,255,.65); font-size:11px;">${this.escapeHtml(hint)}</div>
            </div>
        `;
    }

    async fetchTfLStatus() {
        try {
            const res = await fetch('/control-api/api/city/tfl/status');
            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                return { ok: false, message: msg || `TfL status HTTP ${res.status}` };
            }
            const data = await res.json();
            return { ok: true, data };
        } catch (e) {
            return { ok: false, message: e?.message || 'Error obteniendo TfL' };
        }
    }

    renderTransportCard(tfl) {
        if (!tfl.ok) {
            return `
                <div style="padding:10px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background: rgba(255,255,255,.04);">
                    <div style="font-weight:700;">🚇 Transporte</div>
                    <div style="margin-top:6px; color: rgba(255,255,255,.7); font-size:12px;">
                        ${this.escapeHtml(tfl.message || 'No disponible')}
                    </div>
                    <div style="margin-top:8px; color: rgba(255,255,255,.6); font-size:11px;">
                        Para activar “en directo” configura <code>TFL_APP_ID</code> y <code>TFL_APP_KEY</code> en el servidor.
                    </div>
                </div>
            `;
        }

        const lines = Array.isArray(tfl.data) ? tfl.data.slice(0, 10) : [];
        const items = lines.map(l => {
            const name = l.name || 'Línea';
            const statuses = (l.lineStatuses || []).map(s => s.statusSeverityDescription).join(', ') || 'OK';
            const color = statuses.includes('Good Service') ? '#00ff7a' : statuses.includes('Minor') ? '#ffcc00' : '#ff5555';
            return `<div style="display:flex; justify-content:space-between; gap:10px; padding:4px 0;">
                <div style="font-weight:600;">${this.escapeHtml(name)}</div>
                <div style="color:${color}; font-weight:700; font-size:12px;">${this.escapeHtml(statuses)}</div>
            </div>`;
        }).join('');

        return `
            <div style="padding:10px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background: rgba(255,255,255,.04);">
                <div style="font-weight:800;">🚇 Transporte (TfL)</div>
                <div style="margin-top:8px; display:grid; gap:2px; font-size:12px;">
                    ${items || '<div style="color: rgba(255,255,255,.7);">Sin datos</div>'}
                </div>
            </div>
        `;
    }

    renderLiveCard() {
        const now = new Date();
        return `
            <div style="padding:10px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background: rgba(255,255,255,.04);">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div style="font-weight:800;">🔴 EN DIRECTO</div>
                    <div style="font-size:12px; color: rgba(255,255,255,.7);">${now.toLocaleTimeString('es-ES')}</div>
                </div>
                <div style="margin-top:6px; color: rgba(255,255,255,.75); font-size:12px;">
                    El overlay de tráfico se refresca con tiles (flujo/congestión). Si no ves colores, revisa el panel de “Tráfico (TomTom)”.
                </div>
                <div style="margin-top:8px; color: rgba(255,255,255,.6); font-size:11px;">
                    Variables: <code>TOMTOM_API_KEY</code>, <code>TFL_APP_ID</code>, <code>TFL_APP_KEY</code>
                </div>
            </div>
        `;
    }

    escapeHtml(str) {
        return String(str || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);

        const immediateText = `Estoy en ${this.city.name}. En este mapa veo la ciudad en directo: el flujo del tráfico y el estado del transporte. Cada color cuenta una historia: congestión, velocidad, rutas, interrupciones. Esto es la respiración urbana, en tiempo real.`;
        avatarSubtitlesManager.setSubtitles(immediateText);

        const updateSubtitles = (text) => avatarSubtitlesManager.setSubtitles(text);
        audioManager.speak(immediateText, 'normal', () => {
            this.isNarrating = false;
            pacingEngine.endCurrentEvent();
            pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
        }, updateSubtitles);
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Ciudad] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'terremotos', 'satelites', 'aire', 'incendios', 'sol'];
                    const currentPage = 'ciudad';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Ciudad] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.updateInterval) clearInterval(this.updateInterval);
        if (this.map) this.map.remove();
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}

