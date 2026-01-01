export default class MapaMode {
    constructor(container) {
        this.container = container;
    }

    mount() {
        this.container.innerHTML = `
            <div class="center-content fade-in">
                <h1 class="title-large">Mapa Global</h1>
                <p class="subtitle">Modo Mapa en construcción...</p>
                <div style="margin-top: 2rem; width: 80%; height: 50%; background: rgba(255,255,255,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 3rem; color: #555;">🗺️ Placeholder</span>
                </div>
            </div>
        `;
    }

    unmount() {
        this.container.innerHTML = '';
    }
}
