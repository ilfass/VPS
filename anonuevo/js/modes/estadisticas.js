import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { COUNTRY_INFO } from '../data/country-info.js';

export default class EstadisticasMode {
    constructor(container) {
        this.container = container;
        this.stats = {
            totalCountries: 0,
            totalVisits: 0,
            continents: {},
            themes: {}
        };
        this.isNarrating = false;
    }

    async mount() {
        console.log('[Estadísticas] Montando página de estadísticas...');
        
        // Limpiar contenedor primero
        this.container.innerHTML = '';
        
        // Inicializar avatar INMEDIATAMENTE
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        // Iniciar música de fondo
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        // Habilitar audio después de interacción
        const enableAudio = () => {
            audioManager.tryStartAfterInteraction();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
            }
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Registrar handler para comandos de música
        eventManager.on('music_command', (musicState) => {
            console.log('[Estadísticas] 🎵 Comando de música recibido:', musicState.command);
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
                if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                    audioManager.musicLayer.play().then(() => {
                        audioManager.isMusicPlaying = true;
                        audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    }).catch(e => console.warn('[Estadísticas] Error iniciando música:', e));
                }
            }
        });
        
        // Cargar datos y empezar narración
        await this.loadStats();
        this.renderDashboard();
        await this.startNarration();
        
        // Si Dream Mode está ON, cambiar automáticamente después de un tiempo
        if (eventManager.canProceedAuto()) {
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta'];
                    const randomPage = pages[Math.floor(Math.random() * pages.length)];
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000);
        }
    }

    async loadStats() {
        try {
            const res = await fetch('/control-api/api/country-memory');
            if (res.ok) {
                const data = await res.json();
                const memories = data.memories || [];
                
                this.stats.totalCountries = memories.length;
                this.stats.totalVisits = memories.reduce((sum, m) => sum + (m.totalVisits || 0), 0);
                
                // Agrupar por continente
                const CONTINENT_MAP = {
                    '032': 'América del Sur', '076': 'América del Sur', '152': 'América del Sur', '170': 'América del Sur',
                    '218': 'América del Sur', '484': 'América del Norte', '604': 'América del Sur', '840': 'América del Norte',
                    '858': 'América del Sur', '124': 'América del Norte', '724': 'Europa', '250': 'Europa', '380': 'Europa',
                    '826': 'Europa', '276': 'Europa', '528': 'Europa', '616': 'Europa'
                };
                
                memories.forEach(m => {
                    const continent = CONTINENT_MAP[m.countryId] || 'Otros';
                    if (!this.stats.continents[continent]) {
                        this.stats.continents[continent] = 0;
                    }
                    this.stats.continents[continent] += (m.totalVisits || 0);
                });
            }
        } catch (e) {
            console.error('[Estadísticas] Error cargando datos:', e);
        }
    }

    renderDashboard() {
        this.container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            padding: 2rem;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            overflow-y: auto;
        `;
        
        // Título
        const title = document.createElement('h1');
        title.textContent = 'Estadísticas del Viaje';
        title.style.cssText = `
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 2rem;
            text-align: center;
            background: linear-gradient(135deg, #4a9eff 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        `;
        wrapper.appendChild(title);
        
        // Grid de estadísticas principales
        const mainStats = document.createElement('div');
        mainStats.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
            max-width: 1400px;
            margin-left: auto;
            margin-right: auto;
        `;
        
        const statCards = [
            { label: 'Países Visitados', value: this.stats.totalCountries, color: '#4a9eff', icon: '🌍' },
            { label: 'Total de Visitas', value: this.stats.totalVisits, color: '#a855f7', icon: '📊' },
            { label: 'Continentes Explorados', value: Object.keys(this.stats.continents).length, color: '#22c55e', icon: '🗺️' },
            { label: 'Días Transcurridos', value: Math.floor((Date.now() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24)), color: '#f59e0b', icon: '📅' }
        ];
        
        statCards.forEach(stat => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(26, 26, 36, 0.8);
                border: 1px solid ${stat.color}40;
                border-radius: 16px;
                padding: 2rem;
                text-align: center;
                transition: transform 0.2s, border-color 0.2s;
            `;
            card.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">${stat.icon}</div>
                <div style="font-size: 3rem; font-weight: 800; color: ${stat.color}; margin-bottom: 0.5rem;">${stat.value}</div>
                <div style="font-size: 1rem; color: #a0a0b0; text-transform: uppercase; letter-spacing: 1px;">${stat.label}</div>
            `;
            card.onmouseenter = () => {
                card.style.transform = 'scale(1.05)';
                card.style.borderColor = stat.color + '80';
            };
            card.onmouseleave = () => {
                card.style.transform = 'scale(1)';
                card.style.borderColor = stat.color + '40';
            };
            mainStats.appendChild(card);
        });
        
        wrapper.appendChild(mainStats);
        
        // Gráfico de continentes
        if (Object.keys(this.stats.continents).length > 0) {
            const chartSection = document.createElement('div');
            chartSection.style.cssText = `
                max-width: 800px;
                margin: 0 auto 3rem;
                background: rgba(26, 26, 36, 0.8);
                border: 1px solid rgba(74, 158, 255, 0.3);
                border-radius: 16px;
                padding: 2rem;
            `;
            
            const chartTitle = document.createElement('h2');
            chartTitle.textContent = 'Visitas por Continente';
            chartTitle.style.cssText = `
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 1.5rem;
                color: #e8e8f0;
            `;
            chartSection.appendChild(chartTitle);
            
            const canvas = document.createElement('canvas');
            canvas.id = 'continents-chart';
            chartSection.appendChild(canvas);
            wrapper.appendChild(chartSection);
            
            // Crear gráfico con Chart.js
            setTimeout(() => {
                if (window.Chart) {
                    new Chart(canvas, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(this.stats.continents),
                            datasets: [{
                                data: Object.values(this.stats.continents),
                                backgroundColor: [
                                    'rgba(74, 158, 255, 0.8)',
                                    'rgba(168, 85, 247, 0.8)',
                                    'rgba(34, 197, 94, 0.8)',
                                    'rgba(245, 158, 11, 0.8)',
                                    'rgba(239, 68, 68, 0.8)'
                                ]
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#e8e8f0',
                                        font: { family: 'Inter', size: 14 }
                                    }
                                }
                            }
                        }
                    });
                }
            }, 100);
        }
        
        this.container.appendChild(wrapper);
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = `Estas son las estadísticas de nuestro viaje. Hemos visitado ${this.stats.totalCountries} país${this.stats.totalCountries !== 1 ? 'es' : ''}, con un total de ${this.stats.totalVisits} visita${this.stats.totalVisits !== 1 ? 's' : ''}. Hemos explorado ${Object.keys(this.stats.continents).length} continente${Object.keys(this.stats.continents).length !== 1 ? 's' : ''} diferentes.`;
        
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        const generateFullTextPromise = this.generateFullNarrative();
        
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Estadísticas] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            const continentsList = Object.keys(this.stats.continents).join(', ');
            const prompt = `Genera un relato narrativo reflexivo sobre las estadísticas del viaje. 
            Hemos visitado ${this.stats.totalCountries} países en ${Object.keys(this.stats.continents).length} continentes: ${continentsList}.
            Total de ${this.stats.totalVisits} visitas realizadas.
            El relato debe ser reflexivo sobre el progreso, la diversidad explorada, y lo que estos números significan en el contexto del viaje.
            Habla en primera persona como ilfass, el explorador digital.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                return data.narrative || null;
            }
        } catch (e) {
            console.warn('[Estadísticas] Error generando narrativa:', e);
        }
        
        return `Cada número representa un paso en este viaje. 
        Cada país visitado, cada continente explorado, nos acerca más a comprender la inmensidad y diversidad de nuestro planeta. 
        Estos números no son solo estadísticas, son historias, son experiencias, son momentos que han transformado nuestra perspectiva del mundo.`;
    }

    unmount() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
