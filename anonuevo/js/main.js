import { timeEngine } from './utils/time.js';
import { scheduler } from './utils/scheduler.js';

// Mapa de modos disponibles y sus rutas de importación
const MODES = {
    'reloj': './modes/reloj.js',
    'curiosidades': './modes/curiosidades.js',
    'mapa': './modes/mapa.js',
    'continente': './modes/continente.js',
    'ruta': './modes/ruta.js',
    'estadisticas': './modes/estadisticas.js',
    'galeria': './modes/galeria.js',
    'diario': './modes/diario.js'
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

        // Detectar modo desde URL (Query Param o Path)
        const params = new URLSearchParams(window.location.search);
        let modeName = params.get('mode');

        // Si no hay query param, intentar extraer del path (ej: /vivos/mapa)
        if (!modeName) {
            const pathSegments = window.location.pathname.split('/').filter(Boolean);
            // Buscar el modo en los segmentos del path
            for (let i = pathSegments.length - 1; i >= 0; i--) {
                const segment = pathSegments[i];
                if (MODES[segment]) {
                    modeName = segment;
                    break;
                }
            }
        }

        // Fallback al default
        modeName = modeName || DEFAULT_MODE;

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
            // Importación dinámica del módulo con Cache Busting
            // Usamos un timestamp para forzar la recarga en cada visita nueva
            // En producción idealmente usaríamos un hash de build, pero esto funciona para este setup simple.
            const cacheBuster = '?v=9';
            const module = await import(MODES[modeName] + cacheBuster);
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

// Canal de comunicación con el panel de control
const streamNavigationChannel = new BroadcastChannel('stream-navigation');

// Escuchar mensajes del panel de control para cambiar de página
streamNavigationChannel.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'navigate') {
        const path = event.data.path;
        const currentPath = window.location.pathname;
        // NO navegar si estamos en la página principal (index.html)
        if (currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html')) {
            console.log(`[App] Ignorando navegación desde página principal: ${path}`);
            return;
        }
        console.log(`[App] Navegando a: ${path} (comando desde panel de control)`);
        window.location.href = path;
    }
});

// Lógica de Inicio automático (sin overlay para streaming)
document.addEventListener('DOMContentLoaded', () => {
    const startOverlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');

    // Si hay overlay y botón, esperar interacción del usuario (para páginas que lo requieren)
    if (startOverlay && startBtn) {
        startBtn.addEventListener('click', async () => {
            // 1. Desbloquear Audio Context
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel(); // Reset
                // Intentar hablar algo vacío para "calentar" el motor
                const u = new SpeechSynthesisUtterance('');
                window.speechSynthesis.speak(u);
            }

            // 2. Ocultar Overlay
            startOverlay.classList.add('hidden');

            // 3. Iniciar App
            console.log('🚀 Iniciando aplicación tras interacción de usuario...');
            window.app = new App();
        });
    } else {
        // Si no hay overlay, iniciar automáticamente (para streaming)
        console.log('🚀 Iniciando aplicación automáticamente (sin overlay)...');
        
        // Intentar desbloquear audio automáticamente
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                // Warm-up silencioso
                const u = new SpeechSynthesisUtterance('');
                u.volume = 0;
                window.speechSynthesis.speak(u);
                setTimeout(() => window.speechSynthesis.cancel(), 10);
            } catch (e) {
                console.warn('No se pudo desbloquear audio automáticamente:', e);
            }
        }
        
        // Iniciar App inmediatamente
        window.app = new App();
    }
});
