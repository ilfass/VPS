import { sfxEngine } from './sfx-engine.js';

/**
 * TV Scene Kit
 * Layout común: topbar + 3 paneles + ticker + background animable.
 */
export function createTvScene({
    modeId = 'mode',
    title = 'ESCENA',
    subtitle = '',
    accent = '#38bdf8'
} = {}) {
    const root = document.createElement('div');
    root.className = 'cinematic-root'; // New class
    root.dataset.mode = modeId;

    // Intro/Cinematic Structure
    root.innerHTML = `
        <div class="cinematic-bg"></div>
        
        <div class="cinematic-header">
            <h1 class="cinematic-title">${escapeHtml(title)}</h1>
            <div class="cinematic-subtitle">${escapeHtml(subtitle || '')}</div>
        </div>

        <div id="tv-main" class="cinematic-body"></div>

        <div class="cinematic-footer">
            <span id="tv-clock" style="color: #64748b;">--:--</span>
            <span id="tv-ticker" class="cinematic-ticker">Preparando escena...</span>
            <span id="tv-status" style="font-size: 0.7em; opacity: 0.5;">LIVE</span>
        </div>

        <!-- Hidden containers so legacy code doesn't crash on null -->
        <div style="display: none;">
            <div id="tv-build"></div>
            <div id="tv-mini"></div>
            <div id="tv-cards"></div>
        </div>
    `;

    const api = {
        root,
        main: root.querySelector('#tv-main'),
        // Map legacy panels to hidden divs
        build: root.querySelector('#tv-build'),
        mini: root.querySelector('#tv-mini'),
        cards: root.querySelector('#tv-cards'),

        ticker: root.querySelector('#tv-ticker'),
        clock: root.querySelector('#tv-clock'),
        status: root.querySelector('#tv-status'),
        sfx: sfxEngine
    };

    // Reloj
    const tickClock = () => {
        try {
            const now = new Date();
            api.clock.textContent = now.toLocaleTimeString('es-AR', { hour12: false });
        } catch (e) { }
    };
    tickClock();
    api._clockTimer = setInterval(tickClock, 1000);

    api.setStatus = (txt) => {
        if (api.status) {
            api.status.textContent = (txt || '').toUpperCase();
        }
    };

    api.setTicker = (txt) => {
        if (api.ticker) api.ticker.textContent = txt || '';
    };

    api.addCard = ({ k, v, tone = 'neutral' } = {}) => {
        // En modo cinemático, las tarjetas de "datos" no se muestran por defecto en el panel lateral.
        // Podríamos loguearlas o mostrarlas como notificaciones flotantes si fuera crítico.
        // Por ahora, solo las agregamos al DOM oculto para cumplir el contrato.
        const card = document.createElement('div');
        card.textContent = `${k}: ${v}`;
        if (api.cards) api.cards.appendChild(card);
        return card;
    };

    api.destroy = () => {
        try { clearInterval(api._clockTimer); } catch (e) { }
        api._clockTimer = null;
    };

    try { api.sfx.arm(); } catch (e) { }

    return api;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

