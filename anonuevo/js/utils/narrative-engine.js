
export class NarrativeEngine {
    constructor() {
        this.memory = new Set();
        this.maxMemorySize = 50; // Recordar los últimos 50 países
    }

    /**
     * Genera una narrativa rica para un país dado.
     * @param {object} country - Objeto con info del país (name, region, facts, recommendations, etc.)
     * @param {string} localTime - Hora local formateada
     * @returns {object} - { text: string, type: string, diaryEntry: object }
     */
    generateNarrative(country, localTime) {
        // 1. Elegir enfoque (Curiosidad, Recomendación, Reflexión)
        const mode = this.selectMode(country);

        let text = "";
        let diaryTopic = "";

        // Introducción variable
        const intro = this.getRandomIntro(country.name);

        if (mode === 'RECOMMENDATION' && country.recommendations && country.recommendations.length > 0) {
            const rec = country.recommendations[Math.floor(Math.random() * country.recommendations.length)];
            text = `${intro} Son las ${localTime}. Si estuvieras aquí, ${rec}`;
            diaryTopic = "Recomendación de Viaje";
        } else {
            // Default: Fact/Curiosidad
            const fact = country.facts[Math.floor(Math.random() * country.facts.length)];
            text = `${intro} Son las ${localTime}. ${fact}`;
            diaryTopic = "Curiosidad Local";
        }

        // Registrar en memoria
        this.addToMemory(country.id);

        return {
            text: text,
            type: mode,
            diaryEntry: {
                country: country.name,
                time: localTime,
                topic: diaryTopic,
                content: text
            }
        };
    }

    selectMode(country) {
        // 20% probabilidad de recomendación si existen
        if (country.recommendations && Math.random() < 0.2) {
            return 'RECOMMENDATION';
        }
        return 'FACT';
    }

    getRandomIntro(countryName) {
        const intros = [
            `Llegamos a ${countryName}.`,
            `Esto es ${countryName}.`,
            `Ahora visitamos ${countryName}.`,
            `Nos adentramos en ${countryName}.`,
            `Exploremos ${countryName}.`,
            `Miren esto, estamos en ${countryName}.`,
            `Nuestro viaje nos lleva a ${countryName}.`,
            `Aterrizamos virtualmente en ${countryName}.`
        ];
        return intros[Math.floor(Math.random() * intros.length)];
    }

    addToMemory(countryId) {
        this.memory.add(countryId);
        if (this.memory.size > this.maxMemorySize) {
            const first = this.memory.values().next().value;
            this.memory.delete(first);
        }
    }

    isRecentlyVisited(countryId) {
        return this.memory.has(countryId);
    }
}

export const narrativeEngine = new NarrativeEngine();
