import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';
import { COUNTRY_INFO } from '../data/country-info.js';

function fmt(n) {
    try { return new Intl.NumberFormat('es-AR').format(Number(n || 0)); } catch (e) { return String(n || 0); }
}

export default class EstadisticasMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;
        this.stats = null;
        this._cycleTimer = null;
        this._cycleIdx = 0;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'estadisticas',
            title: 'ESTADÍSTICAS',
            subtitle: 'El viaje se convierte en números (en vivo)',
            accent: '#4a9eff'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('bl');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 12000 });

        try { eventManager.reportTelemetry('ESTADISTICAS', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Convirtiendo memorias en señales…');

        this.scene.main.innerHTML = `
            <div id="stats-wrap" style="position:absolute; inset:0; padding: 16px;">
                <div style="position:absolute; inset:16px; border-radius: 16px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.20); backdrop-filter: blur(10px); overflow:hidden;">
                    <div style="display:grid; grid-template-rows:auto 1fr; height:100%;">
                        <div style="padding:14px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; gap:10px;">
                            <div style="font-weight:900; color: rgba(255,255,255,0.88);">Panel de métricas</div>
                            <div id="stats-note" style="font-size:12px; color: rgba(255,255,255,0.55);">—</div>
                        </div>
                        <div style="padding: 14px; overflow:hidden; display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
                            <div style="border-radius: 14px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); padding: 12px; overflow:hidden;">
                                <div style="font-size:11px; letter-spacing:0.14em; font-weight:900; color: rgba(255,255,255,0.55);">CONTINENTES (visitas)</div>
                                <div id="chart-continents" style="margin-top: 10px; display:flex; flex-direction:column; gap:10px;"></div>
                            </div>
                            <div style="border-radius: 14px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); padding: 12px; overflow:hidden;">
                                <div style="font-size:11px; letter-spacing:0.14em; font-weight:900; color: rgba(255,255,255,0.55);">TOP PAÍSES (visitas)</div>
                                <div id="chart-top" style="margin-top: 10px; display:flex; flex-direction:column; gap:10px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.noteEl = this.scene.main.querySelector('#stats-note');
        this.contEl = this.scene.main.querySelector('#chart-continents');
        this.topEl = this.scene.main.querySelector('#chart-top');

        await this.runBuild();
        this.render();
        this.startCycle();

        // Delegar navegación a agenda editorial
        this.scheduleNextPage();
    }

    async runBuild() {
        this.builder.clear();
        this.scene.setStatus('BUILD');

        this.builder
            .addStep('Cargando memorias', async () => {
                this.stats = await this.loadStats();
                this.scene.addCard({ k: 'PAÍSES', v: fmt(this.stats.totalCountries) });
                this.scene.addCard({ k: 'VISITAS', v: fmt(this.stats.totalVisits) });
            })
            .addStep('Agrupando por continente', async () => {
                const top = this.stats.continents[0];
                if (top) this.scene.addCard({ k: 'TOP CONTINENTE', v: `${top.name}` });
                this.scene.sfx?.woosh?.();
            })
            .addStep('Armando rankings', async () => {
                const t = this.stats.topCountries[0];
                if (t) this.scene.addCard({ k: 'TOP PAÍS', v: `${t.name}` });
                this.scene.sfx?.reveal?.();
            }, { delayMs: 450 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Estadísticas listas: observar patrones también es viajar.');

        try {
            avatarSubtitlesManager.updateSubtitles(
                'Las memorias del viaje se vuelven señales: continentes, frecuencia, y un top que cambia con el tiempo.',
                2.4
            );
        } catch (e) { }
    }

    async loadStats() {
        const res = await fetch('/control-api/api/country-memory');
        const data = res.ok ? await res.json() : { memories: [] };
        const memories = data.memories || [];

        const continentsMap = new Map(); // name -> visits
        const topCountries = [];

        // Mapeo simple por regiones (si no está, cae en Otros)
        const CONTINENT_MAP = {
            '032': 'América del Sur', '076': 'América del Sur', '152': 'América del Sur', '170': 'América del Sur',
            '218': 'América del Sur', '484': 'América del Norte', '604': 'América del Sur', '840': 'América del Norte',
            '858': 'América del Sur', '124': 'América del Norte', '724': 'Europa', '250': 'Europa', '380': 'Europa',
            '826': 'Europa', '276': 'Europa', '528': 'Europa', '616': 'Europa'
        };

        let totalVisits = 0;
        memories.forEach(m => {
            const visits = Number(m.totalVisits || 0);
            totalVisits += visits;

            const cont = CONTINENT_MAP[m.countryId] || 'Otros';
            continentsMap.set(cont, (continentsMap.get(cont) || 0) + visits);

            const info = COUNTRY_INFO[m.countryId];
            if (info) {
                topCountries.push({ id: m.countryId, name: info.name, visits });
            }
        });

        const continents = Array.from(continentsMap.entries())
            .map(([name, visits]) => ({ name, visits }))
            .sort((a, b) => b.visits - a.visits);

        topCountries.sort((a, b) => b.visits - a.visits);

        return {
            totalCountries: memories.length,
            totalVisits,
            continents,
            topCountries: topCountries.slice(0, 8)
        };
    }

    render() {
        if (!this.stats) return;

        // Continentes
        this.contEl.innerHTML = '';
        const maxC = Math.max(1, ...this.stats.continents.map(x => x.visits));
        this.stats.continents.slice(0, 6).forEach((c, idx) => {
            const row = document.createElement('div');
            const pct = Math.round((c.visits / maxC) * 100);
            row.style.cssText = `display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:center;`;
            row.innerHTML = `
                <div>
                    <div style="display:flex; justify-content:space-between; gap:10px; font-size:12px; color: rgba(255,255,255,0.80); font-weight:800;">
                        <span>${c.name}</span>
                        <span style="color: rgba(255,255,255,0.55); font-weight:700;">${fmt(c.visits)}</span>
                    </div>
                    <div style="margin-top:6px; height:10px; border-radius:999px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); overflow:hidden;">
                        <div style="height:100%; width:${pct}%; background: linear-gradient(90deg, rgba(74,158,255,0.70), rgba(168,85,247,0.65)); box-shadow:0 0 14px rgba(74,158,255,0.18);"></div>
                    </div>
                </div>
                <div style="font-family:'JetBrains Mono', monospace; font-size:12px; color: rgba(255,255,255,0.45);">#${idx + 1}</div>
            `;
            this.contEl.appendChild(row);
        });

        // Top países
        this.topEl.innerHTML = '';
        const maxP = Math.max(1, ...this.stats.topCountries.map(x => x.visits));
        this.stats.topCountries.forEach((c, idx) => {
            const row = document.createElement('div');
            const pct = Math.round((c.visits / maxP) * 100);
            row.style.cssText = `display:flex; align-items:center; gap:10px;`;
            row.innerHTML = `
                <div style="width:34px; height:34px; border-radius:10px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-weight:900; color: rgba(255,255,255,0.80);">#${idx + 1}</div>
                <div style="flex:1; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; gap:10px; font-size:12px; color: rgba(255,255,255,0.80); font-weight:800;">
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</span>
                        <span style="color: rgba(255,255,255,0.55); font-weight:700;">${fmt(c.visits)}</span>
                    </div>
                    <div style="margin-top:6px; height:8px; border-radius:999px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10); overflow:hidden;">
                        <div style="height:100%; width:${pct}%; background: color-mix(in srgb, var(--tv-accent) 75%, rgba(168,85,247,0.60) 25%);"></div>
                    </div>
                </div>
            `;
            this.topEl.appendChild(row);
        });
    }

    startCycle() {
        if (this._cycleTimer) clearInterval(this._cycleTimer);
        this._cycleTimer = setInterval(() => {
            this._cycleIdx++;
            const beats = [
                'Patrón detectado: el viaje repite rutas, pero no repite historias.',
                'Dato clipable: el ranking cambia con cada visita nueva.',
                'Mini-arco: observar → comparar → cerrar con una promesa.'
            ];
            const msg = beats[this._cycleIdx % beats.length];
            this.noteEl.textContent = msg;
            this.scene.setTicker(msg);
            try { this.scene.sfx?.tick?.(); } catch (e) { }
        }, 14000);
    }

    getRecapContext() {
        try {
            return {
                totalCountries: this.stats?.totalCountries || 0,
                totalVisits: this.stats?.totalVisits || 0,
                topContinent: this.stats?.continents?.[0]?.name || null,
                topCountry: this.stats?.topCountries?.[0]?.name || null
            };
        } catch (e) {
            return {};
        }
    }

    scheduleNextPage() {
        if (window.__autoNavSchedule) return window.__autoNavSchedule('estadisticas');
    }

    unmount() {
        if (this._cycleTimer) clearInterval(this._cycleTimer);
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}

