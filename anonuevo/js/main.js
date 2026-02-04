/**
 * PUNTO DE ENTRADA PRINCIPAL
 * Inicializa los módulos core y arranca el latido del sistema.
 */

import { orchestrator } from './core/orchestrator.js';
import { uiManager } from './core/ui-manager.js';
import { mapRenderer } from './modules/map-renderer.js';

console.log("%c SISTEMA DE STREAMING INICIADO ", "background: #000; color: #0f0; padding: 5px; font-weight: bold;");

async function init() {
    // 1. Inicializar UI
    uiManager.init();

    // 2. Inicializar Mapa Visual
    await mapRenderer.init();

    // 3. Despertar al Orquestador (El Cerebro)
    await orchestrator.init();

    // 3. Arrancar el bucle de vida
    orchestrator.startLifeCycle();
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
