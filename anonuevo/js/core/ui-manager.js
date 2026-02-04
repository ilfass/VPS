class UIManager {
    constructor() {
        this.statusEl = null;
        this.activityEl = null;
    }

    init() {
        this.statusEl = document.getElementById('system-status');
        this.activityEl = document.getElementById('ai-activity');
        console.log("[UIManager] Interfaz lista.");
    }

    updateStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
    }

    showThinking(isThinking) {
        if (this.activityEl) {
            this.activityEl.textContent = isThinking ? "IA Generando..." : "Escaneando...";
            this.activityEl.style.color = isThinking ? "#ffff00" : "#0f0";
        }
    }

    showSubtitle(text, role) {
        const container = document.getElementById('dialogue-container');
        const subText = document.getElementById('subtitle-text');
        const ilfass = document.getElementById('avatar-ilfass');
        const companion = document.getElementById('avatar-companion');

        if (!container || !subText) return;

        if (!text) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        subText.textContent = text;

        // Highlight active avatar
        // Highlight active avatar
        ilfass.classList.remove('talking');
        companion.classList.remove('talking');
        ilfass.style.opacity = '0.5';
        companion.style.opacity = '0.5';

        if (role === 'ILFASS') {
            ilfass.classList.add('talking');
            ilfass.style.opacity = '1';
            subText.style.color = '#e0f7fa';
        } else if (role === 'COMPANION') {
            companion.classList.add('talking');
            companion.style.opacity = '1';
            subText.style.color = '#fce4ec';
        }
    }
}

export const uiManager = new UIManager();
