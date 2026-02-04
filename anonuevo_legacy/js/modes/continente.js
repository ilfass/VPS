import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';
import { COUNTRY_INFO } from '../data/country-info.js';

const CONTINENT_MAP = {
    '032': 'América del Sur', '076': 'América del Sur', '152': 'América del Sur', '170': 'América del Sur',
    '218': 'América del Sur', '484': 'América del Norte', '604': 'América del Sur', '840': 'América del Norte',
    '858': 'América del Sur', '124': 'América del Norte', '724': 'Europa', '250': 'Europa', '380': 'Europa',
    '826': 'Europa', '276': 'Europa', '528': 'Europa', '616': 'Europa'
};

function fmt(n) {
    try { return new Intl.NumberFormat('es-AR').format(Number(n || 0)); } catch (e) { return String(n || 0); }
}

export default class ContinenteMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;
        this.model = null;
        this._timer = null;
        this._continentIdx = 0;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'continente',
            title: 'CONTINENTE',
            subtitle: 'Ranking vivo por región (inicio → hallazgo → cierre)',
            accent: '#4a9eff'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('tl');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 10000 });

        try { eventManager.reportTelemetry('CONTINENTE', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Agrupando países por continente…');

        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0; padding: 16px;">
                <div style="position:absolute; inset:16px; border-radius: 16px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.20); backdrop-filter: blur(10px); overflow:hidden;">
                    <div style="display:grid; grid-template-rows:auto 1fr; height:100%;">
                        <div style="padding:14px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; gap:10px;">
                            <div>
                                <div id="cont-title" style="font-weight:900; color: rgba(255,255,255,0.90);">—</div>
                                <div id="cont-sub" style="margin-top:4px; font-size:12px; color: rgba(255,255,255,0.55);">—</div>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <div class="pill" style="font-family:'JetBrains Mono', monospace; font-size:12px; padding:8px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.78);">
                                    VISITAS <span id="cont-visits" style="color: rgba(255,255,255,0.92); font-weight:900;">—</span>
                                </div>
                            </div>
                        </div>
                        <div style="padding: 14px; overflow:hidden;">
                            <div id="cont-bars" style="display:flex; flex-direction:column; gap:10px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.titleEl = this.scene.main.querySelector('#cont-title');
        this.subEl = this.scene.main.querySelector('#cont-sub');
        this.visitsEl = this.scene.main.querySelector('#cont-visits');
        this.barsEl = this.scene.main.querySelector('#cont-bars');

        await this.runBuild();
        this.rotateContinent(true);
        this._timer = setInterval(() => this.rotateContinent(), 22000);
        this.scheduleNextPage();
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Leyendo memorias', async () => {
                this.model = await this.loadModel();
                this.scene.addCard({ k: 'CONTINENTES', v: String(this.model.continents.length) });
            })
            .addStep('Detectando top por visitas', async () => {
                const top = this.model.continents[0];
                if (top) this.scene.addCard({ k: 'TOP', v: top.name });
                this.scene.sfx?.woosh?.();
            })
            .addStep('Listo para rotar', async () => {
                this.scene.sfx?.reveal?.();
            }, { delayMs: 420 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Continentes listos: cada bloque se convierte en un mini-arco.');
        try { avatarSubtitlesManager.updateSubtitles('Ahora miramos el viaje por regiones. Cada continente cuenta su propio ritmo.', 2.4); } catch (e) { }
    }

    async loadModel() {
        const res = await fetch('/control-api/api/country-memory');
        const data = res.ok ? await res.json() : { memories: [] };
        const memories = data.memories || [];

        const groups = new Map(); // continent -> {name, totalVisits, countries[]}
        memories.forEach(m => {
            const id = m.countryId;
            const info = COUNTRY_INFO[id];
            if (!info) return;
            const cont = CONTINENT_MAP[id] || 'Otros';
            if (!groups.has(cont)) groups.set(cont, { name: cont, totalVisits: 0, countries: [] });
            const g = groups.get(cont);
            const visits = Number(m.totalVisits || 0);
            g.totalVisits += visits;
            g.countries.push({ id, name: info.name, visits });
        });

        const continents = Array.from(groups.values())
            .map(c => ({ ...c, countries: c.countries.sort((a, b) => b.visits - a.visits) }))
            .sort((a, b) => b.totalVisits - a.totalVisits);

        if (!continents.length) {
            continents.push({ name: 'Otros', totalVisits: 0, countries: [] });
        }
        return { continents };
    }

    rotateContinent(isFirst = false) {
        if (!this.model) return;
        const c = this.model.continents[this._continentIdx % this.model.continents.length];
        this._continentIdx++;

        this.titleEl.textContent = c.name.toUpperCase();
        this.subEl.textContent = `Inicio → Hallazgo → Cierre · países con más visitas en ${c.name}`;
        this.visitsEl.textContent = fmt(c.totalVisits);

        this.barsEl.innerHTML = '';
        const max = Math.max(1, ...c.countries.map(x => x.visits));
        const list = (c.countries.length ? c.countries : [{ name: 'Sin datos aún', visits: 0 }]).slice(0, 8);

        list.forEach((p, idx) => {
            const pct = Math.round((p.visits / max) * 100);
            const row = document.createElement('div');
            row.style.cssText = `border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.05); border-radius: 14px; padding: 10px 10px; overflow:hidden;`;
            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:baseline;">
                    <div style="font-weight:900; color: rgba(255,255,255,0.88); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">#${idx + 1} ${p.name}</div>
                    <div style="font-family:'JetBrains Mono', monospace; color: rgba(255,255,255,0.55); font-size:12px;">${fmt(p.visits)}</div>
                </div>
                <div style="margin-top:8px; height:10px; border-radius:999px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10); overflow:hidden;">
                    <div style="height:100%; width:${pct}%; background: linear-gradient(90deg, rgba(74,158,255,0.70), rgba(168,85,247,0.60));"></div>
                </div>
            `;
            this.barsEl.appendChild(row);
        });

        // Mini-arco en ticker
        const beats = [
            `Inicio: entramos en ${c.name}.`,
            `Hallazgo: ${list[0]?.name || 'sin datos'} lidera el ritmo de visitas.`,
            `Cierre: cuando cambie la aguja, cambia el relato.`
        ];
        const msg = beats[(this._continentIdx - 1) % beats.length];
        this.scene.setTicker(msg);
        try { this.scene.sfx?.tick?.(); } catch (e) { }
        if (isFirst) {
            try { avatarSubtitlesManager.updateSubtitles(msg, 2.6); } catch (e) { }
        }
    }

    getRecapContext() {
        try {
            const c = this.model?.continents?.[(this._continentIdx - 1) % this.model.continents.length];
            return {
                continent: c?.name || null,
                totalVisits: c?.totalVisits || 0,
                topCountry: c?.countries?.[0]?.name || null
            };
        } catch (e) {
            return {};
        }
    }

    scheduleNextPage() {
        if (window.__autoNavSchedule) return window.__autoNavSchedule('continente');
    }

    unmount() {
        if (this._timer) clearInterval(this._timer);
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}

