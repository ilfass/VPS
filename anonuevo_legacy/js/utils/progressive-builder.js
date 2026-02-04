/**
 * Progressive Builder
 * Hace que el contenido “se construya” por pasos (muy streaming-friendly).
 */
export class ProgressiveBuilder {
    constructor({ listEl, sfx } = {}) {
        this.listEl = listEl || null;
        this.sfx = sfx || null;
        this.steps = [];
        this._isRunning = false;
        this._timers = new Set();
    }

    addStep(label, run, { delayMs = 650 } = {}) {
        this.steps.push({ label, run, delayMs });
        return this;
    }

    clear() {
        this.stop();
        this.steps = [];
        if (this.listEl) this.listEl.innerHTML = '';
    }

    stop() {
        this._isRunning = false;
        for (const t of this._timers) clearTimeout(t);
        this._timers.clear();
    }

    _renderStep(label) {
        if (!this.listEl) return null;
        const row = document.createElement('div');
        row.className = 'tv-build-step';
        row.innerHTML = `
            <span class="dot"></span>
            <span class="txt"></span>
            <span class="tag">...</span>
        `;
        row.querySelector('.txt').textContent = label;
        this.listEl.appendChild(row);
        return row;
    }

    async start() {
        if (this._isRunning) return;
        this._isRunning = true;

        for (let i = 0; i < this.steps.length; i++) {
            if (!this._isRunning) break;
            const s = this.steps[i];

            const row = this._renderStep(s.label);
            row?.classList?.add('active');
            try { this.sfx?.tick?.(); } catch (e) { }

            try {
                await (s.run?.() ?? Promise.resolve());
            } catch (e) { }

            row?.classList?.remove('active');
            row?.classList?.add('done');
            const tag = row?.querySelector?.('.tag');
            if (tag) tag.textContent = 'OK';

            await new Promise((resolve) => {
                const t = setTimeout(resolve, s.delayMs ?? 650);
                this._timers.add(t);
            });
        }
    }
}

