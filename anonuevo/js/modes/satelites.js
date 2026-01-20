import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class SatelitesMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.issMarker = null;
        this.orbitTrail = []; // Trayectoria de la órbita
        this.updateInterval = null;
        this.animationFrame = null;
        this.lastPosition = null;
        this.terminatorLayer = null;
        this.sunMarker = null;
        this.footprintCircle = null;
        this.auroraLayer = null;
        this.spaceWeatherOverlay = null;
        this.kpData = null;
        this.spaceWeatherInterval = null;
        this.lastAurora = null;

        // Satélites extra (TLE + propagación)
        this.extraSatellites = new Map(); // noradId -> { name, satrec, marker }
        this.extraSatellitesInterval = null;
        this.maxExtraSatellites = 40; // límite por performance (se puede subir)
        this.labelsEnabled = (localStorage.getItem('sat_labels_enabled') === '1');

        // Cinematic camera: evitar pelear con el director global
        this.lastRecenterAt = 0;
    }

    async mount() {
        console.log('[Satélites] Montando página de satélites con API y animaciones...');
        
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        this.container.innerHTML = '';
        
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        this.createMap();
        await this.waitForMapReady();
        await this.loadISSLocation();
        await this.loadSpaceWeather();
        await this.initExtraSatellites();
        
        // Actualizar cada 5 segundos (ISS se mueve rápido)
        this.updateInterval = setInterval(() => {
            this.loadISSLocation();
        }, 5000);

        // Clima espacial: menos frecuente
        this.spaceWeatherInterval = setInterval(() => {
            this.loadSpaceWeather();
        }, 120000); // 2 min

        // Satélites extra: actualización suave
        this.extraSatellitesInterval = setInterval(() => {
            this.updateExtraSatellites();
        }, 5000);
        
        // Iniciar animaciones
        this.startAnimations();
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    createMap() {
        const mapContainer = document.createElement('div');
        mapContainer.id = 'satellites-map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.position = 'absolute';
        mapContainer.style.top = '0';
        mapContainer.style.left = '0';
        this.container.appendChild(mapContainer);

        // Overlay de información (para que el relato “hable de lo que se ve”)
        const info = document.createElement('div');
        info.id = 'iss-info-overlay';
        info.style.cssText = `
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 5000;
            background: rgba(0,0,0,0.55);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 12px;
            padding: 10px 12px;
            color: #fff;
            font-family: Inter, system-ui, sans-serif;
            font-size: 12px;
            line-height: 1.35;
            min-width: 240px;
            backdrop-filter: blur(6px);
        `;
        info.innerHTML = `<div style="font-weight:800; color:#00ffff;">🛰️ ISS en vivo</div>
                          <div style="margin-top:6px; color: rgba(255,255,255,.75);">Cargando datos...</div>`;
        this.container.appendChild(info);
        this.infoOverlay = info;

        // Overlay adicional: clima espacial (Kp + auroras)
        const sw = document.createElement('div');
        sw.id = 'space-weather-overlay';
        sw.style.cssText = `
            position: absolute;
            top: 14px;
            left: 14px;
            z-index: 5000;
            background: rgba(0,0,0,0.55);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 12px;
            padding: 10px 12px;
            color: #fff;
            font-family: Inter, system-ui, sans-serif;
            font-size: 12px;
            line-height: 1.35;
            min-width: 260px;
            backdrop-filter: blur(6px);
        `;
        sw.innerHTML = `<div style="font-weight:800; color:#a78bfa;">🌌 Clima espacial</div>
                        <div style="margin-top:6px; color: rgba(255,255,255,.75);">Cargando Kp y auroras...</div>`;
        this.container.appendChild(sw);
        this.spaceWeatherOverlay = sw;

        if (!window.L) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                this.initMap();
            };
            document.body.appendChild(script);
        } else {
            this.initMap();
        }
    }

    async waitForMapReady(timeoutMs = 6000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (window.L && this.map) return true;
            await new Promise(r => setTimeout(r, 60));
        }
        console.warn('[Satélites] Mapa no listo a tiempo');
        return false;
    }

    initMap() {
        this.map = L.map('satellites-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);
        
        // Usar tiles oscuros para efecto espacial
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);

        // Capa día/noche (terminador) para darle contexto “espacial”
        this.ensureTerminatorLayer();
    }

    ensureTerminatorLayer() {
        if (!this.map) return;
        // Si el plugin ya está cargado, agregar/actualizar
        if (window.L && window.L.terminator) {
            if (!this.terminatorLayer) {
                this.terminatorLayer = L.terminator({ opacity: 0.35, fillColor: '#000', color: 'rgba(0,0,0,0)' });
                this.terminatorLayer.addTo(this.map);
            } else {
                try { this.terminatorLayer.setTime(new Date()); } catch (e) { }
            }
            return;
        }
        // Cargar plugin por CDN (HTTPS) una sola vez
        if (document.getElementById('leaflet-terminator-js')) return;
        const script = document.createElement('script');
        script.id = 'leaflet-terminator-js';
        script.src = 'https://unpkg.com/leaflet-terminator@1.0.0/L.Terminator.js';
        script.onload = () => {
            // Reintentar cuando cargue
            this.ensureTerminatorLayer();
        };
        document.body.appendChild(script);
    }

    async loadISSLocation() {
        try {
            // IMPORTANTE: usar API HTTPS para evitar Mixed Content en habilispro.com (https)
            // Fuente: https://wheretheiss.at/ (CORS + HTTPS)
            const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { cache: 'no-store' });
            const data = await response.json();

            // Si Leaflet no está listo aún, reintentar luego
            if (!window.L || !this.map) return;

            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                const lat = data.latitude;
                const lon = data.longitude;
                const timestamp = data.timestamp || Math.floor(Date.now() / 1000);
                const velocity = typeof data.velocity === 'number' ? data.velocity : null;
                const altitude = typeof data.altitude === 'number' ? data.altitude : null;
                const visibility = typeof data.visibility === 'string' ? data.visibility : null;
                const footprint = typeof data.footprint === 'number' ? data.footprint : null;
                const solarLat = typeof data.solar_lat === 'number' ? data.solar_lat : null;
                const solarLon = typeof data.solar_lon === 'number' ? data.solar_lon : null;
                
                // Remover marcador anterior
                if (this.issMarker && this.map) {
                    this.map.removeLayer(this.issMarker);
                }
                
                // Agregar punto a la trayectoria
                if (this.lastPosition) {
                    const distance = this.calculateDistance(this.lastPosition.lat, this.lastPosition.lon, lat, lon);
                    // Solo agregar si se movió significativamente (evitar puntos duplicados)
                    if (distance > 0.5) {
                        this.orbitTrail.push([lat, lon]);
                        
                        // Limitar trayectoria a 100 puntos
                        if (this.orbitTrail.length > 100) {
                            this.orbitTrail.shift();
                        }
                        
                        // Actualizar línea de trayectoria
                        if (this.orbitTrail.length > 1) {
                            // Remover línea anterior si existe
                            if (this.orbitLine && this.map) {
                                this.map.removeLayer(this.orbitLine);
                            }
                            
                            // Crear nueva línea con todos los puntos
                            this.orbitLine = L.polyline(this.orbitTrail, {
                                color: '#00ffff',
                                weight: 2,
                                opacity: 0.6,
                                dashArray: '5, 5'
                            }).addTo(this.map);
                        }
                    }
                }
                
                // Crear icono personalizado para la ISS con efecto de brillo
                const issIcon = L.divIcon({
                    className: 'iss-marker',
                    // incluir emoji para mantener consistencia con “todos los satélites”
                    html: '<div style="display:flex; align-items:center; gap:8px;"><div style="background: #00ffff; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff;"></div><div style="font-size:14px; filter: drop-shadow(0 0 6px rgba(0,255,255,0.75));">🛰️</div></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                
                this.issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(this.map);
                
                const date = new Date(timestamp * 1000);
                // wheretheiss entrega velocidad (km/h). Fallback a estimación si no está.
                const speed = velocity ?? this.calculateSpeed(lat, lon);

                // Actualizar terminador día/noche
                if (this.terminatorLayer && typeof this.terminatorLayer.setTime === 'function') {
                    try { this.terminatorLayer.setTime(new Date(timestamp * 1000)); } catch (e) { }
                } else {
                    this.ensureTerminatorLayer();
                }

                // Punto subsolar (posición del Sol sobre la Tierra)
                if (solarLat !== null && solarLon !== null) {
                    if (this.sunMarker && this.map) this.map.removeLayer(this.sunMarker);
                    const sunIcon = L.divIcon({
                        className: 'sun-marker',
                        html: '<div style="background: radial-gradient(circle, rgba(255,215,0,1) 0%, rgba(255,215,0,0.25) 55%, rgba(255,215,0,0) 70%); width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 18px rgba(255,215,0,0.75);"></div>',
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                    });
                    this.sunMarker = L.marker([solarLat, solarLon], { icon: sunIcon }).addTo(this.map);
                    this.sunMarker.bindPopup(`<div style="font-family: 'Inter', sans-serif;"><b>☀️ Punto subsolar</b><br>Lat: ${solarLat.toFixed(2)}°<br>Lon: ${solarLon.toFixed(2)}°</div>`);
                }

                // “Footprint” aproximado de cobertura (radio en km)
                if (footprint !== null) {
                    if (this.footprintCircle && this.map) this.map.removeLayer(this.footprintCircle);
                    // Leaflet usa metros en radius
                    this.footprintCircle = L.circle([lat, lon], {
                        radius: footprint * 1000,
                        color: 'rgba(0,255,255,0.35)',
                        weight: 1,
                        fillColor: 'rgba(0,255,255,0.08)',
                        fillOpacity: 0.25
                    }).addTo(this.map);
                }

                // Actualizar overlay informativo
                if (this.infoOverlay) {
                    const speedText = speed ? `${speed.toFixed(0)} km/h` : '—';
                    const altText = (altitude !== null) ? `${altitude.toFixed(0)} km` : '—';
                    const footprintText = (footprint !== null) ? `${footprint.toFixed(0)} km` : '—';
                    const visText = visibility ? visibility : '—';
                    this.infoOverlay.innerHTML = `
                        <div style="font-weight:800; color:#00ffff;">🛰️ ISS en vivo</div>
                        <div style="margin-top:6px; color: rgba(255,255,255,.85);">
                            Lat: <b>${lat.toFixed(2)}°</b> &nbsp; Lon: <b>${lon.toFixed(2)}°</b><br>
                            Velocidad: <b>${speedText}</b> &nbsp; Altitud: <b>${altText}</b><br>
                            Visibilidad: <b>${this.escapeHtml(visText)}</b> &nbsp; Cobertura: <b>${footprintText}</b><br>
                            <span style="color: rgba(255,255,255,.65);">${date.toLocaleString('es-ES')}</span>
                        </div>
                    `;
                }
                
                this.issMarker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                        <strong style="color: #00ffff; font-size: 1.2em;">🛰️ Estación Espacial Internacional</strong><br>
                        Latitud: ${lat.toFixed(2)}°<br>
                        Longitud: ${lon.toFixed(2)}°<br>
                        Velocidad: ~${speed.toFixed(0)} km/h<br>
                        Visibilidad: ${visibility || '—'}<br>
                        Cobertura: ${footprint ? footprint.toFixed(0) + ' km' : '—'}<br>
                        ${date.toLocaleString('es-ES')}
                    </div>
                `);
                
                // IMPORTANTE: no recentrar en cada tick (para permitir tomas “cinemáticas”).
                // Recentrar solo de vez en cuando o si la ISS se va del encuadre.
                const now = Date.now();
                const shouldRecenterByTime = (now - (this.lastRecenterAt || 0)) > 30000;
                let shouldRecenterByBounds = false;
                try {
                    const bounds = this.map.getBounds();
                    if (bounds && typeof bounds.contains === 'function') {
                        shouldRecenterByBounds = !bounds.contains([lat, lon]);
                    }
                } catch (e) { }
                if (shouldRecenterByTime || shouldRecenterByBounds) {
                    this.lastRecenterAt = now;
                    this.map.flyTo([lat, lon], 3, { animate: true, duration: 2.2 });
                }
                
                this.lastPosition = { lat, lon, timestamp };
                
                console.log(`[Satélites] ISS actualizada: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
            }
        } catch (error) {
            console.error('[Satélites] Error cargando posición ISS:', error);
            if (this.infoOverlay) {
                this.infoOverlay.innerHTML = `
                    <div style="font-weight:800; color:#ffcc00;">🛰️ ISS en vivo</div>
                    <div style="margin-top:6px; color: rgba(255,255,255,.75);">
                        Sin datos en este momento (error de red o API).
                    </div>
                `;
            }
        }
    }

    // Targets sugeridos para el director de cámara global (Leaflet)
    getCinematicTargets() {
        const t = [];
        if (this.lastPosition) {
            t.push({ lat: this.lastPosition.lat, lon: this.lastPosition.lon, closeZoom: 4, sweepZoom: 3, driftDeg: 1.2 });
        }
        // Punto subsolar como toma alternativa
        try {
            const ll = this.sunMarker?.getLatLng?.();
            if (ll) t.push({ lat: ll.lat, lon: ll.lng, medZoom: 2, sweepZoom: 3, driftDeg: 2.2 });
        } catch (e) { }
        // Algunas “auroras” (si existe layer, usar centro actual del mapa como fallback)
        try {
            const c = this.map?.getCenter?.();
            if (c) t.push({ lat: c.lat, lon: c.lng, wideZoom: 2, medZoom: 3, driftDeg: 3.0 });
        } catch (e) { }
        return t;
    }

    async loadSpaceWeather() {
        // NOAA SWPC (HTTPS): Kp + OVATION aurora
        // - Kp: https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
        // - Aurora: https://services.swpc.noaa.gov/json/ovation_aurora_latest.json  (coordinates: [lon, lat, value])
        try {
            const [kpRes, aurRes] = await Promise.allSettled([
                fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { cache: 'no-store' }),
                fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', { cache: 'no-store' })
            ]);

            let kp = null;
            let kpTime = null;
            let kpSeries = [];
            if (kpRes.status === 'fulfilled' && kpRes.value.ok) {
                const rows = await kpRes.value.json();
                // rows: [ [headers...], [time, Kp, ...], ... ]
                const dataRows = Array.isArray(rows) ? rows.slice(1) : [];
                kpSeries = dataRows
                    .map(r => ({ t: r?.[0], v: parseFloat(r?.[1]) }))
                    .filter(p => Number.isFinite(p.v));
                if (kpSeries.length) {
                    const last = kpSeries[kpSeries.length - 1];
                    kp = last.v;
                    kpTime = last.t;
                }
            }

            let aurora = null;
            if (aurRes.status === 'fulfilled' && aurRes.value.ok) {
                aurora = await aurRes.value.json();
            }

            this.kpData = { kp, kpTime, series: kpSeries };
            this.lastAurora = aurora;
            this.updateSpaceWeatherOverlay({ kp, kpTime, series: kpSeries, aurora });
            this.updateAuroraLayer(aurora);
        } catch (e) {
            console.warn('[Satélites] Error cargando clima espacial:', e);
            if (this.spaceWeatherOverlay) {
                this.spaceWeatherOverlay.innerHTML = `
                    <div style="font-weight:800; color:#a78bfa;">🌌 Clima espacial</div>
                    <div style="margin-top:6px; color: rgba(255,255,255,.75);">Sin datos por el momento.</div>
                `;
            }
        }
    }

    updateSpaceWeatherOverlay({ kp, kpTime, series, aurora }) {
        if (!this.spaceWeatherOverlay) return;

        const kpLabel = (kp === null) ? '—' : kp.toFixed(2);
        const { levelText, color } = this.describeKp(kp);
        const extraCount = this.extraSatellites ? this.extraSatellites.size : 0;

        // Calcular “actividad auroral” simple: max value en coords
        let auroraMax = null;
        let auroraTime = null;
        if (aurora && typeof aurora === 'object') {
            auroraTime = aurora['Observation Time'] || aurora['Forecast Time'] || null;
            const coords = Array.isArray(aurora.coordinates) ? aurora.coordinates : [];
            let m = 0;
            for (let i = 0; i < coords.length; i += 40) { // muestreo rápido para no iterar 65k siempre
                const v = coords[i]?.[2];
                if (typeof v === 'number' && v > m) m = v;
            }
            auroraMax = m || 0;
        }

        const kpTimeText = kpTime ? this.escapeHtml(kpTime.replace('.000', '')) : '—';
        const auroraMaxText = (auroraMax === null) ? '—' : String(Math.round(auroraMax));
        const auroraHint = (auroraMax !== null && auroraMax >= 20)
            ? 'Auroras activas en regiones polares.'
            : 'Auroras débiles o moderadas.';

        this.spaceWeatherOverlay.innerHTML = `
            <div style="font-weight:800; color:#a78bfa;">🌌 Clima espacial</div>
            <div style="margin-top:6px; color: rgba(255,255,255,.85);">
                Kp: <b style="color:${color};">${kpLabel}</b> <span style="color: rgba(255,255,255,.65);">(${this.escapeHtml(levelText)})</span><br>
                <span style="color: rgba(255,255,255,.65);">Último:</span> ${kpTimeText}
            </div>
            <div style="margin-top:8px; display:flex; align-items:center; gap:10px;">
                <canvas id="kp-sparkline" width="120" height="28" style="border-radius:6px; background: rgba(255,255,255,.06);"></canvas>
                <div style="flex:1; color: rgba(255,255,255,.8); font-size:11px;">
                    Aurora max: <b style="color:#7dd3fc;">${auroraMaxText}</b><br>
                    <span style="color: rgba(255,255,255,.65);">${this.escapeHtml(auroraHint)}</span>
                </div>
            </div>
            <div style="margin-top:8px; color: rgba(255,255,255,.75); font-size:11px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div>🛰️ Satélites extra: <b>${extraCount}</b> (grupo: visual)</div>
                    <button id="toggle-sat-labels" style="
                        cursor:pointer;
                        border: 1px solid rgba(255,255,255,0.18);
                        background: rgba(255,255,255,0.08);
                        color: rgba(255,255,255,0.92);
                        padding: 6px 8px;
                        border-radius: 10px;
                        font-size: 11px;
                        line-height: 1;
                    ">Etiquetas: ${this.labelsEnabled ? 'ON' : 'OFF'}</button>
                </div>
            </div>
        `;

        // Dibujar sparkline (últimos 12 puntos)
        try {
            const canvas = this.spaceWeatherOverlay.querySelector('#kp-sparkline');
            if (canvas) this.drawKpSparkline(canvas, series?.slice(-12) || []);
        } catch (e) { }

        // Hook del toggle (re-rendera este overlay cada vez; por eso se reengancha aquí)
        try {
            const btn = this.spaceWeatherOverlay.querySelector('#toggle-sat-labels');
            if (btn) {
                btn.onclick = () => {
                    this.setLabelsEnabled(!this.labelsEnabled);
                };
            }
        } catch (e) { }
    }

    setLabelsEnabled(enabled) {
        this.labelsEnabled = !!enabled;
        try {
            localStorage.setItem('sat_labels_enabled', this.labelsEnabled ? '1' : '0');
        } catch (e) { }
        this.applySatelliteLabels();
        // refrescar overlay para que cambie el texto del botón
        if (this.kpData) {
            this.updateSpaceWeatherOverlay({
                kp: this.kpData.kp,
                kpTime: this.kpData.kpTime,
                series: this.kpData.series,
                aurora: this.lastAurora
            });
        }
    }

    applySatelliteLabels() {
        if (!this.extraSatellites || this.extraSatellites.size === 0) return;
        for (const s of this.extraSatellites.values()) {
            const marker = s.marker;
            if (!marker) continue;
            // Leaflet no permite alternar permanent fácilmente en el mismo tooltip,
            // así que lo re-creamos cuando cambia el modo.
            try {
                marker.unbindTooltip();
            } catch (e) { }
            const label = `${s.name || 'SAT'} • ${s.noradId || ''}`.trim();
            try {
                marker.bindTooltip(label, {
                    permanent: this.labelsEnabled,
                    direction: 'top',
                    offset: [0, -6],
                    opacity: 0.9,
                    className: 'sat-label-tooltip'
                });
            } catch (e) { }
        }
    }

    describeKp(kp) {
        if (!Number.isFinite(kp)) return { levelText: 'sin datos', color: '#9ca3af' };
        // Umbrales estándar aproximados
        if (kp < 3) return { levelText: 'calmo', color: '#34d399' };
        if (kp < 5) return { levelText: 'inestable', color: '#fbbf24' };
        if (kp < 6) return { levelText: 'tormenta menor', color: '#fb923c' };
        if (kp < 7) return { levelText: 'tormenta moderada', color: '#f87171' };
        if (kp < 8) return { levelText: 'tormenta fuerte', color: '#ef4444' };
        if (kp < 9) return { levelText: 'tormenta severa', color: '#c084fc' };
        return { levelText: 'extrema', color: '#a78bfa' };
    }

    drawKpSparkline(canvas, points) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const vals = points.map(p => p.v).filter(v => Number.isFinite(v));
        if (vals.length < 2) return;
        const min = 0;
        const max = 9;

        const w = canvas.width;
        const h = canvas.height;
        const pad = 3;

        const xFor = (i) => pad + (i * (w - pad * 2)) / (vals.length - 1);
        const yFor = (v) => pad + (1 - (v - min) / (max - min)) * (h - pad * 2);

        // línea
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(167,139,250,0.9)';
        ctx.beginPath();
        vals.forEach((v, i) => {
            const x = xFor(i);
            const y = yFor(v);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // puntos
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        vals.forEach((v, i) => {
            const x = xFor(i);
            const y = yFor(v);
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    updateAuroraLayer(aurora) {
        if (!this.map || !window.L) return;
        if (!aurora || typeof aurora !== 'object') return;
        const coords = Array.isArray(aurora.coordinates) ? aurora.coordinates : [];
        if (!coords.length) return;

        // Crear layer si no existe
        if (!this.auroraLayer) {
            this.auroraLayer = this.createAuroraLayer();
            this.auroraLayer.addTo(this.map);
        }

        // Preparar puntos [lon, lat, value]
        const threshold = 15; // filtrar ruido
        let pts = coords.filter(p => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && typeof p[2] === 'number' && p[2] >= threshold);
        // Limitar cantidad
        const maxPts = 8000;
        if (pts.length > maxPts) {
            const step = Math.ceil(pts.length / maxPts);
            pts = pts.filter((_, i) => i % step === 0);
        }
        this.auroraLayer.setData(pts);
    }

    createAuroraLayer() {
        // Layer canvas simple (sin dependencias extra)
        const layer = L.layerGroup();

        const CanvasLayer = L.Layer.extend({
            initialize: function () {
                this._canvas = document.createElement('canvas');
                this._ctx = this._canvas.getContext('2d');
                this._data = [];
            },
            onAdd: function (map) {
                this._map = map;
                const pane = map.getPanes().overlayPane;
                this._canvas.style.position = 'absolute';
                this._canvas.style.top = '0';
                this._canvas.style.left = '0';
                this._canvas.style.pointerEvents = 'none';
                this._canvas.style.zIndex = '300';
                pane.appendChild(this._canvas);
                map.on('move zoom resize', this._reset, this);
                this._reset();
            },
            onRemove: function (map) {
                map.off('move zoom resize', this._reset, this);
                if (this._canvas && this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
            },
            setData: function (data) {
                this._data = data || [];
                this._draw();
            },
            _reset: function () {
                if (!this._map) return;
                const size = this._map.getSize();
                this._canvas.width = size.x;
                this._canvas.height = size.y;
                // Anclar al pane (Leaflet mueve los panes internamente)
                if (window.L && L.DomUtil && typeof L.DomUtil.setPosition === 'function' && this._map._getMapPanePos) {
                    L.DomUtil.setPosition(this._canvas, this._map._getMapPanePos());
                }
                this._draw();
            },
            _colorFor: function (v) {
                // v ~ 0..100 : gradiente verde->cian->violeta
                const t = Math.max(0, Math.min(1, (v - 10) / 60));
                const r = Math.round(20 + 140 * t);
                const g = Math.round(220 - 80 * t);
                const b = Math.round(120 + 135 * t);
                const a = Math.max(0.08, Math.min(0.55, v / 120));
                return `rgba(${r},${g},${b},${a})`;
            },
            _draw: function () {
                const ctx = this._ctx;
                if (!ctx || !this._map) return;
                ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
                if (!this._data || !this._data.length) return;

                const zoom = this._map.getZoom();
                const radius = zoom >= 4 ? 4 : (zoom >= 3 ? 3 : 2);

                for (let i = 0; i < this._data.length; i++) {
                    const item = this._data[i];
                    const lon = item[0];
                    const lat = item[1];
                    const v = item[2];
                    const p = this._map.latLngToContainerPoint([lat, lon]);
                    ctx.fillStyle = this._colorFor(v);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        const canvasLayer = new CanvasLayer();
        // “bridge” para llamar setData desde fuera
        layer.setData = (data) => canvasLayer.setData(data);
        layer.addLayer(canvasLayer);
        return layer;
    }

    // ---------------------------
    // Satélites extra (TLE + satellite.js)
    // ---------------------------

    async ensureSatelliteJs() {
        if (window.satellite && typeof window.satellite.twoline2satrec === 'function') return true;
        // Reusar promise global si ya está cargando
        if (window.__satelliteJsLoadingPromise) {
            return await window.__satelliteJsLoadingPromise;
        }

        window.__satelliteJsLoadingPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve(false);
            }, 20000);

            const done = (ok) => {
                clearTimeout(timeout);
                // limpiar para permitir reintento en futuras cargas si falló
                window.__satelliteJsLoadingPromise = null;
                resolve(ok);
            };

            const existing = document.getElementById('satellitejs-lib');
            if (existing) {
                // Si existe pero no cargó (o cargó 404), remover y reintentar
                try { existing.remove(); } catch (e) { }
            }

            const tryUrls = [
                'https://unpkg.com/satellite.js@6.0.2/dist/satellite.min.js',
                'https://cdn.jsdelivr.net/npm/satellite.js@6.0.2/dist/satellite.min.js'
            ];

            const script = document.createElement('script');
            script.id = 'satellitejs-lib';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';

            let idx = 0;
            const loadNext = () => {
                if (idx >= tryUrls.length) return done(false);
                script.src = tryUrls[idx++];
                // forzar recarga si el browser cachea un error raro
                try { document.body.appendChild(script); } catch (e) { }
            };

            script.onload = () => {
                const ok = !!(window.satellite && typeof window.satellite.twoline2satrec === 'function');
                done(ok);
            };
            script.onerror = () => {
                // intentar siguiente CDN
                loadNext();
            };

            loadNext();
        });

        return await window.__satelliteJsLoadingPromise;
    }

    async initExtraSatellites() {
        if (!this.map || !window.L) return;
        const ok = await this.ensureSatelliteJs();
        if (!ok) {
            console.warn('[Satélites] satellite.js no disponible; se omiten satélites extra');
            return;
        }

        // Cargar TLEs (HTTPS, sin key) desde CelesTrak (grupo "visual")
        const tleText = await this.fetchTleFromCelestrak('visual');
        if (!tleText) return;

        const entries = this.parseTleText(tleText)
            .filter(e => e && e.line1 && e.line2)
            .slice(0, this.maxExtraSatellites);

        entries.forEach((e) => {
            const noradId = this.extractNoradId(e.line1);
            if (!noradId) return;
            if (this.extraSatellites.has(noradId)) return;

            const satrec = window.satellite.twoline2satrec(e.line1, e.line2);
            const name = (e.name || `SAT-${noradId}`).trim();

            const icon = L.divIcon({
                className: 'extra-sat-marker',
                html: `<div title="${this.escapeHtml(name)}" style="font-size:16px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.25));">🛰️</div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            // Posición inicial (si falla, caer al centro del mapa)
            const p0 = this.propagateToLatLon(satrec, new Date());
            const lat = p0?.lat ?? 0;
            const lon = p0?.lon ?? 0;
            const alt = p0?.heightKm ?? null;

            const marker = L.marker([lat, lon], { icon }).addTo(this.map);
            marker.bindPopup(`
                <div style="font-family:'Inter',sans-serif; min-width: 220px;">
                    <div style="font-weight:800; color:#fff;">🛰️ ${this.escapeHtml(name)}</div>
                    <div style="margin-top:6px; color: rgba(255,255,255,.75); font-size:12px;">
                        NORAD: <b>${noradId}</b><br>
                        Lat: <b>${lat.toFixed(2)}°</b> &nbsp; Lon: <b>${lon.toFixed(2)}°</b><br>
                        Altitud: <b>${alt !== null ? alt.toFixed(0) + ' km' : '—'}</b>
                    </div>
                </div>
            `);

            this.extraSatellites.set(noradId, { name, noradId, satrec, marker });
        });

        // Aplicar etiquetas según preferencia (hover o permanente)
        this.applySatelliteLabels();

        // Actualizar panel para reflejar cantidad de satélites extra inmediatamente
        if (this.kpData) {
            this.updateSpaceWeatherOverlay({
                kp: this.kpData.kp,
                kpTime: this.kpData.kpTime,
                series: this.kpData.series,
                aurora: this.lastAurora
            });
        }
        // primer update para posicionar bien
        this.updateExtraSatellites();
    }

    async fetchTleFromCelestrak(group) {
        // IMPORTANTE:
        // - CelesTrak bloquea CORS desde el navegador (habilispro.com), por eso proxyamos vía control-server.
        // - Evitar https://www.celestrak.org (certificado inválido en algunos navegadores).
        const url = `/control-api/api/space/tle?group=${encodeURIComponent(group)}`;
        try {
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) {
                const body = await r.text().catch(() => '');
                console.warn('[Satélites] Proxy TLE error:', r.status, body.slice(0, 200));
                return null;
            }
            const t = await r.text();
            if (t && t.length > 100) return t;
        } catch (e) {
            console.warn('[Satélites] Proxy TLE fetch failed:', e?.message || e);
        }
        console.warn('[Satélites] No se pudo cargar TLE (proxy)');
        return null;
    }

    parseTleText(text) {
        const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean);
        const out = [];
        let i = 0;
        while (i < lines.length) {
            const a = lines[i];
            // formato con nombre: NAME + line1 + line2
            if (a && !a.startsWith('1 ') && !a.startsWith('2 ') && (i + 2) < lines.length && lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
                out.push({ name: a, line1: lines[i + 1], line2: lines[i + 2] });
                i += 3;
                continue;
            }
            // formato sin nombre: line1 + line2
            if (a && a.startsWith('1 ') && (i + 1) < lines.length && lines[i + 1].startsWith('2 ')) {
                out.push({ name: '', line1: a, line2: lines[i + 1] });
                i += 2;
                continue;
            }
            i += 1;
        }
        return out;
    }

    extractNoradId(line1) {
        // TLE line1: "1 25544U ..."
        const m = String(line1 || '').match(/^1\s+(\d{1,6})/);
        return m ? m[1] : null;
    }

    propagateToLatLon(satrec, date) {
        try {
            const sat = window.satellite;
            const pv = sat.propagate(satrec, date);
            if (!pv || !pv.position) return null;
            const gmst = sat.gstime(date);
            const gd = sat.eciToGeodetic(pv.position, gmst);
            const lat = sat.degreesLat(gd.latitude);
            const lon = sat.degreesLong(gd.longitude);
            const heightKm = gd.height;
            return { lat, lon, heightKm };
        } catch (e) {
            return null;
        }
    }

    updateExtraSatellites() {
        if (!this.map || !window.L) return;
        if (!this.extraSatellites || this.extraSatellites.size === 0) return;
        if (!window.satellite) return;

        const now = new Date();
        for (const [noradId, s] of this.extraSatellites.entries()) {
            const p = this.propagateToLatLon(s.satrec, now);
            if (!p) continue;
            const ll = [p.lat, p.lon];
            try {
                s.marker.setLatLng(ll);
            } catch (e) { }
        }
    }

    updateExtraSatellitesOverlay() {
        // obsoleto: ahora se muestra dentro del HTML del panel en updateSpaceWeatherOverlay()
        return;
    }

    escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateSpeed(lat, lon) {
        if (!this.lastPosition || !this.lastPosition.timestamp) {
            return 27600; // Velocidad promedio de la ISS
        }
        
        const distance = this.calculateDistance(this.lastPosition.lat, this.lastPosition.lon, lat, lon);
        const timeDiff = (Date.now() - this.lastPosition.timestamp) / 1000; // segundos
        const speed = timeDiff > 0 ? (distance / timeDiff) * 3600 : 27600; // km/h
        
        return speed;
    }

    startAnimations() {
        const animate = () => {
            // Animar pulso en el marcador de la ISS
            if (this.issMarker) {
                const time = Date.now();
                const pulse = 0.9 + 0.1 * Math.sin(time / 500);
                const icon = this.issMarker.options.icon;
                if (icon && icon.options) {
                    const size = 14 * pulse;
                    const shadow = 15 * pulse;
                    const html = `<div style="background: #00ffff; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 ${shadow}px #00ffff, 0 0 ${shadow * 2}px #00ffff;"></div>`;
                    icon.options.html = html;
                    icon.options.iconSize = [size, size];
                    icon.options.iconAnchor = [size/2, size/2];
                    this.issMarker.setIcon(icon);
                }
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando los satélites que orbitan nuestro planeta. La Estación Espacial Internacional, un laboratorio flotante donde humanos viven y trabajan en el espacio, orbitando la Tierra cada 90 minutos a más de 27,000 kilómetros por hora. La línea muestra su trayectoria orbital. Es un símbolo de nuestra capacidad de explorar más allá de nuestro mundo.';
        
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
                console.warn('[Satélites] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            // Usar la última posición si ya fue cargada; si no, pedir a API HTTPS
            let lat = this.lastPosition?.lat ?? 0;
            let lon = this.lastPosition?.lon ?? 0;
            if (!this.lastPosition) {
                const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { cache: 'no-store' });
                const data = await response.json();
                if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                    lat = data.latitude;
                    lon = data.longitude;
                }
            }
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando la posición de la Estación Espacial Internacional orbitando la Tierra, actualmente sobre las coordenadas ${lat.toFixed(2)}° de latitud y ${lon.toFixed(2)}° de longitud. La línea azul muestra su trayectoria orbital, completando una vuelta alrededor del planeta cada 90 minutos a más de 27,000 kilómetros por hora.

Genera una narrativa reflexiva en primera persona sobre:
- La Estación Espacial Internacional como símbolo de exploración humana
- Cómo orbitamos nuestro planeta cada 90 minutos
- La perspectiva única que ofrece estar en el espacio
- La conexión entre la Tierra y el espacio
- El futuro de la exploración espacial
- Cómo la trayectoria orbital muestra nuestro movimiento constante

El texto debe ser reflexivo, poético y entre 150 y 220 palabras.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.narrative && data.narrative.length > 100) {
                    return data.narrative;
                }
            }
        } catch (e) {
            console.warn('[Satélites] Error generando narrativa:', e);
        }
        
        return `Desde aquí arriba, puedo ver cómo la Estación Espacial Internacional orbita nuestro planeta, completando una vuelta cada 90 minutos. La trayectoria que se dibuja muestra su camino constante alrededor de la Tierra, moviéndose a más de 27,000 kilómetros por hora. Es un recordatorio de que los humanos no solo habitamos la Tierra, sino que también exploramos más allá. Esta pequeña ciudad flotante en el espacio es un símbolo de nuestra curiosidad, nuestra capacidad de superar límites, y nuestro deseo de entender el universo. Cada órbita es un paso más en nuestro viaje cósmico.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Satélites] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'terremotos'];
                    const currentPage = 'satelites';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Satélites] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    // Contexto para recaps (sin inventar)
    getRecapContext() {
        try {
            const ctx = {
                iss: this.lastPosition ? {
                    lat: Number(this.lastPosition.lat?.toFixed?.(2) ?? this.lastPosition.lat),
                    lon: Number(this.lastPosition.lon?.toFixed?.(2) ?? this.lastPosition.lon),
                    ts: this.lastPosition.timestamp || null
                } : null,
                kp: this.kpData ? {
                    kp: this.kpData.kp,
                    time: this.kpData.kpTime || null
                } : null,
                extraSatellites: this.extraSatellites ? this.extraSatellites.size : 0
            };
            return ctx;
        } catch (e) {
            return null;
        }
    }

    unmount() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.spaceWeatherInterval) {
            clearInterval(this.spaceWeatherInterval);
        }
        if (this.extraSatellitesInterval) {
            clearInterval(this.extraSatellitesInterval);
        }
        // Remover marcadores extra explícitamente
        if (this.extraSatellites && this.map) {
            for (const s of this.extraSatellites.values()) {
                try { this.map.removeLayer(s.marker); } catch (e) { }
            }
            this.extraSatellites.clear();
        }
        if (this.map) {
            this.map.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
