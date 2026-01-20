import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';

export default class DiarioMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.entries = [];
        this.lastUpdatedAt = null;
        this.refreshTimer = null;
        this.focusTimer = null;
        this.focusIndex = 0;
    }

    async mount() {
        console.log('[Diario] Montando página de diario...');

        // Asegurar polling global (música / navegación / automode)
        if (!eventManager.pollInterval) eventManager.init();

        // Audio ambiente (controlado globalmente por preferencia persistente)
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        // UI (sin borrar el overlay de avatar después)
        this.container.innerHTML = '';
        this.buildUI();

        // Avatar y subtítulos por encima del contenido
        avatarSubtitlesManager.init(this.container);
        avatarSubtitlesManager.show();

        // Cargar datos, render y arrancar loop “LIVE”
        await this.refreshEntries({ isInitial: true });
        this.startLiveLoop();

        // Narración (después de tener contenido visible)
        await this.startNarration();
    }

    buildUI() {
        const root = document.createElement('div');
        root.id = 'diary-root';
        root.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            background: radial-gradient(1200px 600px at 20% 10%, rgba(74, 158, 255, 0.20), rgba(0,0,0,0)) ,
                        radial-gradient(900px 500px at 80% 20%, rgba(167, 139, 250, 0.16), rgba(0,0,0,0)) ,
                        linear-gradient(135deg, #07070c 0%, #111124 100%);
            color: #e8e8f0;
            font-family: Inter, system-ui, sans-serif;
            overflow: hidden;
        `;

        // Header LIVE
        const header = document.createElement('div');
        header.style.cssText = `
            position: absolute;
            top: 14px;
            left: 14px;
            right: 14px;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            background: rgba(0,0,0,0.50);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 14px;
            backdrop-filter: blur(8px);
        `;
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="display:inline-flex; align-items:center; gap:8px; font-weight:800;">
                        <span style="width:10px; height:10px; border-radius:999px; background:#ef4444; box-shadow:0 0 16px rgba(239,68,68,0.8);"></span>
                        DIARIO • LIVE
                    </span>
                    <span style="color: rgba(255,255,255,0.55); font-size:12px;">Bitácora en tiempo real</span>
                </div>
            </div>
            <div id="diary-meta" style="display:flex; align-items:center; gap:12px; font-size:12px; color: rgba(255,255,255,0.75);">
                <span id="diary-count">Entradas: —</span>
                <span style="opacity:.35;">|</span>
                <span id="diary-updated">Actualizado: —</span>
            </div>
        `;

        // Layout: feed + side
        const layout = document.createElement('div');
        layout.style.cssText = `
            position: absolute;
            inset: 72px 14px 52px 14px;
            display: grid;
            grid-template-columns: 1.3fr 0.7fr;
            gap: 14px;
            z-index: 10;
        `;

        const feed = document.createElement('div');
        feed.id = 'diary-feed';
        feed.style.cssText = `
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(0,0,0,0.30);
            backdrop-filter: blur(8px);
            position: relative;
        `;

        const feedScroll = document.createElement('div');
        feedScroll.id = 'diary-feed-scroll';
        feedScroll.style.cssText = `
            height: 100%;
            overflow: auto;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            scroll-behavior: smooth;
        `;
        feed.appendChild(feedScroll);

        const side = document.createElement('div');
        side.id = 'diary-side';
        side.style.cssText = `
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(0,0,0,0.30);
            backdrop-filter: blur(8px);
            padding: 14px;
            overflow: hidden;
            position: relative;
        `;
        side.innerHTML = `
            <div style="font-weight:800; margin-bottom:10px; color:#4a9eff;">En foco</div>
            <div id="diary-focus" style="color: rgba(255,255,255,0.80); font-size:13px; line-height:1.45;">
                Cargando…
            </div>
            <div style="margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.10);">
                <div style="font-weight:800; margin-bottom:10px; color:#a78bfa;">Señal</div>
                <div style="display:flex; flex-direction:column; gap:10px; font-size:12px; color: rgba(255,255,255,0.75);">
                    <div>Auto-refresh: <b style="color:#fff;">30s</b></div>
                    <div>Auto-focus: <b style="color:#fff;">7s</b></div>
                    <div style="opacity:.7;">Tip: activá Dream Mode para rotar páginas.</div>
                </div>
            </div>
        `;

        layout.appendChild(feed);
        layout.appendChild(side);

        // Ticker inferior (para streaming)
        const ticker = document.createElement('div');
        ticker.id = 'diary-ticker';
        ticker.style.cssText = `
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 14px;
            height: 34px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(0,0,0,0.45);
            backdrop-filter: blur(8px);
            overflow: hidden;
            z-index: 20;
            display:flex;
            align-items:center;
        `;
        ticker.innerHTML = `
            <div style="padding:0 12px; font-weight:800; color: rgba(255,255,255,0.85);">📔</div>
            <div style="flex:1; overflow:hidden;">
                <div id="diary-ticker-track" style="white-space:nowrap; will-change: transform; color: rgba(255,255,255,0.75); font-size:12px;">
                    Cargando bitácora…
                </div>
            </div>
        `;

        // CSS extra
        if (!document.getElementById('diary-live-css')) {
            const style = document.createElement('style');
            style.id = 'diary-live-css';
            style.textContent = `
                .diary-card {
                    border: 1px solid rgba(74,158,255,0.18);
                    border-left: 4px solid rgba(74,158,255,0.85);
                    border-radius: 14px;
                    padding: 14px 14px;
                    background: rgba(15,15,25,0.72);
                    transition: transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease;
                }
                .diary-card.is-focus {
                    border-color: rgba(74,158,255,0.55);
                    box-shadow: 0 16px 40px rgba(74,158,255,0.16);
                    transform: translateX(8px);
                }
                .diary-card .meta {
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap: 10px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.65);
                    margin-bottom: 8px;
                }
                .diary-card .topic {
                    color: rgba(74,158,255,0.95);
                    font-weight: 700;
                }
                .diary-card .content {
                    color: rgba(255,255,255,0.88);
                    font-size: 14px;
                    line-height: 1.6;
                }
                @keyframes tickerMove {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `;
            document.head.appendChild(style);
        }

        root.appendChild(header);
        root.appendChild(layout);
        root.appendChild(ticker);
        this.container.appendChild(root);
    }

    async refreshEntries({ isInitial = false } = {}) {
        await this.loadDiaryEntries();
        this.renderDiary();
        if (isInitial) {
            // Reset foco al inicio
            this.focusIndex = 0;
            this.applyFocus();
        }
    }

    async loadDiaryEntries() {
        try {
            // Obtener entradas del diario desde el servidor
            const res = await fetch('/control-api/api/diary-entries', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                this.entries = data.entries || [];
            } else {
                // Fallback: generar desde memorias
                const memoryRes = await fetch('/control-api/api/country-memory', { cache: 'no-store' });
                if (memoryRes.ok) {
                    const memoryData = await memoryRes.json();
                    const memories = memoryData.memories || [];
                    this.entries = [];
                    
                    for (const memory of memories.slice(0, 10)) {
                        try {
                            const countryMemory = await fetch(`/control-api/api/country-memory/${memory.countryId}`, { cache: 'no-store' }).then(r => r.json());
                            if (countryMemory.visits && countryMemory.visits.length > 0) {
                                const latestVisit = countryMemory.visits[countryMemory.visits.length - 1];
                                if (latestVisit.narrative) {
                                    this.entries.push({
                                        country: memory.countryName || `País ${memory.countryId}`,
                                        time: new Date(latestVisit.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                                        topic: latestVisit.isFirstVisit ? 'Primera Visita' : 'Visita Subsecuente',
                                        content: latestVisit.narrative.substring(0, 200) + (latestVisit.narrative.length > 200 ? '...' : ''),
                                        timestamp: latestVisit.timestamp
                                    });
                                }
                            }
                        } catch (e) {
                            console.warn(`[Diario] Error cargando memoria de ${memory.countryId}:`, e);
                        }
                    }
                } else {
                    this.entries = [];
                }
            }
            
            // Ordenar por timestamp (más recientes primero)
            this.entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // Limitar a 14 entradas más recientes (más “pantalla”)
            this.entries = this.entries.slice(0, 14);

            this.lastUpdatedAt = Date.now();
            
            console.log(`[Diario] Cargadas ${this.entries.length} entradas del diario`);
        } catch (e) {
            console.error('[Diario] Error cargando entradas:', e);
            this.entries = [];
        }
    }

    renderDiary() {
        if (!this.container) return;
        const feed = document.getElementById('diary-feed-scroll');
        const metaCount = document.getElementById('diary-count');
        const metaUpdated = document.getElementById('diary-updated');
        const focus = document.getElementById('diary-focus');
        const ticker = document.getElementById('diary-ticker-track');

        if (metaCount) metaCount.innerHTML = `Entradas: <b style="color:#fff;">${this.entries.length}</b>`;
        if (metaUpdated) metaUpdated.innerHTML = `Actualizado: <b style="color:#fff;">${new Date(this.lastUpdatedAt || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</b>`;

        if (feed) {
            feed.innerHTML = '';
            if (this.entries.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = `
                    height: 100%;
                    min-height: 240px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex-direction:column;
                    gap: 10px;
                    color: rgba(255,255,255,0.70);
                    padding: 24px;
                    text-align:center;
                `;
                empty.innerHTML = `
                    <div style="font-size:42px;">📔</div>
                    <div style="font-weight:800; font-size:18px;">Esperando entradas…</div>
                    <div style="font-size:13px; opacity:.8; max-width:520px;">
                        Cuando el viaje genere memorias/narrativas, este feed se completa solo.
                    </div>
                `;
                feed.appendChild(empty);
                if (focus) focus.textContent = 'Aún no hay entradas. Apenas aparezca una, la pondremos en foco automáticamente.';
            } else {
                this.entries.forEach((entry, idx) => {
                    const card = document.createElement('div');
                    card.className = `diary-card${idx === this.focusIndex ? ' is-focus' : ''}`;
                    card.dataset.idx = String(idx);
                    card.innerHTML = `
                        <div class="meta">
                            <div><b style="color:#fff;">${this.escapeHtml(entry.country || '—')}</b> <span style="opacity:.7;">• ${this.escapeHtml(entry.time || '')}</span></div>
                            <div class="topic">#${this.escapeHtml(entry.topic || 'entrada')}</div>
                        </div>
                        <div class="content">${this.escapeHtml(entry.content || '')}</div>
                    `;
                    feed.appendChild(card);
                });

                const e = this.entries[this.focusIndex] || this.entries[0];
                if (focus && e) {
                    focus.innerHTML = `
                        <div style="font-weight:800; color:#fff; margin-bottom:6px;">${this.escapeHtml(e.country || '—')} • ${this.escapeHtml(e.time || '')}</div>
                        <div style="opacity:.9;">${this.escapeHtml(e.content || '').slice(0, 220)}${(e.content && e.content.length > 220) ? '…' : ''}</div>
                    `;
                }
            }
        }

        // Ticker: duplicar texto para animación infinita
        if (ticker) {
            const parts = (this.entries || []).slice(0, 8).map(e => `${e.country}: ${String(e.content || '').slice(0, 70)}${(e.content && e.content.length > 70) ? '…' : ''}`);
            const base = parts.length ? parts.join('   •   ') : 'Esperando entradas del diario…';
            const track = `${base}   •   ${base}`;
            ticker.textContent = track;
            ticker.style.animation = 'tickerMove 34s linear infinite';
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.NARRATIVE);
        
        // Generar narrativa sobre el diario
        const entriesCount = this.entries.length;
        const countries = [...new Set(this.entries.map(e => e.country))];
        const countriesCount = countries.length;
        
        // Texto inicial inmediato
        const immediateText = entriesCount > 0 
            ? `Este es mi diario de viaje. Hasta ahora he documentado ${entriesCount} entrada${entriesCount !== 1 ? 's' : ''} sobre ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} diferentes.`
            : `Este es mi diario de viaje. Aún no hay entradas, pero pronto comenzaré a documentar mis experiencias.`;
        
        // Mostrar subtítulos
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        // Generar texto completo con IA en paralelo
        const generateFullTextPromise = this.generateFullNarrative();
        
        // Empezar a hablar inmediatamente
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            // Esperar texto completo
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Diario] Error generando texto completo:', e);
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

    startLiveLoop() {
        // Auto-refresh de datos
        this.refreshTimer = setInterval(() => {
            this.refreshEntries().catch(() => { });
        }, 30000);

        // Auto-focus + auto-scroll (stream-friendly)
        this.focusTimer = setInterval(() => {
            if (!this.entries || this.entries.length === 0) return;
            this.focusIndex = (this.focusIndex + 1) % this.entries.length;
            this.applyFocus();
        }, 7000);
    }

    applyFocus() {
        const feed = document.getElementById('diary-feed-scroll');
        if (!feed) return;
        const cards = Array.from(feed.querySelectorAll('.diary-card'));
        cards.forEach((c) => c.classList.remove('is-focus'));
        const current = cards[this.focusIndex];
        if (current) {
            current.classList.add('is-focus');
            try {
                current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) { }
        }
        // Re-render parcial del panel “En foco”
        const focus = document.getElementById('diary-focus');
        const e = this.entries[this.focusIndex];
        if (focus && e) {
            focus.innerHTML = `
                <div style="font-weight:800; color:#fff; margin-bottom:6px;">${this.escapeHtml(e.country || '—')} • ${this.escapeHtml(e.time || '')}</div>
                <div style="opacity:.9;">${this.escapeHtml(e.content || '').slice(0, 220)}${(e.content && e.content.length > 220) ? '…' : ''}</div>
            `;
        }
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

    async generateFullNarrative() {
        const entriesCount = this.entries.length;
        const countries = [...new Set(this.entries.map(e => e.country))];
        const countriesCount = countries.length;
        const latestEntry = this.entries[0];
        
        const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real.

Estás mostrando tu diario de viaje que contiene ${entriesCount} entrada${entriesCount !== 1 ? 's' : ''} sobre ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} diferentes.
${latestEntry ? `La entrada más reciente es sobre ${latestEntry.country} y dice: "${latestEntry.content.substring(0, 100)}..."` : ''}

Genera una narrativa natural en primera persona que:
1. Explique qué es este diario y por qué lo mantienes
2. Mencione algunos de los países o experiencias documentadas
3. Reflexione sobre el valor de documentar el viaje
4. Sea personal y evocadora
5. Tenga entre 120 y 180 palabras
6. Use primera persona: "Este es mi diario...", "He documentado...", "Cada entrada representa..."

NO repitas literalmente las entradas del diario. Habla sobre el diario como concepto y reflexiona sobre su significado.`;

        try {
            const response = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (response.ok) {
                const data = await response.json();
                return data.narrative || null;
            }
        } catch (e) {
            console.warn('[Diario] Error generando narrativa:', e);
        }

        return null;
    }

    scheduleNextPage() {
        // Si Dream Mode está ON, cambiar automáticamente a otra página
        if (eventManager.canProceedAuto()) {
            console.log('[Diario] Dream Mode ON: Programando cambio de página...');
            // Esperar 2-3 segundos después de la narración para transición suave
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo'];
                    // Excluir la página actual para evitar repetir
                    const currentPage = 'diario';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Diario] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 2000 + Math.random() * 1000); // 2-3 segundos aleatorios
        }
    }

    unmount() {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        if (this.focusTimer) clearInterval(this.focusTimer);
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
