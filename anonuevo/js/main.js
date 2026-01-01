import { timeEngine } from './utils/time.js';
import { scheduler } from './utils/scheduler.js';

// Mapa de modos disponibles y sus rutas de importación
const MODES = {
    'reloj': './modes/reloj.js',
    'curiosidades': './modes/curiosidades.js',
    'mapa': './modes/mapa.js'
};

const DEFAULT_MODE = 'reloj';

class App {
    constructor() {
        this.stage = document.getElementById('stage');
        this.currentModeInstance = null;
        this.debugLayer = document.getElementById('debug-layer');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.fpsCounter = document.getElementById('fps-counter');

        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Motor de Transmisión...');

        // Iniciar motor de tiempo
        timeEngine.start();

        // Detectar parámetros de URL
        const params = new URLSearchParams(window.location.search);
        const modeName = params.get('mode') || DEFAULT_MODE;
        const debug = params.get('debug') === 'true';

        if (debug) {
            this.debugLayer.style.display = 'block';
            this.startFpsCounter();
        }

        await this.loadMode(modeName);

        // Ejemplo de uso del scheduler: Log cada minuto
        scheduler.addTask('System Check', 1, () => {
            console.log('✅ Sistema estable. Memoria OK.');
        });

        // Loop principal para el scheduler (no para renderizado visual, eso va por CSS/Eventos)
        timeEngine.subscribe((now) => {
            scheduler.check(now);
        });
    }

    async loadMode(modeName) {
        if (!MODES[modeName]) {
            console.error(`Modo "${modeName}" no encontrado. Cargando default.`);
            modeName = DEFAULT_MODE;
        }

        console.log(`🔄 Cargando modo: ${modeName}`);
        if (this.modeIndicator) this.modeIndicator.textContent = `Modo: ${modeName.toUpperCase()}`;

        // Desmontar modo anterior si existe
        if (this.currentModeInstance && typeof this.currentModeInstance.unmount === 'function') {
            this.currentModeInstance.unmount();
        }

        // Limpiar tareas programadas del modo anterior
        scheduler.clearTasks();

        try {
            // Importación dinámica del módulo
            const module = await import(MODES[modeName]);
            const ModeClass = module.default;

            // Instanciar y montar
            this.currentModeInstance = new ModeClass(this.stage);
            this.currentModeInstance.mount();

            console.log(`✅ Modo ${modeName} montado exitosamente.`);
        } catch (error) {
            console.error(`❌ Error cargando el modo ${modeName}:`, error);
            this.stage.innerHTML = `<div class="center-content"><h1>Error cargando modo</h1><p>${error.message}</p></div>`;
        }
    }

    startFpsCounter() {
        let lastTime = performance.now();
        let frames = 0;

        const loop = () => {
            const now = performance.now();
            frames++;

            if (now - lastTime >= 1000) {
                this.fpsCounter.textContent = `FPS: ${frames}`;
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(loop);
        };
        loop();
    }
}

// Iniciar aplicación
window.app = new App();
