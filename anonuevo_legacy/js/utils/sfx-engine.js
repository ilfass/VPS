/**
 * SFX Engine (sin assets)
 * Pequeños efectos de sonido con WebAudio (beeps/wooshes) para "build steps"
 * Nota: requiere interacción del usuario para desbloquear audio en muchos navegadores.
 */
export class SfxEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this._armed = false;
    }

    arm() {
        if (this._armed) return;
        this._armed = true;

        const tryInit = () => {
            try {
                if (!this.ctx) {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return;
                    this.ctx = new Ctx();
                }
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => { });
                }
            } catch (e) { }
        };

        // Intentar en interacción (click/touch/keydown)
        window.addEventListener('click', tryInit, { once: true, passive: true });
        window.addEventListener('touchstart', tryInit, { once: true, passive: true });
        window.addEventListener('keydown', tryInit, { once: true, passive: true });
    }

    _beep({ freq = 880, durationMs = 120, type = 'sine', gain = 0.03, glideTo = null } = {}) {
        try {
            if (!this.enabled) return;
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, now);
            if (glideTo && Number.isFinite(glideTo)) {
                o.frequency.exponentialRampToValueAtTime(glideTo, now + Math.max(0.02, durationMs / 1000));
            }

            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

            o.connect(g);
            g.connect(this.ctx.destination);

            o.start(now);
            o.stop(now + durationMs / 1000 + 0.02);
        } catch (e) { }
    }

    tick() {
        this._beep({ freq: 1047, durationMs: 70, type: 'square', gain: 0.018 });
    }

    reveal() {
        this._beep({ freq: 740, glideTo: 1480, durationMs: 160, type: 'sine', gain: 0.02 });
    }

    woosh() {
        this._beep({ freq: 220, glideTo: 880, durationMs: 220, type: 'triangle', gain: 0.015 });
    }

    alert() {
        this._beep({ freq: 880, durationMs: 120, type: 'sawtooth', gain: 0.02 });
        setTimeout(() => this._beep({ freq: 988, durationMs: 120, type: 'sawtooth', gain: 0.02 }), 140);
    }
}

export const sfxEngine = new SfxEngine();

