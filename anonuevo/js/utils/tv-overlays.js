export class TvOverlays {
    constructor() {
        this.container = null;
        this.lower = null;
        this.ticker = null;
        this.tickerSpan = null;
        this.hideTimer = null;
        this._stylesInjected = false;
    }

    ensure(container) {
        if (!container) return;
        this.container = container;
        this.injectStylesOnce();

        // Lower third
        if (!document.getElementById('tv-lower-third')) {
            const el = document.createElement('div');
            el.id = 'tv-lower-third';
            el.innerHTML = `
                <div class="tv-lower-inner">
                    <div class="tv-lower-title" id="tv-lower-title">ILFASS EN VIVO</div>
                    <div class="tv-lower-sub" id="tv-lower-sub">—</div>
                </div>
            `;
            container.appendChild(el);
        }
        this.lower = document.getElementById('tv-lower-third');

        // Ticker
        if (!document.getElementById('tv-ticker')) {
            const t = document.createElement('div');
            t.id = 'tv-ticker';
            t.innerHTML = `<div class="tv-ticker-track"><span id="tv-ticker-span"></span></div>`;
            container.appendChild(t);
        }
        this.ticker = document.getElementById('tv-ticker');
        this.tickerSpan = document.getElementById('tv-ticker-span');
    }

    injectStylesOnce() {
        if (this._stylesInjected) return;
        this._stylesInjected = true;
        if (document.getElementById('tv-overlays-style')) return;

        const style = document.createElement('style');
        style.id = 'tv-overlays-style';
        style.textContent = `
            #tv-lower-third{
                position:absolute; left:18px; bottom:54px; z-index:900;
                max-width: 70vw;
                transform: translateY(18px);
                opacity:0;
                pointer-events:none;
                transition: opacity .25s ease, transform .25s ease;
                font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            }
            #tv-lower-third.visible{ opacity:1; transform: translateY(0); }
            .tv-lower-inner{
                background: linear-gradient(90deg, rgba(0,0,0,0.78), rgba(0,0,0,0.55));
                border: 1px solid rgba(255,255,255,0.12);
                border-left: 5px solid rgba(56,189,248,0.9);
                border-radius: 10px;
                padding: 10px 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.45);
            }
            .tv-lower-title{
                font-size: 14px; font-weight: 700; letter-spacing: .04em;
                color: rgba(255,255,255,0.95);
                text-transform: uppercase;
            }
            .tv-lower-sub{
                margin-top: 4px;
                font-size: 12px;
                color: rgba(255,255,255,0.78);
            }
            #tv-ticker{
                position:absolute; left:0; right:0; bottom:0; z-index:850;
                height: 38px;
                background: rgba(0,0,0,0.70);
                border-top: 1px solid rgba(255,255,255,0.10);
                overflow: hidden;
                pointer-events:none;
                font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            }
            .tv-ticker-track{
                position:absolute; left:0; top:0; height:100%;
                display:flex; align-items:center;
                white-space: nowrap;
                will-change: transform;
                animation: tvTicker 26s linear infinite;
                padding-left: 100%;
            }
            #tv-ticker-span{
                display:inline-block;
                font-size: 13px;
                color: rgba(255,255,255,0.85);
                padding-right: 100%;
            }
            @keyframes tvTicker{
                0%{ transform: translateX(0); }
                100%{ transform: translateX(-100%); }
            }
        `;
        document.head.appendChild(style);
    }

    showLowerThird(title, subtitle, ms = 12000) {
        if (!this.lower) return;
        const t = document.getElementById('tv-lower-title');
        const s = document.getElementById('tv-lower-sub');
        if (t) t.textContent = title || 'ILFASS EN VIVO';
        if (s) s.textContent = subtitle || '—';

        this.lower.classList.add('visible');
        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.hideLowerThird(), ms);
    }

    hideLowerThird() {
        if (!this.lower) return;
        this.lower.classList.remove('visible');
    }

    setTicker(text) {
        if (!this.tickerSpan) return;
        // Repetimos separadores para que se sienta continuo.
        const base = (text || '').trim();
        const full = base ? `${base}   •   ${base}   •   ${base}` : '';
        this.tickerSpan.textContent = full;
    }
}

