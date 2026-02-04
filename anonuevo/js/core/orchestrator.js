import { aiSwarm } from '../ai_swarm/router.js';
import { audioManager } from './audio-manager.js';
import { uiManager } from './ui-manager.js';

class Orchestrator {
    constructor() {
        this.status = 'IDLE';
        this.silenceDuration = 0;
        this.maxSilence = 7; // Segundos antes de intervenir
        this.timer = null;
    }

    async init() {
        console.log("[Orchestrator] Conectando sinapsis...");
        await audioManager.init();
    }

    startLifeCycle() {
        console.log("[Orchestrator] 💓 Latido iniciado.");
        this.timer = setInterval(() => this.heartbeat(), 1000);

        // Evento inicial
        setTimeout(() => this.triggerEvent('SYSTEM_START'), 1000);
    }

    heartbeat() {
        // Monitor de actividad
        const isBusy = audioManager.isSpeaking || audioManager.isPlayingMusic || this.status === 'GENERATING';

        if (isBusy) {
            this.silenceDuration = 0;
            // Actualizar UI
            let statusText = "ACTIVO";
            if (audioManager.isSpeaking) statusText = "HABLANDO";
            else if (this.status === 'GENERATING') statusText = "GENERANDO";

            uiManager.updateStatus(statusText);
        } else {
            this.silenceDuration++;
            uiManager.updateStatus(`ESPERA (${this.silenceDuration}s)`);
        }

        // TRIGGER AUTOMÁTICO
        if (this.silenceDuration >= this.maxSilence) {
            console.warn(`[Orchestrator] ⚠️ Silencio de ${this.silenceDuration}s excedido. Invocando IA.`);
            this.silenceDuration = 0;
            this.triggerEvent('SILENCE_BREAK');
        }
    }

    async triggerEvent(type) {
        if (this.status === 'GENERATING') return;

        this.status = 'GENERATING';
        uiManager.showThinking(true);

        try {
            // 1. Consultar al Enjambre
            const plan = await aiSwarm.decideNextMove(type);

            console.log("[Orchestrator] Plan recibido:", plan);

            // 2. Ejecutar Acción
            if (plan.action === 'DIALOGUE') {
                await this.executeDialogue(plan.script);
            }

        } catch (e) {
            console.error("[Orchestrator] Error en flujo:", e);
        } finally {
            this.status = 'IDLE';
            uiManager.showThinking(false);
        }
    }

    async executeDialogue(script) {
        for (const line of script) {
            // Simular reproducción real pasando al audioManager
            await audioManager.speak(line.text);
        }
    }
}

export const orchestrator = new Orchestrator();
