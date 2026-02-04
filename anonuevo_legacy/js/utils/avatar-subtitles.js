/**
 * Avatar Subtitles Manager
 * Gestiona el avatar y los subtítulos durante la narración
 * Soporta dos avatares simultáneos: Ilfass (Izquierda) y Companion (Derecha)
 */

export class AvatarSubtitlesManager {
    constructor() {
        this.container = null;

        // Elementos para Ilfass
        this.ilfass = {
            container: null,
            avatar: null,
            subtitles: null,
            words: [],
            wordIndex: 0,
            interval: null
        };

        // Elementos para Companion
        this.companion = {
            container: null,
            avatar: null,
            subtitles: null,
            words: [],
            wordIndex: 0,
            interval: null
        };

        this.currentRole = 'ilfass'; // Rol activo que está hablando
        this.isVisible = false;
    }

    init(container) {
        this.container = container;

        // LIMPIEZA: Si existe el contenedor antiguo (single), borrarlo
        const legacy = document.getElementById('avatar-subtitles-container');
        if (legacy) legacy.remove();

        // Si ya existen los nuevos, no recrear
        if (document.getElementById('avatar-ilfass-container') && document.getElementById('avatar-companion-container')) {
            return;
        }

        this.createAvatarUI();
    }

    createAvatarUI() {
        if (!this.container) return;

        // --- ILFASS (Izquierda) ---
        // Imagen fija, sin sprite
        this.ilfass.container = this.buildAvatarStructure('ilfass', 'bl', '/assets/images/ilfass_avatar.png');
        this.ilfass.avatar = this.ilfass.container.querySelector('.avatar-image');
        this.ilfass.subtitles = this.ilfass.container.querySelector('.subtitles-text');
        this.container.appendChild(this.ilfass.container);

        // --- COMPANION (Derecha) ---
        // Usamos sprite para Companion
        this.companion.container = this.buildAvatarStructure('companion', 'br', '/assets/images/avatar_sprite.png');
        this.companion.container.classList.add('right-sided'); // Invertir orden flex
        this.companion.avatar = this.companion.container.querySelector('.avatar-image');
        this.companion.avatar.classList.add('is-sprite'); // Habilitar animación sprite
        this.companion.subtitles = this.companion.container.querySelector('.subtitles-text');
        this.container.appendChild(this.companion.container);

        // Inicializar estado visual
        this.activateRole('ilfass');
    }

    buildAvatarStructure(id, anchor, imageUrl) {
        const container = document.createElement('div');
        container.id = `avatar-${id}-container`;
        container.className = 'avatar-subtitles-container';
        container.dataset.anchor = anchor;
        container.dataset.role = id;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'avatar-image';
        avatar.style.backgroundImage = `url(${imageUrl})`;

        // Estilos base para sprite vs imagen normal
        if (imageUrl.includes('sprite')) {
            avatar.style.backgroundSize = '200% 100%';
        } else {
            avatar.style.backgroundSize = 'cover';
        }
        avatar.style.backgroundPosition = '0 0';

        // Subtítulos wrapper
        const subWrapper = document.createElement('div');
        subWrapper.className = 'subtitles-wrapper';

        const subText = document.createElement('div');
        subText.className = 'subtitles-text';
        subWrapper.appendChild(subText);

        container.appendChild(avatar);
        container.appendChild(subWrapper);

        return container;
    }

    getActor(role) {
        return role === 'companion' ? this.companion : this.ilfass;
    }

    /**
     * Activa visualmente al rol que va a hablar
     */
    activateRole(role) {
        this.currentRole = role;

        const active = this.getActor(role);
        const inactive = this.getActor(role === 'ilfass' ? 'companion' : 'ilfass');

        // Resaltar activo
        if (active.container) {
            active.container.classList.remove('dimmed');
            active.container.style.opacity = '1';
            active.container.classList.add('visible');
        }

        // Atenuar inactivo (opcional, para dar foco)
        if (inactive.container) {
            inactive.container.classList.add('dimmed');
            // Mantenemos visible pero un poco transparente
            inactive.container.style.opacity = '0.6';
            inactive.container.classList.add('visible');
        }
    }

    /**
     * Muestra ambos avatares
     */
    show() {
        if (!this.ilfass.container || !this.companion.container) {
            this.createAvatarUI();
        }

        // Mostrar ambos
        requestAnimationFrame(() => {
            if (this.ilfass.container) this.ilfass.container.classList.add('visible');
            if (this.companion.container) this.companion.container.classList.add('visible');
            this.isVisible = true;
            this.activateRole(this.currentRole || 'ilfass');
        });
    }

    hide() {
        if (this.ilfass.container) this.ilfass.container.classList.remove('visible');
        if (this.companion.container) this.companion.container.classList.remove('visible');
        this.isVisible = false;
        this.clearSubtitles();
    }

    /**
     * Muestra animación de "hablando" solo en el rol activo
     */
    setSpeaking(isSpeaking) {
        const actor = this.getActor(this.currentRole);
        if (!actor || !actor.avatar) return;

        if (isSpeaking) {
            actor.avatar.classList.add('speaking');
        } else {
            actor.avatar.classList.remove('speaking');
        }

        // Asegurar que el otro no se mueva
        const other = this.getActor(this.currentRole === 'ilfass' ? 'companion' : 'ilfass');
        if (other && other.avatar) {
            other.avatar.classList.remove('speaking');
        }
    }

    // --- Subtitles Logic (Duplicated/Delegated for current role) ---

    updateSubtitles(text, wordsPerSecond = 2.5) {
        const actor = this.getActor(this.currentRole);
        if (!actor.subtitles) return;

        text = this.cleanText(text);
        actor.words = text.split(' ').filter(w => w.trim().length > 0);
        actor.wordIndex = 0;

        let displayedWords = [];

        if (actor.interval) clearInterval(actor.interval);

        const intervalMs = 1000 / wordsPerSecond;
        const maxWords = 16; // 8x2 lines

        actor.interval = setInterval(() => {
            if (actor.wordIndex < actor.words.length) {
                displayedWords.push(actor.words[actor.wordIndex]);
                if (displayedWords.length > maxWords) displayedWords.shift();

                actor.subtitles.textContent = displayedWords.join(' ');
                actor.wordIndex++;
            } else {
                clearInterval(actor.interval);
                setTimeout(() => {
                    if (actor.wordIndex >= actor.words.length) {
                        // Opcional: limpiar texto al terminar
                        // actor.subtitles.textContent = '';
                    }
                }, 2000);
            }
        }, intervalMs);
    }

    cleanText(text) {
        if (!text) return '';
        let clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        clean = clean.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
        return clean;
    }

    setSubtitles(text) {
        const actor = this.getActor(this.currentRole);
        if (actor.subtitles) actor.subtitles.textContent = text;
    }

    clearSubtitles() {
        // Limpiar ambos para evitar textos colgados
        [this.ilfass, this.companion].forEach(a => {
            if (a.subtitles) a.subtitles.textContent = '';
            if (a.interval) clearInterval(a.interval);
            a.words = [];
        });
    }

    // Métodos legacy/compatibilidad para evitar crash si alguien llama lo viejo
    setAvatarImage() { }
    moveTo() { }
}

export const avatarSubtitlesManager = new AvatarSubtitlesManager();
