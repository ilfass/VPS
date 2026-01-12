import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { COUNTRY_INFO } from '../data/country-info.js';
import { timeEngine } from '../utils/time.js';

// Mapeo de países a continentes
const CONTINENT_MAP = {
    '032': 'América del Sur', '076': 'América del Sur', '152': 'América del Sur', '170': 'América del Sur',
    '218': 'América del Sur', '484': 'América del Norte', '604': 'América del Sur', '840': 'América del Norte',
    '858': 'América del Sur', '124': 'América del Norte', '724': 'Europa', '250': 'Europa', '380': 'Europa',
    '826': 'Europa', '276': 'Europa', '528': 'Europa', '616': 'Europa'
};

export default class ContinenteMode {
    constructor(container) {
        this.container = container;
        this.currentContinent = null;
        this.countriesData = [];
        this.isNarrating = false;
    }

    async mount() {
        console.log('[Continente] Montando página de continente...');
        
        // Inicializar eventManager si no está inicializado
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        // Limpiar contenedor primero
        this.container.innerHTML = '';
        
        // Inicializar avatar INMEDIATAMENTE para que sea visible
        avatarSubtitlesManager.init(this.container);
        // Forzar visibilidad del avatar
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
        
        // Registrar handler para comandos de música (ANTES de cargar datos)
        eventManager.on('music_command', (musicState) => {
            console.log('[Continente] 🎵 Comando de música recibido:', musicState.command);
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
                if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                    audioManager.musicLayer.play().then(() => {
                        audioManager.isMusicPlaying = true;
                        audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    }).catch(e => console.warn('[Continente] Error iniciando música:', e));
                }
            }
        });
        
        // Cargar datos y empezar narración
        await this.loadContinentData();
        await this.startNarration();
        
        // Si Dream Mode está ON, cambiar automáticamente después de un tiempo
        if (eventManager.canProceedAuto()) {
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion'];
                    const randomPage = pages[Math.floor(Math.random() * pages.length)];
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000); // 30 segundos
        }
    }

    async loadContinentData() {
        try {
            // Obtener memorias de países
            const res = await fetch('/control-api/api/country-memory');
            if (res.ok) {
                const data = await res.json();
                const memories = data.memories || [];
                
                // Agrupar por continente
                const continentGroups = {};
                memories.forEach(m => {
                    const countryInfo = COUNTRY_INFO[m.countryId];
                    if (countryInfo) {
                        const continent = CONTINENT_MAP[m.countryId] || 'Otros';
                        if (!continentGroups[continent]) {
                            continentGroups[continent] = {
                                name: continent,
                                countries: [],
                                totalVisits: 0,
                                lastVisit: null
                            };
                        }
                        continentGroups[continent].countries.push({
                            id: m.countryId,
                            name: countryInfo.name,
                            visits: m.totalVisits || 0,
                            lastVisit: m.lastVisit
                        });
                        continentGroups[continent].totalVisits += (m.totalVisits || 0);
                        if (!continentGroups[continent].lastVisit || 
                            (m.lastVisit && new Date(m.lastVisit) > new Date(continentGroups[continent].lastVisit))) {
                            continentGroups[continent].lastVisit = m.lastVisit;
                        }
                    }
                });
                
                // Seleccionar continente con más visitas o el más reciente
                const continents = Object.values(continentGroups);
                if (continents.length > 0) {
                    this.currentContinent = continents.sort((a, b) => 
                        b.totalVisits - a.totalVisits || 
                        (b.lastVisit ? new Date(b.lastVisit) : 0) - (a.lastVisit ? new Date(a.lastVisit) : 0)
                    )[0];
                    this.countriesData = this.currentContinent.countries;
                } else {
                    // Si no hay datos, usar continente por defecto
                    this.currentContinent = { name: 'América del Sur', countries: [], totalVisits: 0 };
                }
            }
        } catch (e) {
            console.error('[Continente] Error cargando datos:', e);
            this.currentContinent = { name: 'América del Sur', countries: [], totalVisits: 0 };
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        // Generar texto narrativo
        const continentName = this.currentContinent.name;
        const countriesCount = this.countriesData.length;
        const totalVisits = this.currentContinent.totalVisits;
        
        // Texto inicial inmediato
        const immediateText = `Estamos explorando ${continentName}. Hasta ahora hemos visitado ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} en este continente, con un total de ${totalVisits} visita${totalVisits !== 1 ? 's' : ''}.`;
        
        // Mostrar subtítulos
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        // Generar texto completo con IA en paralelo
        const generateFullTextPromise = this.generateFullNarrative();
        
        // Empezar a hablar inmediatamente
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            // Esperar texto completo
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Continente] Error generando texto completo:', e);
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
        
        // Renderizar visualización
        this.renderVisualization();
    }

    async generateFullNarrative() {
        try {
            const prompt = `Genera un relato narrativo sobre el continente ${this.currentContinent.name}. 
            Hemos visitado ${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''}: ${this.countriesData.map(c => c.name).join(', ')}.
            El relato debe ser natural, fluido, reflexivo sobre la diversidad del continente, y adecuado para streaming.
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
            console.warn('[Continente] Error generando narrativa:', e);
        }
        
        // Fallback
        return `En ${this.currentContinent.name} hemos descubierto una rica diversidad de culturas y paisajes. 
        Cada país visitado nos ha enseñado algo único sobre la humanidad y nuestro planeta. 
        El viaje continúa, y con cada paso aprendemos más sobre este mundo que exploramos.`;
    }

    renderVisualization() {
        // Crear estructura visual con animaciones dinámicas
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            position: relative;
            overflow: hidden;
        `;
        
        // Agregar efectos de fondo animados
        const animatedBg = document.createElement('div');
        animatedBg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 30% 50%, rgba(74, 158, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 70% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
            animation: backgroundPulse 8s ease-in-out infinite;
            pointer-events: none;
            z-index: 0;
        `;
        wrapper.appendChild(animatedBg);
        
        // Agregar estilo de animación
        if (!document.getElementById('continente-animations')) {
            const style = document.createElement('style');
            style.id = 'continente-animations';
            style.textContent = `
                @keyframes backgroundPulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Título del continente con animación
        const title = document.createElement('h1');
        title.textContent = this.currentContinent.name;
        title.style.cssText = `
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            text-align: center;
            background: linear-gradient(135deg, #4a9eff 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: fadeInUp 0.8s ease-out;
            position: relative;
            z-index: 1;
        `;
        wrapper.appendChild(title);
        
        // Estadísticas con animación
        const stats = document.createElement('div');
        stats.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
            margin: 2rem 0;
            width: 100%;
            max-width: 1200px;
            position: relative;
            z-index: 1;
            animation: fadeInUp 1s ease-out 0.2s both;
        `;
        
        const statItems = [
            { label: 'Países Visitados', value: this.countriesData.length },
            { label: 'Total de Visitas', value: this.currentContinent.totalVisits },
            { label: 'Continente', value: this.currentContinent.name }
        ];
        
        statItems.forEach((item, index) => {
            const stat = document.createElement('div');
            stat.style.cssText = `
                background: rgba(74, 158, 255, 0.1);
                border: 1px solid rgba(74, 158, 255, 0.3);
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                animation: scaleIn 0.6s ease-out ${0.4 + index * 0.1}s both;
                transition: transform 0.3s, box-shadow 0.3s;
            `;
            stat.innerHTML = `
                <div style="font-size: 2.5rem; font-weight: 800; color: #4a9eff; margin-bottom: 0.5rem;">${item.value}</div>
                <div style="font-size: 0.9rem; color: #a0a0b0; text-transform: uppercase;">${item.label}</div>
            `;
            stat.onmouseenter = () => {
                stat.style.transform = 'scale(1.05) translateY(-5px)';
                stat.style.boxShadow = '0 10px 30px rgba(74, 158, 255, 0.3)';
            };
            stat.onmouseleave = () => {
                stat.style.transform = 'scale(1) translateY(0)';
                stat.style.boxShadow = 'none';
            };
            stats.appendChild(stat);
        });
        
        wrapper.appendChild(stats);
        
        // Lista de países con animación
        if (this.countriesData.length > 0) {
            const countriesList = document.createElement('div');
            countriesList.style.cssText = `
                width: 100%;
                max-width: 1200px;
                margin-top: 2rem;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
                position: relative;
                z-index: 1;
                animation: fadeInUp 1s ease-out 0.4s both;
            `;
            
            this.countriesData.forEach((country, index) => {
                const countryCard = document.createElement('div');
                countryCard.style.cssText = `
                    background: rgba(26, 26, 36, 0.8);
                    border: 1px solid rgba(74, 158, 255, 0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    text-align: center;
                    transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
                    animation: scaleIn 0.5s ease-out ${0.6 + index * 0.05}s both;
                `;
                countryCard.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${country.name}</div>
                    <div style="font-size: 0.85rem; color: #a0a0b0;">${country.visits} visita${country.visits !== 1 ? 's' : ''}</div>
                `;
                countryCard.onmouseenter = () => {
                    countryCard.style.transform = 'scale(1.08) translateY(-3px)';
                    countryCard.style.borderColor = 'rgba(74, 158, 255, 0.6)';
                    countryCard.style.boxShadow = '0 8px 20px rgba(74, 158, 255, 0.3)';
                };
                countryCard.onmouseleave = () => {
                    countryCard.style.transform = 'scale(1) translateY(0)';
                    countryCard.style.borderColor = 'rgba(74, 158, 255, 0.2)';
                    countryCard.style.boxShadow = 'none';
                };
                countriesList.appendChild(countryCard);
            });
            
            wrapper.appendChild(countriesList);
        }
        
        this.container.appendChild(wrapper);
    }

    unmount() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
