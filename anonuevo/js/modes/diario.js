import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';

export default class DiarioMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
    }

    async mount() {
        console.log('[Diario] Montando página de diario...');
        
        // Inicializar avatar y subtítulos
        avatarSubtitlesManager.init(this.container);
        avatarSubtitlesManager.show();
        
        // Inicializar audio
        await audioManager.init();
        audioManager.startMusic();
        
        // Desbloquear audio con interacción
        const enableAudio = () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.resume();
            }
            audioManager.tryStartAfterInteraction();
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Registrar handler para comandos de música
        eventManager.on('music_command', (musicState) => {
            console.log('[Diario] 🎵 Comando de música recibido:', musicState.command);
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
                if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                    audioManager.musicLayer.play().then(() => {
                        audioManager.isMusicPlaying = true;
                        audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    }).catch(e => console.warn('[Diario] Error iniciando música:', e));
                }
            }
        });
        
        // Cargar datos y empezar narración
        await this.loadDiaryEntries();
        this.renderDiary();
        await this.startNarration();
    }

    async loadDiaryEntries() {
        try {
            // Obtener entradas del diario desde el servidor
            const res = await fetch('/control-api/api/diary-entries');
            if (res.ok) {
                const data = await res.json();
                this.entries = data.entries || [];
            } else {
                // Fallback: generar desde memorias
                const memoryRes = await fetch('/control-api/api/country-memory');
                if (memoryRes.ok) {
                    const memoryData = await memoryRes.json();
                    const memories = memoryData.memories || [];
                    this.entries = [];
                    
                    for (const memory of memories.slice(0, 10)) {
                        try {
                            const countryMemory = await fetch(`/control-api/api/country-memory/${memory.countryId}`).then(r => r.json());
                            if (countryMemory.visits && countryMemory.visits.length > 0) {
                                const latestVisit = countryMemory.visits[countryMemory.visits.length - 1];
                                if (latestVisit.narrative) {
                                    this.entries.push({
                                        country: memory.countryName || `País ${memory.countryId}`,
                                        time: new Date(latestVisit.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                                        topic: latestVisit.isFirstVisit ? 'Primera Visita' : 'Visita Subsecuente',
                                        content: latestVisit.narrative.substring(0, 200) + (latestVisit.narrative.length > 200 ? '...' : ''),
                                        timestamp: latestVisit.timestamp
                                    });
                                }
                            }
                        } catch (e) {
                            console.warn(`[Diario] Error cargando memoria de ${memory.countryId}:`, e);
                        }
                    }
                } else {
                    this.entries = [];
                }
            }
            
            // Ordenar por timestamp (más recientes primero)
            this.entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // Limitar a 10 entradas más recientes
            this.entries = this.entries.slice(0, 10);
            
            console.log(`[Diario] Cargadas ${this.entries.length} entradas del diario`);
        } catch (e) {
            console.error('[Diario] Error cargando entradas:', e);
            this.entries = [];
        }
    }

    renderDiary() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            padding: 3rem;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const title = document.createElement('h1');
        title.textContent = 'Diario de Viaje';
        title.style.cssText = `
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 2rem;
            color: #4a9eff;
            text-align: center;
            border-bottom: 2px solid rgba(74, 158, 255, 0.3);
            padding-bottom: 1rem;
            width: 100%;
            max-width: 900px;
        `;
        wrapper.appendChild(title);
        
        const feed = document.createElement('div');
        feed.id = 'diary-feed';
        feed.style.cssText = `
            width: 100%;
            max-width: 900px;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        `;
        
        if (this.entries.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = `
                text-align: center;
                padding: 4rem;
                color: rgba(255, 255, 255, 0.5);
            `;
            empty.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1rem;">📔</div>
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">El diario está vacío</div>
                <div style="font-size: 1rem;">Las entradas aparecerán automáticamente durante el viaje</div>
            `;
            feed.appendChild(empty);
        } else {
            this.entries.forEach((entry, index) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'diary-entry';
                entryDiv.style.cssText = `
                    background: rgba(26, 26, 36, 0.8);
                    border: 1px solid rgba(74, 158, 255, 0.2);
                    border-left: 4px solid #4a9eff;
                    border-radius: 12px;
                    padding: 2rem;
                    transition: all 0.3s ease;
                    animation: fadeInUp 0.5s ease ${index * 0.1}s both;
                `;
                
                entryDiv.onmouseenter = () => {
                    entryDiv.style.transform = 'translateX(10px)';
                    entryDiv.style.borderColor = 'rgba(74, 158, 255, 0.5)';
                    entryDiv.style.boxShadow = '0 10px 30px rgba(74, 158, 255, 0.2)';
                };
                entryDiv.onmouseleave = () => {
                    entryDiv.style.transform = 'translateX(0)';
                    entryDiv.style.borderColor = 'rgba(74, 158, 255, 0.2)';
                    entryDiv.style.boxShadow = 'none';
                };
                
                const meta = document.createElement('div');
                meta.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                    color: #94a3b8;
                `;
                
                const countryTime = document.createElement('span');
                countryTime.textContent = `${entry.country} • ${entry.time}`;
                meta.appendChild(countryTime);
                
                const topic = document.createElement('span');
                topic.textContent = `#${entry.topic}`;
                topic.style.cssText = `
                    color: #4a9eff;
                    font-weight: 600;
                `;
                meta.appendChild(topic);
                
                const content = document.createElement('div');
                content.textContent = entry.content;
                content.style.cssText = `
                    font-size: 1.1rem;
                    line-height: 1.8;
                    color: #e8e8f0;
                `;
                
                entryDiv.appendChild(meta);
                entryDiv.appendChild(content);
                feed.appendChild(entryDiv);
            });
        }
        
        wrapper.appendChild(feed);
        this.container.appendChild(wrapper);
        
        // Agregar animación CSS
        if (!document.getElementById('diary-animations')) {
            const style = document.createElement('style');
            style.id = 'diary-animations';
            style.textContent = `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.NARRATIVE);
        
        // Generar narrativa sobre el diario
        const entriesCount = this.entries.length;
        const countries = [...new Set(this.entries.map(e => e.country))];
        const countriesCount = countries.length;
        
        // Texto inicial inmediato
        const immediateText = entriesCount > 0 
            ? `Este es mi diario de viaje. Hasta ahora he documentado ${entriesCount} entrada${entriesCount !== 1 ? 's' : ''} sobre ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} diferentes.`
            : `Este es mi diario de viaje. Aún no hay entradas, pero pronto comenzaré a documentar mis experiencias.`;
        
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
                console.warn('[Diario] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                    // Dream Mode: Cambiar automáticamente después de la narración
                    this.scheduleNextPage();
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                // Dream Mode: Cambiar automáticamente después de la narración
                this.scheduleNextPage();
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        const entriesCount = this.entries.length;
        const countries = [...new Set(this.entries.map(e => e.country))];
        const countriesCount = countries.length;
        const latestEntry = this.entries[0];
        
        const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real.

Estás mostrando tu diario de viaje que contiene ${entriesCount} entrada${entriesCount !== 1 ? 's' : ''} sobre ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} diferentes.
${latestEntry ? `La entrada más reciente es sobre ${latestEntry.country} y dice: "${latestEntry.content.substring(0, 100)}..."` : ''}

Genera una narrativa natural en primera persona que:
1. Explique qué es este diario y por qué lo mantienes
2. Mencione algunos de los países o experiencias documentadas
3. Reflexione sobre el valor de documentar el viaje
4. Sea personal y evocadora
5. Tenga entre 120 y 180 palabras
6. Use primera persona: "Este es mi diario...", "He documentado...", "Cada entrada representa..."

NO repitas literalmente las entradas del diario. Habla sobre el diario como concepto y reflexiona sobre su significado.`;

        try {
            const response = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (response.ok) {
                const data = await response.json();
                return data.narrative || null;
            }
        } catch (e) {
            console.warn('[Diario] Error generando narrativa:', e);
        }

        return null;
    }

    scheduleNextPage() {
        // Si Dream Mode está ON, cambiar automáticamente a otra página
        if (eventManager.canProceedAuto()) {
            console.log('[Diario] Dream Mode ON: Programando cambio de página...');
            // Esperar 2-3 segundos después de la narración para transición suave
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo'];
                    // Excluir la página actual para evitar repetir
                    const currentPage = 'diario';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Diario] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 2000 + Math.random() * 1000); // 2-3 segundos aleatorios
        }
    }

    unmount() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
