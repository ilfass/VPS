import { timeEngine } from './utils/time.js';
import { scheduler } from './utils/scheduler.js';
import { audioManager } from './utils/audio-manager.js';
import { eventManager } from './utils/event-manager.js?v=2';
import { cinematicDirector } from './utils/cinematic-director.js';
import { recapEngine } from './utils/recap-engine.js';
import { autoNavigator } from './utils/auto-navigator.js';
import { bumperEngine } from './utils/bumper-engine.js';
import { agendaEngine } from './utils/agenda-engine.js';

// Mapa de modos disponibles y sus rutas de importación
const MODES = {
    'reloj': './modes/reloj.js',
    'curiosidades': './modes/curiosidades.js',
    'mapa': './modes/mapa.js',
    'continente': './modes/continente.js',
    'ruta': './modes/ruta.js',
    'estadisticas': './modes/estadisticas.js',
    'galeria': './modes/galeria.js',
    'diario': './modes/diario.js',
    'globo': './modes/globo.js',
    'clima': './modes/clima.js',
    'aereo': './modes/aereo.js',
    'satelites': './modes/satelites.js',
    'terremotos': './modes/terremotos.js',
    'aire': './modes/aire.js',
    'incendios': './modes/incendios.js',
    'sol': './modes/sol.js',
    'ciudad': './modes/ciudad.js'
};

const DEFAULT_MODE = 'reloj';

function initGlobalMusicControls() {
    // Exponer para páginas que lo usan (ej: index.html)
    window.audioManager = audioManager;

    // Iniciar polling global (para que el botón del panel funcione en TODAS las hojas)
    if (!eventManager.pollInterval) {
        eventManager.init();
    }

    // Handler global: toggle/next
    // Nota: algunos modos antiguos registran su propio handler; si lo hacen, pueden sobrescribir este.
    eventManager.on('music_command', (musicState) => {
        if (!musicState || !musicState.command) return;
        if (musicState.command === 'toggle') {
            audioManager.toggleMusic();
        } else if (musicState.command === 'next') {
            audioManager.nextTrack();
        }
    });

    // Sincronizar preferencia inicial con el estado del servidor (persistencia entre hojas)
    // Si el servidor indica "paused", evitamos arrancar música en páginas nuevas.
    fetch('/control-api/api/music-status')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (!data || typeof data.isPlaying !== 'boolean') return;
            audioManager.setMusicEnabled?.(data.isPlaying);
            if (!data.isPlaying) {
                audioManager.pauseMusic();
            }
        })
        .catch(() => { });
}

class App {
    constructor() {
        this.stage = document.getElementById('stage');
        this.currentModeInstance = null;
        this.debugLayer = document.getElementById('debug-layer');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.fpsCounter = document.getElementById('fps-counter');
        this.cinematicDirector = cinematicDirector;
        this.recapEngine = recapEngine;
        this.autoNavigator = autoNavigator;
        this.bumperEngine = bumperEngine;

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
        // Detener cámara “cinemática” del modo anterior
        this.cinematicDirector?.detach?.();
        // Detener recap del modo anterior
        this.recapEngine?.detach?.();
        // Detener auto-navigator / bumpers del modo anterior
        this.autoNavigator?.detach?.();
        this.bumperEngine?.detach?.();

        // Limpiar tareas programadas del modo anterior
        scheduler.clearTasks();

        try {
            // Importación dinámica del módulo con Cache Busting
            // Usamos un timestamp para forzar la recarga en cada visita nueva
            // En producción idealmente usaríamos un hash de build, pero esto funciona para este setup simple.
            const cacheBuster = '?v=11';
            const module = await import(MODES[modeName] + cacheBuster);
            const ModeClass = module.default;

            // Instanciar y montar
            this.currentModeInstance = new ModeClass(this.stage);
            this.currentModeInstance.mount();

            // Activar “tomas” automáticas si el modo expone Leaflet map o Cesium viewer.
            // El director hace polling hasta que el mapa/cámara exista.
            this.cinematicDirector?.attach?.(this.currentModeInstance);
            // Recaps TV globales (solo en circuito /vivos/)
            this.recapEngine?.attach?.(this.currentModeInstance, modeName, this.stage);
            // Agenda editorial y bumpers
            this.autoNavigator?.attach?.(modeName, this.currentModeInstance);
            this.bumperEngine?.attach?.(modeName, this.currentModeInstance);

            console.log(`✅ Modo ${modeName} montado exitosamente.`);
        } catch (error) {
            console.error(`❌ Error cargando el modo ${modeName}:`, error);
            this.stage.innerHTML = `<div class="center-content"><h1>Error cargando modo</h1><p>${error.message}</p></div>`;
            this.cinematicDirector?.detach?.();
            this.recapEngine?.detach?.();
            this.autoNavigator?.detach?.();
            this.bumperEngine?.detach?.();
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
    // Global: música/control remoto (panel) para todas las hojas
    initGlobalMusicControls();
    // Global: recaps (si está en /vivos/)
    try {
        if (window.location.pathname.includes('/vivos/')) {
            recapEngine.init();
            autoNavigator.init(document.getElementById('stage'));
            bumperEngine.init(document.getElementById('stage'));
            // Hook global para que los modos deleguen la navegación a la agenda
            window.__autoNavSchedule = (modeName) => {
                try { autoNavigator.schedule(modeName); } catch (e) { }
            };

            // TV control events desde panel
            eventManager.on('recap_now', () => recapEngine.forceNow?.());
            eventManager.on('bumper_now', () => bumperEngine.forceNow?.());
            eventManager.on('agenda_reset', () => {
                try { agendaEngine.reset?.(); } catch (e) { }
                try { autoNavigator.schedule(window.app?.currentModeInstance ? (new URLSearchParams(window.location.search).get('mode') || window.location.pathname.split('/').filter(Boolean).pop()) : null); } catch (e) { }
            });
            eventManager.on('tv_toggles', (payload) => {
                try {
                    if (payload && typeof payload.recapsEnabled === 'boolean') {
                        localStorage.setItem('tv_recaps_enabled', payload.recapsEnabled ? '1' : '0');
                        try { recapEngine.setEnabled?.(payload.recapsEnabled); } catch (e) { }
                    }
                    if (payload && typeof payload.bumpersEnabled === 'boolean') {
                        localStorage.setItem('tv_bumpers_enabled', payload.bumpersEnabled ? '1' : '0');
                    }
                } catch (e) { }
            });
        }
    } catch (e) { }

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
