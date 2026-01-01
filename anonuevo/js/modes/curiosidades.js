import { scheduler } from '../utils/scheduler.js';

const FACTS = [
    { category: "Espacio", text: "Un día en Venus es más largo que un año en Venus." },
    { category: "Tecnología", text: "El primer mouse de computadora estaba hecho de madera." },
    { category: "Biología", text: "Los pulpos tienen tres corazones y sangre azul." },
    { category: "Historia", text: "Cleopatra vivió más cerca de la invención del iPhone que de la construcción de la Gran Pirámide." },
    { category: "Física", text: "Si pudieras doblar una hoja de papel 42 veces, llegaría hasta la Luna." },
    { category: "Naturaleza", text: "Las abejas pueden reconocer rostros humanos." },
    { category: "Geografía", text: "Rusia tiene una superficie mayor que Plutón." }
];

export default class CuriosidadesMode {
    constructor(container) {
        this.container = container;
        this.currentIndex = 0;
        this.intervalId = null;
    }

    mount() {
        this.container.innerHTML = `
            <div class="center-content fade-in">
                <div class="fact-card" id="fact-card">
                    <span class="fact-category" id="fact-category">Cargando...</span>
                    <p class="fact-text" id="fact-text">Preparando datos curiosos...</p>
                </div>
            </div>
        `;

        this.categoryEl = this.container.querySelector('#fact-category');
        this.textEl = this.container.querySelector('#fact-text');
        this.cardEl = this.container.querySelector('#fact-card');

        // Mostrar primer dato
        this.showNextFact();

        // Configurar rotación cada 15 segundos
        this.intervalId = setInterval(() => this.showNextFact(), 15000);
    }

    showNextFact() {
        // Animación de salida
        this.cardEl.style.opacity = '0';
        this.cardEl.style.transform = 'translateY(20px)';

        setTimeout(() => {
            // Cambiar contenido
            const fact = FACTS[this.currentIndex];
            this.categoryEl.textContent = fact.category;
            this.textEl.textContent = fact.text;

            this.currentIndex = (this.currentIndex + 1) % FACTS.length;

            // Animación de entrada
            this.cardEl.style.opacity = '1';
            this.cardEl.style.transform = 'translateY(0)';
        }, 500);
    }

    unmount() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.container.innerHTML = '';
    }
}
