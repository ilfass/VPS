/**
 * Avatar Subtitles Manager
 * Gestiona el avatar y los subtítulos durante la narración
 */

export class AvatarSubtitlesManager {
    constructor() {
        this.container = null;
        this.avatarElement = null;
        this.subtitlesElement = null;
        this.avatarContainerEl = null;
        this.isVisible = false;
        this.currentWords = [];
        this.wordIndex = 0;
    }

    init(container) {
        // Si ya está inicializado y tiene contenedor, no crear otro avatar
        if (this.container && document.getElementById('avatar-subtitles-container')) {
            // Solo actualizar el contenedor si es diferente
            if (this.container !== container) {
                // Mover el avatar existente al nuevo contenedor si es necesario
                const existingAvatar = document.getElementById('avatar-subtitles-container');
                if (existingAvatar && existingAvatar.parentNode !== container) {
                    container.appendChild(existingAvatar);
                }
            }
            this.container = container;
            return; // No crear otro avatar
        }
        this.container = container;
        this.createAvatarUI();
    }

    createAvatarUI() {
        // Contenedor del avatar y subtítulos
        const avatarContainer = document.createElement('div');
        avatarContainer.id = 'avatar-subtitles-container';
        avatarContainer.className = 'avatar-subtitles-container';
        avatarContainer.dataset.anchor = 'bl';
        this.avatarContainerEl = avatarContainer;

        // Avatar (imagen)
        this.avatarElement = document.createElement('div');
        this.avatarElement.className = 'avatar-image';
        this.avatarElement.style.backgroundImage = 'url(/assets/images/companion_avatar.png)';
        this.avatarElement.style.backgroundSize = 'cover';
        this.avatarElement.style.backgroundPosition = 'center';

        // Contenedor de subtítulos
        const subtitlesWrapper = document.createElement('div');
        subtitlesWrapper.className = 'subtitles-wrapper';

        this.subtitlesElement = document.createElement('div');
        this.subtitlesElement.className = 'subtitles-text';
        this.subtitlesElement.textContent = '';

        subtitlesWrapper.appendChild(this.subtitlesElement);

        avatarContainer.appendChild(this.avatarElement);
        avatarContainer.appendChild(subtitlesWrapper);

        this.container.appendChild(avatarContainer);
    }

    /**
     * Mueve el narrador a un ancla:
     * - bl (bottom-left), br, tl, tr
     */
    moveTo(anchor = 'bl') {
        const a = String(anchor || 'bl').toLowerCase();
        const el = document.getElementById('avatar-subtitles-container') || this.avatarContainerEl;
        if (!el) return;

        el.dataset.anchor = a;

        // Ajustar “lado” visual cuando está a la derecha
        if (a === 'br' || a === 'tr') {
            el.classList.add('right-sided');
        } else {
            el.classList.remove('right-sided');
        }
    }

    /**
     * Muestra el avatar y subtítulos
     */
    show() {
        // Si el avatar aún no está creado, crearlo primero
        if (!this.avatarElement || !this.subtitlesElement) {
            if (this.container) {
                this.createAvatarUI();
            } else {
                console.warn('[AvatarSubtitles] Container no inicializado');
                return;
            }
        }

        const container = document.getElementById('avatar-subtitles-container');
        if (container) {
            container.classList.add('visible');
            this.isVisible = true;
        }
    }

    /**
     * Oculta el avatar y subtítulos
     */
    hide() {
        const container = document.getElementById('avatar-subtitles-container');
        if (container) {
            container.classList.remove('visible');
            this.isVisible = false;
        }
        this.clearSubtitles();
    }

    /**
     * Actualiza los subtítulos palabra por palabra (máximo 2 líneas, no acumulativo)
     * @param {string} text - Texto completo a mostrar
     * @param {number} wordsPerSecond - Velocidad de palabras por segundo
     */
    updateSubtitles(text, wordsPerSecond = 2.5) {
        if (!this.subtitlesElement) return;

        // Limpiar texto antes de procesar
        text = this.cleanText(text);

        this.currentWords = text.split(' ').filter(w => w.trim().length > 0);
        this.wordIndex = 0;
        this.displayedWords = []; // Palabras actualmente mostradas (máximo para 2 líneas)

        // Limpiar intervalo anterior si existe
        if (this.subtitlesInterval) {
            clearInterval(this.subtitlesInterval);
        }

        const interval = 1000 / wordsPerSecond; // ms entre palabras
        const maxWordsPerLine = 8; // Aproximadamente 8 palabras por línea
        const maxTotalWords = maxWordsPerLine * 2; // Máximo 2 líneas

        this.subtitlesInterval = setInterval(() => {
            if (this.wordIndex < this.currentWords.length) {
                // Agregar nueva palabra
                this.displayedWords.push(this.currentWords[this.wordIndex]);

                // Si excede el máximo, eliminar la primera palabra
                if (this.displayedWords.length > maxTotalWords) {
                    this.displayedWords.shift();
                }

                // Mostrar solo las palabras actuales (no acumulativo)
                const wordsToShow = this.displayedWords.join(' ');
                this.subtitlesElement.textContent = wordsToShow;
                this.wordIndex++;
            } else {
                clearInterval(this.subtitlesInterval);
                // Mantener las últimas palabras visibles por un momento antes de limpiar
                setTimeout(() => {
                    if (this.wordIndex >= this.currentWords.length) {
                        this.clearSubtitles();
                    }
                }, 2000);
            }
        }, interval);
    }

    /**
     * Limpia el texto eliminando caracteres de escape y debugging
     */
    cleanText(text) {
        if (!text || typeof text !== 'string') return '';

        // Eliminar caracteres de escape
        text = text.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\'/g, "'");

        // Eliminar texto de debugging
        text = text.replace(/Let's count words:.*?words\./gi, '');
        text = text.replace(/Words:.*?words\./gi, '');
        text = text.replace(/\d+ words?\./gi, '');
        text = text.replace(/Good\. Meets \d+-\d+\./gi, '');
        text = text.replace(/We included.*?Should be fine\./gi, '');
        text = text.replace(/Meets \d+-\d+\./gi, '');
        text = text.replace(/Good\./gi, '');
        text = text.replace(/Use purely Spanish\./gi, '');
        text = text.replace(/Should be fine\./gi, '');
        text = text.replace(/\[.*?\]/g, '');
        text = text.replace(/\{.*?\}/g, '');

        // Limpiar espacios múltiples
        text = text.replace(/\s+/g, ' ').trim();

        // Filtrar líneas de debugging
        const lines = text.split('.');
        text = lines.filter(line => {
            const lower = line.toLowerCase().trim();
            return !lower.includes('tool_calls') &&
                !lower.includes('json') &&
                !lower.startsWith('illones') &&
                !lower.includes('count words') &&
                !lower.includes('meets') &&
                lower.length > 5;
        }).join('. ').trim();

        return text;
    }

    /**
     * Actualiza subtítulos con texto completo (sin animación palabra por palabra)
     */
    setSubtitles(text) {
        if (this.subtitlesElement) {
            // Limpiar texto antes de mostrar
            const cleanedText = this.cleanText(text);
            // Limitar a 2 líneas
            const words = cleanedText.split(' ').filter(w => w.trim().length > 0);
            const maxWords = 16; // Aproximadamente 2 líneas
            const displayText = words.length > maxWords
                ? words.slice(-maxWords).join(' ')
                : cleanedText;
            this.subtitlesElement.textContent = displayText;
        }
    }

    /**
     * Limpia los subtítulos
     */
    clearSubtitles() {
        if (this.subtitlesElement) {
            this.subtitlesElement.textContent = '';
        }
        if (this.subtitlesInterval) {
            clearInterval(this.subtitlesInterval);
            this.subtitlesInterval = null;
        }
        this.currentWords = [];
        this.wordIndex = 0;
    }

    /**
     * Actualiza la imagen del avatar
     */
    setAvatarImage(url) {
        if (this.avatarElement) {
            this.avatarElement.style.backgroundImage = `url(${url})`;
        }
    }
}

export const avatarSubtitlesManager = new AvatarSubtitlesManager();
