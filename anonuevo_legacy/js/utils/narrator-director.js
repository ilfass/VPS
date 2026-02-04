/**
 * Narrator Director
 * Mueve el avatar/narrador por posiciones de pantalla para dar dinamismo.
 */
export class NarratorDirector {
    constructor(avatarManager) {
        this.avatar = avatarManager;
        this.timer = null;
        this.positions = ['bl', 'br', 'tr', 'tl'];
        this.intervalMs = 12000;
    }

    start({ positions, intervalMs } = {}) {
        this.stop();
        if (positions && positions.length) this.positions = positions;
        if (intervalMs) this.intervalMs = intervalMs;

        // primer movimiento un poco después (evita saltos al cargar)
        this.timer = setInterval(() => this.moveRandom(), this.intervalMs);
        setTimeout(() => this.moveRandom(), 1500);
    }

    moveRandom() {
        try {
            const p = this.positions[Math.floor(Math.random() * this.positions.length)];
            this.avatar?.moveTo?.(p);
        } catch (e) { }
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }
}

