import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { COUNTRY_INFO } from '../data/country-info.js';

function haversineKm(a, b) {
    const R = 6371;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default class RutaMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null; // Leaflet map (para cinematic director)

        this.stops = [];      // stops “comprimidos” (sin duplicados seguidos)
        this.visitEvents = []; // eventos crudos (todas las visitas)
        this.selectedIdx = 0;

        this.ui = {};
        this._raf = null;
        this._travel = {
            playing: true,
            t: 0, // 0..1
            speed: 0.018, // “vueltas” por minuto aprox (ajustado en RAF)
            marker: null,
            follow: true
        };
    }

    async mount() {
        console.log('[Ruta] Montando página de ruta del viaje...');

        // Inicializar eventManager si no está inicializado
        if (!eventManager.pollInterval) {
            eventManager.init();
        }

        // Telemetría: marcar escena actual para el panel de control
        try {
            eventManager.reportTelemetry('RUTA', 'GLOBAL', 0);
        } catch (e) { }

        // Limpiar contenedor primero
        this.container.innerHTML = '';

        // UI base (no se borra durante el render)
        this.buildLayout();

        // Inicializar avatar (sobre el root)
        avatarSubtitlesManager.init(this.ui.root);
        setTimeout(() => avatarSubtitlesManager.show(), 100);

        // Iniciar música de fondo
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }

        // Habilitar audio después de interacción (broadcast-only: evitar mouse)
        const enableAudio = () => {
            audioManager.tryStartAfterInteraction();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
            }
            document.removeEventListener('keydown', enableAudio);
        };
        document.addEventListener('keydown', enableAudio, { once: true });

        // Registrar handler para comandos de música (ANTES de cargar datos)
        eventManager.on('music_command', (musicState) => {
            console.log('[Ruta] 🎵 Comando de música recibido:', musicState.command);
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
                if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                    audioManager.musicLayer.play().then(() => {
                        audioManager.isMusicPlaying = true;
                        audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    }).catch(e => console.warn('[Ruta] Error iniciando música:', e));
                }
            }
        });

        // Controles remotos específicos de Ruta (panel)
        eventManager.on('ruta_play_toggle', () => {
            try { this.togglePlay(); } catch (e) { }
        });
        eventManager.on('ruta_follow_toggle', () => {
            try { this.toggleFollow(); } catch (e) { }
        });

        // Cargar datos, render y narración
        await this.loadRouteData();
        await this.ensureLeaflet();
        this.initMap();
        this.renderRoute();
        this.startTravelAnimation();
        await this.startNarration();
    }

    async loadRouteData() {
        try {
            const res = await fetch('/control-api/api/country-memory');
            if (!res.ok) return;
            const data = await res.json();
            const memories = data.memories || [];

            const ids = memories.map(m => m.countryId).filter(Boolean);
            const detail = await Promise.all(ids.map(async (id) => {
                try {
                    const r = await fetch(`/control-api/api/country-memory/${id}`);
                    if (!r.ok) return null;
                    return await r.json();
                } catch (e) {
                    return null;
                }
            }));

            const events = [];
            detail.filter(Boolean).forEach(mem => {
                const cid = mem.countryId;
                const info = COUNTRY_INFO[cid];
                if (!info?.coords) return;
                const visits = Array.isArray(mem.visits) ? mem.visits : [];
                visits.forEach(v => {
                    const ts = v.timestamp || v.visitId || null;
                    if (!ts) return;
                    events.push({
                        countryId: cid,
                        name: info.name || cid,
                        lat: info.coords.lat,
                        lon: info.coords.lng,
                        timestamp: Number(ts),
                        isFirstVisit: !!v.isFirstVisit,
                        narrative: (v.narrative || '').toString()
                    });
                });
            });

            events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            this.visitEvents = events;

            // Comprimir duplicados seguidos (para que la ruta se vea “limpia”)
            const stops = [];
            for (const e of events) {
                const last = stops[stops.length - 1];
                if (last && last.countryId === e.countryId) {
                    last.count++;
                    last.lastTs = e.timestamp;
                    continue;
                }
                stops.push({
                    countryId: e.countryId,
                    name: e.name,
                    lat: e.lat,
                    lon: e.lon,
                    firstTs: e.timestamp,
                    lastTs: e.timestamp,
                    count: 1
                });
            }

            // Fallback “demo” si no hay datos aún (pantalla nunca vacía)
            // Fallback DINÁMICO si no hay datos aún (User Request: "No info hardcodded")
            if (stops.length === 0) {
                console.log('[Ruta] Sin historial previo. Generando ruta aleatoria procedural...');
                const allIds = Object.keys(COUNTRY_INFO);
                const demoStops = [];

                // Empezar en un país aleatorio
                let currentId = allIds[Math.floor(Math.random() * allIds.length)];

                // Generar 5 paradas conectadas
                for (let i = 0; i < 5; i++) {
                    const info = COUNTRY_INFO[currentId];
                    if (info && info.coords) {
                        demoStops.push({
                            countryId: currentId,
                            name: info.name,
                            lat: info.coords.lat,
                            lon: info.coords.lng
                        });
                    }
                    // Saltar a otro aleatorio (simulando vuelo)
                    currentId = allIds[Math.floor(Math.random() * allIds.length)];
                }

                // Asignar timestamps recientes
                const now = Date.now();
                this.visitEvents = demoStops.map((d, i) => ({
                    ...d,
                    timestamp: now - (demoStops.length - i) * 3600_000 * 4, // 4 horas entre saltos
                    narrative: "Ruta de exploración inicial generada por el sistema."
                }));
                this.stops = demoStops.map((d, i) => ({
                    ...d,
                    firstTs: now - (demoStops.length - i) * 3600_000 * 4,
                    lastTs: now - (demoStops.length - i) * 3600_000 * 4,
                    count: 1
                }));
            } else {
                this.stops = stops;
            }

            this.selectedIdx = Math.max(0, Math.min(this.selectedIdx, this.stops.length - 1));

            this.updateStatsUi();
            this.renderTimeline();
        } catch (e) {
            console.error('[Ruta] Error cargando datos:', e);
        }
    }

    buildLayout() {
        const root = document.createElement('div');
        root.id = 'ruta-root';
        root.style.cssText = `position:absolute; inset:0; overflow:hidden; background: radial-gradient(1200px 800px at 20% 10%, rgba(74,158,255,0.14), transparent 60%), radial-gradient(1000px 700px at 85% 85%, rgba(168,85,247,0.14), transparent 60%), linear-gradient(135deg, #05050b 0%, #0f0f1a 60%, #05050b 100%);`;

        // Map
        const map = document.createElement('div');
        map.id = 'ruta-map';
        map.style.cssText = `position:absolute; inset:0;`;
        root.appendChild(map);

        // Left panel (timeline)
        const left = document.createElement('div');
        left.style.cssText = `
            position:absolute; left:20px; top:20px; bottom:20px; width:360px;
            background: rgba(10,10,15,0.72); border: 1px solid rgba(255,255,255,0.10);
            border-radius: 16px; padding: 16px; backdrop-filter: blur(10px);
            z-index: 1200; display:flex; flex-direction:column; gap:12px;
        `;
        left.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="font-family:'Inter'; font-weight:800; letter-spacing:0.5px; font-size: 18px;">
                    <span style="color:#4a9eff;">RUTA</span> <span style="color:#e8e8f0;">DEL VIAJE</span>
                </div>
                <div id="ruta-live-pill" style="font-family:'Inter'; font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.06);">
                    BROADCAST
                </div>
            </div>
            <div id="ruta-subtitle" style="font-size:12px; color: rgba(255,255,255,0.65); line-height:1.35;">
                Sin interacción local: control total desde el panel (PLAY/PAUSE + FOLLOW/FREE).
            </div>
            <div style="height:1px; background: rgba(255,255,255,0.08);"></div>
            <div id="ruta-timeline" style="flex:1; overflow:auto; padding-right:6px;"></div>
            <div id="ruta-hint" style="font-size:11px; color: rgba(255,255,255,0.55);">
                Tip: en Dream Mode la cámara recorre la ruta automáticamente.
            </div>
        `;
        root.appendChild(left);

        // Right panel (stats)
        const right = document.createElement('div');
        right.style.cssText = `
            position:absolute; right:20px; top:20px; width:320px;
            background: rgba(10,10,15,0.72); border: 1px solid rgba(255,255,255,0.10);
            border-radius: 16px; padding: 14px 14px 12px 14px; backdrop-filter: blur(10px);
            z-index: 1200;
        `;
        right.innerHTML = `
            <div style="font-family:'Inter'; font-weight:800; font-size:14px; color: rgba(255,255,255,0.8); margin-bottom:10px;">
                📊 Estado de la ruta
            </div>
            <div id="ruta-stats" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;"></div>
            <div id="ruta-selected" style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); font-size:12px;"></div>
        `;
        root.appendChild(right);

        // CSS helpers (animación línea)
        const style = document.createElement('style');
        style.textContent = `
            .ruta-chip { padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); cursor: default; transition: transform 160ms ease, border-color 160ms ease; pointer-events:none; }
            .ruta-chip.active { border-color: rgba(74,158,255,0.9); background: rgba(74,158,255,0.10); }
            .ruta-chip .t1 { font-weight:800; color: rgba(255,255,255,0.92); }
            .ruta-chip .t2 { font-size:11px; color: rgba(255,255,255,0.60); margin-top:4px; }
            .ruta-chip .pill { font-size:10px; padding:3px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
            .ruta-stat { border:1px solid rgba(255,255,255,0.10); border-radius:14px; padding:10px 10px; background: rgba(255,255,255,0.04); }
            .ruta-stat .v { font-size:20px; font-weight:900; color:#4a9eff; }
            .ruta-stat .k { font-size:11px; color: rgba(255,255,255,0.55); margin-top:2px; }
            .ruta-polyline-glow { filter: drop-shadow(0 0 10px rgba(74,158,255,0.35)) drop-shadow(0 0 22px rgba(168,85,247,0.25)); }
            .ruta-animate-dash path { stroke-dasharray: 10 14; animation: rutaDash 2.2s linear infinite; }
            @keyframes rutaDash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 48; } }
        `;
        root.appendChild(style);

        this.container.appendChild(root);

        this.ui.root = root;
        this.ui.mapEl = map;
        this.ui.timeline = left.querySelector('#ruta-timeline');
        this.ui.stats = right.querySelector('#ruta-stats');
        this.ui.selected = right.querySelector('#ruta-selected');
        this.ui.pill = left.querySelector('#ruta-live-pill');

        this.applyControlsUi();
    }

    applyControlsUi() {
        try {
            if (this.ui?.pill) {
                const a = this._travel.playing ? 'PLAY' : 'PAUSE';
                const b = this._travel.follow ? 'FOLLOW' : 'FREE';
                this.ui.pill.textContent = `BROADCAST · ${a} · ${b}`;
            }
        } catch (e) { }
    }

    togglePlay() {
        this._travel.playing = !this._travel.playing;
        this.applyControlsUi();
    }

    toggleFollow() {
        this._travel.follow = !this._travel.follow;
        this.applyControlsUi();
    }

    async ensureLeaflet() {
        if (window.L) return;
        await new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve();
            document.body.appendChild(script);
        });
    }

    initMap() {
        if (this.map) return;
        // Broadcast-only: sin interacción de mouse/touch
        try {
            const host = document.getElementById('ruta-map');
            if (host) host.style.pointerEvents = 'none';
        } catch (e) { }

        this.map = L.map('ruta-map', {
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

        // Dark tiles (más “TV”)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(this.map);
    }

    renderRoute() {
        if (!this.map) return;

        // limpiar capas previas (sin destruir map)
        try {
            this._routeLayer?.remove?.();
            this._markersLayer?.remove?.();
            this._travel.marker?.remove?.();
        } catch (e) { }

        const latlngs = this.stops.map(s => [s.lat, s.lon]);
        if (latlngs.length === 0) return;

        // layer group para ruta + markers
        const routeLayer = L.layerGroup().addTo(this.map);
        const markersLayer = L.layerGroup().addTo(this.map);
        this._routeLayer = routeLayer;
        this._markersLayer = markersLayer;

        // Ruta base + glow
        if (latlngs.length >= 2) {
            const base = L.polyline(latlngs, { color: '#4a9eff', weight: 3, opacity: 0.35 }).addTo(routeLayer);
            const glow = L.polyline(latlngs, { color: '#4a9eff', weight: 5, opacity: 0.55, className: 'ruta-polyline-glow ruta-animate-dash' }).addTo(routeLayer);
            try {
                // Fit bounds suave
                this.map.fitBounds(base.getBounds(), { padding: [80, 420], maxZoom: 5 });
            } catch (e) { }
        } else {
            this.map.setView(latlngs[0], 4);
        }

        // Markers + tooltips
        this._leafletMarkers = [];
        this.stops.forEach((s, idx) => {
            const r = Math.min(14, 7 + Math.log2(1 + (s.count || 1)) * 2.2);
            const m = L.circleMarker([s.lat, s.lon], {
                radius: r,
                color: '#e8e8f0',
                weight: 1.5,
                fillColor: '#4a9eff',
                fillOpacity: 0.75
            }).addTo(markersLayer);

            m.bindTooltip(`${idx + 1}. ${s.name} ${s.count > 1 ? `(${s.count}x)` : ''}`, {
                permanent: false,
                direction: 'top',
                opacity: 0.9
            });
            this._leafletMarkers.push(m);
        });

        // Travel marker (“cometa”)
        const first = this.stops[0];
        this._travel.marker = L.circleMarker([first.lat, first.lon], {
            radius: 10,
            color: '#a855f7',
            weight: 2,
            fillColor: '#a855f7',
            fillOpacity: 0.65
        }).addTo(routeLayer);

        this.selectStop(this.selectedIdx, false);
    }

    renderTimeline() {
        const box = this.ui.timeline;
        if (!box) return;
        box.innerHTML = '';

        this.stops.forEach((s, idx) => {
            const d = new Date(s.lastTs || s.firstTs || Date.now());
            const time = d.toLocaleString('es-ES', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const el = document.createElement('div');
            el.className = `ruta-chip${idx === this.selectedIdx ? ' active' : ''}`;
            el.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div class="t1">${idx + 1}. ${s.name}</div>
                    <div class="pill">${s.count || 1}x</div>
                </div>
                <div class="t2">Última: ${time}</div>
            `;
            box.appendChild(el);
        });
    }

    updateStatsUi() {
        const st = this.ui.stats;
        const sel = this.ui.selected;
        if (!st || !sel) return;

        const uniqueCountries = new Set(this.visitEvents.map(e => e.countryId)).size;
        const totalVisits = this.visitEvents.length;
        let dist = 0;
        for (let i = 1; i < this.stops.length; i++) {
            dist += haversineKm(this.stops[i - 1], this.stops[i]);
        }
        const last = this.stops[this.stops.length - 1] || null;

        st.innerHTML = `
            <div class="ruta-stat"><div class="v">${uniqueCountries}</div><div class="k">Países</div></div>
            <div class="ruta-stat"><div class="v">${totalVisits}</div><div class="k">Visitas</div></div>
            <div class="ruta-stat"><div class="v">${Math.round(dist)}</div><div class="k">Km aprox.</div></div>
            <div class="ruta-stat"><div class="v">${this.stops.length}</div><div class="k">Paradas</div></div>
        `;

        if (last) {
            sel.innerHTML = `<div style="font-weight:800;">Última parada</div><div style="margin-top:4px;">${last.name} · ${new Date(last.lastTs).toLocaleString('es-ES')}</div>`;
        } else {
            sel.innerHTML = `<div style="font-weight:800;">Última parada</div><div style="margin-top:4px;">—</div>`;
        }
    }

    selectStop(idx, fly = true) {
        this.selectedIdx = idx;
        this.renderTimeline();
        this.updateStatsUi();

        const s = this.stops[idx];
        if (!s || !this.map) return;

        // Enfocar map
        if (fly) {
            try { this.map.flyTo([s.lat, s.lon], Math.min(6, Math.max(3, this.map.getZoom())), { animate: true, duration: 1.2 }); } catch (e) { }
        }

        // Resaltar marker (micro‑pulse)
        try {
            this._leafletMarkers?.forEach((m, i) => {
                if (!m?.setStyle) return;
                if (i === idx) m.setStyle({ fillColor: '#a855f7', color: '#ffffff', weight: 2.2, fillOpacity: 0.9 });
                else m.setStyle({ fillColor: '#4a9eff', color: '#e8e8f0', weight: 1.5, fillOpacity: 0.75 });
            });
        } catch (e) { }
    }

    startTravelAnimation() {
        if (this._raf) cancelAnimationFrame(this._raf);
        const loop = (ts) => {
            if (!this.map || !this._travel.marker || this.stops.length < 2) {
                this._raf = requestAnimationFrame(loop);
                return;
            }
            if (!this._lastTs) this._lastTs = ts;
            const dt = Math.min(0.06, (ts - this._lastTs) / 1000);
            this._lastTs = ts;

            if (this._travel.playing) {
                // avanzar t (0..1)
                this._travel.t = (this._travel.t + dt * this._travel.speed) % 1;
            }

            // Interpolar sobre segmentos
            const segCount = this.stops.length - 1;
            const x = this._travel.t * segCount;
            const i = Math.floor(x);
            const f = x - i;
            const a = this.stops[i];
            const b = this.stops[Math.min(segCount, i + 1)];
            const lat = a.lat + (b.lat - a.lat) * f;
            const lon = a.lon + (b.lon - a.lon) * f;
            this._travel.marker.setLatLng([lat, lon]);

            if (this._travel.follow && this._travel.playing) {
                try {
                    // follow suave sin marear
                    const z = Math.max(2, Math.min(6, this.map.getZoom()));
                    this.map.panTo([lat, lon], { animate: true, duration: 0.4 });
                    if (z < 3) this.map.setZoom(3, { animate: true });
                } catch (e) { }
            }

            // Selección “automática” cuando pasa cerca de un stop
            const nearIdx = Math.round(this._travel.t * segCount);
            if (nearIdx !== this.selectedIdx && this._travel.playing) {
                this.selectStop(nearIdx, false);
            }

            this._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);

        const countriesCount = new Set(this.visitEvents.map(e => e.countryId)).size;
        const totalVisits = this.visitEvents.length;

        // Texto inicial inmediato
        const immediateText = `Esta es la ruta que hemos recorrido hasta ahora. Hemos visitado ${countriesCount} país${countriesCount !== 1 ? 'es' : ''}, con un total de ${totalVisits} visita${totalVisits !== 1 ? 's' : ''}. Cada punto en el mapa representa un lugar donde hemos aprendido algo nuevo sobre nuestro mundo.`;

        avatarSubtitlesManager.setSubtitles(immediateText);

        const generateFullTextPromise = this.generateFullNarrative();

        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };

        audioManager.speak(immediateText, 'normal', async () => {
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Ruta] Error generando texto completo:', e);
            }

            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                    // Dream Mode: Cambiar automáticamente después de la narración
                    this.scheduleNextPage();
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                // Dream Mode: Cambiar automáticamente después de la narración
                this.scheduleNextPage();
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            const countriesList = this.stops.slice(0, 10).map(c => c.name).join(', ');
            const prompt = `Genera un relato narrativo sobre la ruta del viaje. 
            Hemos recorrido ${new Set(this.visitEvents.map(e => e.countryId)).size} países: ${countriesList}${this.stops.length > 10 ? ' y más' : ''}.
            El relato debe ser reflexivo sobre el camino recorrido, las conexiones entre lugares, y la experiencia del viaje.
            Habla en primera persona como ilfass, el explorador digital.`;

            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (res.ok) {
                const data = await res.json();
                return data.narrative || null;
            }
        } catch (e) {
            console.warn('[Ruta] Error generando narrativa:', e);
        }

        return `Cada línea en el mapa representa un paso en este viaje. 
        Cada país visitado nos ha enseñado algo único sobre la humanidad y nuestro planeta. 
        El camino continúa, y con cada nuevo lugar descubrimos más sobre este mundo que exploramos.`;
    }

    scheduleNextPage() {
        // Si Dream Mode está ON, cambiar automáticamente a otra página
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('ruta');
    }

    getRecapContext() {
        const uniqueCountries = new Set(this.visitEvents.map(e => e.countryId)).size;
        const totalVisits = this.visitEvents.length;
        const last = this.stops[this.stops.length - 1];
        let dist = 0;
        for (let i = 1; i < this.stops.length; i++) dist += haversineKm(this.stops[i - 1], this.stops[i]);

        return {
            currentScene: 'Ruta',
            currentLocation: last?.name || 'GLOBAL',
            mainStat: `${uniqueCountries} países • ${totalVisits} visitas • ~${Math.round(dist)} km`,
            secondaryStat: `Paradas: ${this.stops.length}. Ruta animada y navegable.`,
            highlights: [
                last ? `Última parada: ${last.name}` : 'Sin paradas aún.',
                `La ruta está basada en memorias reales (visitas guardadas).`,
                `Click en una parada para enfocar y ver el recorrido.`
            ]
        };
    }

    getCinematicTargets() {
        const t = [];
        try {
            this.stops.slice(0, 10).forEach(s => t.push({ lat: s.lat, lon: s.lon, closeZoom: 5, sweepZoom: 4, driftDeg: 6 }));
        } catch (e) { }
        try {
            const c = this.map?.getCenter?.();
            if (c) t.push({ lat: c.lat, lon: c.lng, wideZoom: 2, medZoom: 3, driftDeg: 10 });
        } catch (e) { }
        return t;
    }

    unmount() {
        try { if (this._raf) cancelAnimationFrame(this._raf); } catch (e) { }
        try { this.map?.remove?.(); } catch (e) { }
        this.map = null;
        if (this.container) this.container.innerHTML = '';
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
