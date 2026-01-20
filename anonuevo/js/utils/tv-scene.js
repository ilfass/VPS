import { sfxEngine } from './sfx-engine.js';

/**
 * TV Scene Kit
 * Layout común: topbar + 3 paneles + ticker + background animable.
 */
export function createTvScene({
    modeId = 'mode',
    title = 'ESCENA',
    subtitle = '',
    accent = '#4a9eff'
} = {}) {
    const root = document.createElement('div');
    root.className = 'tv-scene-root';
    root.dataset.mode = modeId;
    root.style.setProperty('--tv-accent', accent);

    root.innerHTML = `
        <div class="tv-bg">
            <div class="tv-bg-grid"></div>
            <div class="tv-bg-noise"></div>
            <div class="tv-bg-vignette"></div>
        </div>

        <div class="tv-topbar">
            <div class="tv-title">
                <div class="badge">LIVE</div>
                <div class="t1">${escapeHtml(title)}</div>
                <div class="t2">${escapeHtml(subtitle || '')}</div>
            </div>
            <div class="tv-meta">
                <div class="pill" id="tv-clock">--:--:--</div>
                <div class="pill" id="tv-status">BUILD</div>
            </div>
        </div>

        <div class="tv-body">
            <div class="tv-panel left">
                <div class="hdr">CONSTRUCCIÓN</div>
                <div class="tv-build" id="tv-build"></div>
                <div class="tv-mini" id="tv-mini"></div>
            </div>
            <div class="tv-main" id="tv-main"></div>
            <div class="tv-panel right">
                <div class="hdr">SEÑALES</div>
                <div class="tv-cards" id="tv-cards"></div>
            </div>
        </div>

        <div class="tv-ticker" id="tv-ticker">
            <span class="label">ILFASS</span>
            <span class="msg">Preparando escena…</span>
        </div>
    `;

    const api = {
        root,
        main: root.querySelector('#tv-main'),
        build: root.querySelector('#tv-build'),
        mini: root.querySelector('#tv-mini'),
        cards: root.querySelector('#tv-cards'),
        ticker: root.querySelector('#tv-ticker .msg'),
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
        if (api.status) api.status.textContent = (txt || '').toUpperCase();
    };
    api.setTicker = (txt) => {
        if (api.ticker) api.ticker.textContent = txt || '';
    };

    api.addCard = ({ k, v, tone = 'neutral' } = {}) => {
        const card = document.createElement('div');
        card.className = `tv-card ${tone}`;
        card.innerHTML = `
            <div class="k"></div>
            <div class="v"></div>
        `;
        card.querySelector('.k').textContent = k || '';
        card.querySelector('.v').textContent = v || '';
        api.cards.appendChild(card);
        // animación de entrada
        requestAnimationFrame(() => card.classList.add('in'));
        return card;
    };

    api.destroy = () => {
        try { clearInterval(api._clockTimer); } catch (e) { }
        api._clockTimer = null;
    };

    // Armar SFX (autoplay-safe)
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

