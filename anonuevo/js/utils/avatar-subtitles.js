/**
 * Avatar Subtitles Manager
 * Gestiona el avatar y los subtítulos durante la narración
 */

export class AvatarSubtitlesManager {
    constructor() {
        this.container = null;
        this.avatarElement = null;
        this.subtitlesElement = null;
        this.isVisible = false;
        this.currentWords = [];
        this.wordIndex = 0;
    }

    init(container) {
        this.container = container;
        this.createAvatarUI();
    }

    createAvatarUI() {
        // Contenedor del avatar y subtítulos
        const avatarContainer = document.createElement('div');
        avatarContainer.id = 'avatar-subtitles-container';
        avatarContainer.className = 'avatar-subtitles-container';
        
        // Avatar (imagen)
        this.avatarElement = document.createElement('div');
        this.avatarElement.className = 'avatar-image';
        this.avatarElement.style.backgroundImage = 'url(/avata-placeholder.png)';
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
     * Actualiza los subtítulos palabra por palabra
     * @param {string} text - Texto completo a mostrar
     * @param {number} wordsPerSecond - Velocidad de palabras por segundo
     */
    updateSubtitles(text, wordsPerSecond = 2.5) {
        if (!this.subtitlesElement) return;
        
        this.currentWords = text.split(' ');
        this.wordIndex = 0;
        
        // Limpiar intervalo anterior si existe
        if (this.subtitlesInterval) {
            clearInterval(this.subtitlesInterval);
        }
        
        const interval = 1000 / wordsPerSecond; // ms entre palabras
        
        this.subtitlesInterval = setInterval(() => {
            if (this.wordIndex < this.currentWords.length) {
                // Mostrar palabras acumuladas
                const wordsToShow = this.currentWords.slice(0, this.wordIndex + 1).join(' ');
                this.subtitlesElement.textContent = wordsToShow;
                this.wordIndex++;
            } else {
                clearInterval(this.subtitlesInterval);
            }
        }, interval);
    }

    /**
     * Actualiza subtítulos con texto completo (sin animación palabra por palabra)
     */
    setSubtitles(text) {
        if (this.subtitlesElement) {
            this.subtitlesElement.textContent = text;
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
