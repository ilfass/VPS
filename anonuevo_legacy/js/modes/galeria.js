import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { createTvScene } from '../utils/tv-scene.js';
import { pexelsClient } from '../utils/pexels-client.js';
import { NarratorDirector } from '../utils/narrator-director.js';

export default class GaleriaMode {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.timer = null;
        this.narratorDirector = null;
        this.currentKeyword = 'World';
    }

    async mount() {
        if (!eventManager.pollInterval) eventManager.init();
        if (!audioManager.musicLayer) audioManager.init();
        if (!audioManager.isMusicPlaying) audioManager.startAmbience();

        // 1. Setup Scene (TV Style)
        this.container.innerHTML = '';
        this.scene = createTvScene({
            modeId: 'galeria',
            title: 'GALERÍA',
            subtitle: 'Archivo Visual Global',
            accent: '#eAB308' // Amber
        });
        this.container.appendChild(this.scene.root);

        // 2. Setup Narrator
        avatarSubtitlesManager.init(this.scene.root);
        avatarSubtitlesManager.show();
        avatarSubtitlesManager.moveTo('tr');
        this.narratorDirector = new NarratorDirector(avatarSubtitlesManager);
        this.narratorDirector.start({ intervalMs: 15000 });

        // 3. Build Layout
        this.scene.main.innerHTML = `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                <div style="width: 85%; height: 75%; position:relative; border-radius: 8px; overflow:hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 60px rgba(0,0,0,0.6);">
                    <img id="gal-img" style="width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 1s ease;">
                    <div id="gal-cap" style="position:absolute; bottom:0; left:0; right:0; padding:30px 20px 20px; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); color:white; font-family:'JetBrains Mono'; font-size:14px; opacity:0; transform: translateY(20px); transition: all 0.5s ease;">
                        // CARGANDO...
                    </div>
                </div>
            </div>
        `;

        this.imgEl = this.scene.main.querySelector('#gal-img');
        this.capEl = this.scene.main.querySelector('#gal-cap');

        // 4. Determine Context
        const lastCountry = localStorage.getItem('last_country_name');
        this.currentKeyword = lastCountry || 'Humanity';

        this.scene.setStatus('LIVE');
        this.scene.setTicker(`Explorando archivo visual: ${this.currentKeyword.toUpperCase()}`);

        // 5. Start Cycle
        this.showNextImage();
        this.timer = setInterval(() => this.showNextImage(), 12000); // 12s por foto

        // Reportar telemetry
        try { eventManager.reportTelemetry('GALERIA', 'GLOBAL', 0); } catch (e) { }
    }

    async showNextImage() {
        if (!this.imgEl) return;

        // Fade out
        this.imgEl.style.opacity = '0';
        this.capEl.style.opacity = '0';
        this.capEl.style.transform = 'translateY(20px)';

        // Wait minor delay
        await new Promise(r => setTimeout(r, 600));

        // Fetch
        const imageData = await pexelsClient.getBestImageForCountry(this.currentKeyword);

        if (imageData) {
            this.imgEl.src = imageData.url;
            this.imgEl.onload = () => {
                this.imgEl.style.opacity = '1';
                this.capEl.textContent = `// ${this.currentKeyword.toUpperCase()} | PH: ${imageData.photographer}`;
                this.capEl.style.opacity = '1';
                this.capEl.style.transform = 'translateY(0)';

                // Update ticker occasionally
                if (Math.random() > 0.5) this.scene.setTicker(`Visualización: ${imageData.alt || 'Sin descripción'}`);
            };
        } else {
            // Retry with generic
            if (this.currentKeyword !== 'Nature') {
                this.currentKeyword = 'Nature';
                this.showNextImage();
            }
        }
    }

    unmount() {
        if (this.timer) clearInterval(this.timer);
        if (this.narratorDirector) this.narratorDirector.stop();
        if (this.scene) this.scene.destroy();
        this.container.innerHTML = '';
    }
}

