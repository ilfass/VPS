import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { NarratorDirector } from '../utils/narrator-director.js';

export default class GaleriaMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.builder = null;
        this.narratorDirector = null;
        this.media = [];
        this.idx = 0;
        this._timer = null;
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'galeria',
            title: 'GALERÍA',
            subtitle: 'Imágenes y clips como “bumpers” visuales',
            accent: '#a855f7'
        });
        this.container.appendChild(this.scene.root);

        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('tr');

        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 11000 });

        try { eventManager.reportTelemetry('GALERIA', 'GLOBAL', 0); } catch (e) { }

        this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });
        this.scene.setStatus('BUILD');
        this.scene.setTicker('Buscando material visual…');

        this.scene.main.innerHTML = `
            <div style="position:absolute; inset:0;">
                <div id="media-stage" style="position:absolute; inset:0; background:#000;">
                    <div id="media-bg" style="position:absolute; inset:-10%; background-size:cover; background-position:center; filter: blur(18px) brightness(0.55); transform: scale(1.05);"></div>
                    <div id="media-main" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding: 18px;">
                        <div id="media-frame" style="width:min(1200px, 94%); height:min(70vh, 720px); border-radius: 20px; overflow:hidden; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.55); box-shadow: 0 30px 120px rgba(0,0,0,0.65); position:relative;">
                            <img id="media-img" style="width:100%; height:100%; object-fit: cover; transform: scale(1.02); opacity:0; transition: opacity 420ms ease, transform 12s ease;" />
                            <div id="media-overlay" style="position:absolute; inset:0; background: radial-gradient(circle at 50% 20%, rgba(74,158,255,0.14), rgba(0,0,0,0) 55%);"></div>
                            <div id="media-caption" style="position:absolute; left:14px; right:14px; bottom:14px; padding: 10px 12px; border-radius: 14px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.55); backdrop-filter: blur(10px); color: rgba(255,255,255,0.86); font-size: 13px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                                <div style="display:flex; flex-direction:column; gap:2px;">
                                    <div id="cap-title" style="font-weight:900;">—</div>
                                    <div id="cap-sub" style="color: rgba(255,255,255,0.55); font-size:12px;">—</div>
                                </div>
                                <div id="cap-idx" style="font-family:'JetBrains Mono', monospace; color: rgba(255,255,255,0.55);">0/0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bgEl = this.scene.main.querySelector('#media-bg');
        this.imgEl = this.scene.main.querySelector('#media-img');
        this.capTitle = this.scene.main.querySelector('#cap-title');
        this.capSub = this.scene.main.querySelector('#cap-sub');
        this.capIdx = this.scene.main.querySelector('#cap-idx');

        await this.runBuild();
        this.showCurrent();
        this._timer = setInterval(() => this.next(), 18000);
        this.scheduleNextPage();
    }

    async runBuild() {
        this.builder.clear();
        this.builder
            .addStep('Listando media', async () => {
                this.media = await this.loadMedia();
                this.scene.addCard({ k: 'ITEMS', v: String(this.media.length) });
            })
            .addStep('Preparando escena', async () => {
                this.scene.sfx?.woosh?.();
            })
            .addStep('Listo', async () => {
                this.scene.sfx?.reveal?.();
            }, { delayMs: 420 });

        await this.builder.start();
        this.scene.setStatus('LIVE');
        this.scene.setTicker('Galería activa: una imagen que respira, y un narrador que acompaña.');
        try { avatarSubtitlesManager.updateSubtitles('Galería activa. Una imagen por vez, con ritmo de televisión.', 2.5); } catch (e) { }
    }

    async loadMedia() {
        const items = [];
        try {
            const res = await fetch('/control-api/api/media-list');
            if (res.ok) {
                const data = await res.json();
                const raw = data?.media || data?.files || [];
                raw.forEach(u => {
                    const url = typeof u === 'string' ? u : u?.url;
                    if (!url) return;
                    const type = (u?.type || '').includes('video') ? 'video' : 'image';
                    items.push({ url, type, title: u?.country || u?.context || 'Viaje', sub: u?.context || 'Media' });
                });
            }
        } catch (e) { }

        // Fallback: una imagen curada si existe
        if (!items.length) {
            items.push({ url: '/media/Argentina/Perito_Moreno_Glacier_2023.jpg', type: 'image', title: 'Perito Moreno', sub: 'Fallback curado' });
        }

        // Mezclar un poco
        return items.sort(() => Math.random() - 0.5).slice(0, 50);
    }

    showCurrent() {
        const item = this.media[this.idx % Math.max(1, this.media.length)];
        if (!item) return;

        const total = this.media.length || 0;
        if (this.capIdx) this.capIdx.textContent = `${(this.idx % Math.max(1, total)) + 1}/${Math.max(1, total)}`;

        this.scene.setTicker(`Galería: ${item.title} · ${item.sub}`);
        this.capTitle.textContent = item.title || 'Viaje';
        this.capSub.textContent = item.sub || '';

        // Solo imagen por ahora (stream-friendly)
        if (this.imgEl) {
            this.imgEl.style.opacity = '0';
            this.imgEl.style.transform = 'scale(1.02)';
            this.imgEl.onload = () => {
                requestAnimationFrame(() => {
                    this.imgEl.style.opacity = '1';
                    // Ken Burns suave
                    this.imgEl.style.transform = 'scale(1.10)';
                });
            };
            this.imgEl.onerror = () => {
                this.imgEl.style.opacity = '0.75';
            };
            this.imgEl.src = item.url;
        }
        if (this.bgEl) this.bgEl.style.backgroundImage = `url(${item.url})`;
        try { this.scene.sfx?.reveal?.(); } catch (e) { }
    }

    next() {
        this.idx = (this.idx + 1) % Math.max(1, this.media.length);
        this.showCurrent();
        if (this.idx % 2 === 0) this.narratorDirector?.moveRandom?.();
    }

    getRecapContext() {
        try {
            return {
                totalMedia: this.media?.length || 0,
                currentTitle: this.media?.[this.idx]?.title || null
            };
        } catch (e) {
            return {};
        }
    }

    scheduleNextPage() {
        if (window.__autoNavSchedule) return window.__autoNavSchedule('galeria');
    }

    unmount() {
        if (this._timer) clearInterval(this._timer);
        try { this.builder?.stop?.(); } catch (e) { }
        try { this.narratorDirector?.stop?.(); } catch (e) { }
        try { this.scene?.destroy?.(); } catch (e) { }
        this.container.innerHTML = '';
    }
}

