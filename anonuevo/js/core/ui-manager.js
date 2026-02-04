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
        if (role === 'ILFASS') {
            ilfass.style.opacity = '1';
            companion.style.opacity = '0.3';
            subText.style.color = '#fff'; // White for Ilfass
        } else if (role === 'COMPANION') {
            ilfass.style.opacity = '0.3';
            companion.style.opacity = '1';
            subText.style.color = '#0ff'; // Cyan for Companion
        }
    }
}

export const uiManager = new UIManager();
