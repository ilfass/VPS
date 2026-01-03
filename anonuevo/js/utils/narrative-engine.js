
export class NarrativeEngine {
    constructor() {
        this.memory = new Set();
        this.maxMemorySize = 50; // Recordar los últimos 50 países
    }

    /**
     * Genera una narrativa rica para un país dado.
     * @param {object} country - Objeto con info del país
     * @param {string} localTime - Hora local formateada
     * @param {object} context - { dayOfVisit, theme, mode }
     * @returns {object} - { text: string, type: string, diaryEntry: object }
     */
    generateNarrative(country, localTime, context = {}) {
        const { dayOfVisit = 1, theme = 'HISTORY', mode = 'NARRATIVE' } = context;

        // Si es modo LOOP, usar contenido genérico o corto
        if (mode === 'LOOP') {
            return this.generateLoopContent(country, localTime);
        }

        let text = "";
        let diaryTopic = "";

        // Introducción contextualizada al día del viaje
        const intro = this.getDayIntro(country.name, dayOfVisit);

        // Selección de contenido basado en el TEMA del día
        // Nota: Como no tenemos datos etiquetados en country-info.js, simulamos la selección
        // usando índices o aleatoriedad ponderada, pero el texto introductorio da el contexto.

        let content = "";

        if (theme === 'CULTURE' && country.recommendations && country.recommendations.length > 0) {
            // Día 2: Cultura/Recomendaciones
            const rec = country.recommendations[Math.floor(Math.random() * country.recommendations.length)];
            content = `Si estuvieras aquí, ${rec}`;
            diaryTopic = `Día ${dayOfVisit}: Cultura y Vida Local`;
        } else if (theme === 'CURIOSITIES') {
            // Día 3: Curiosidades
            const fact = country.facts[Math.floor(Math.random() * country.facts.length)];
            content = `Un dato fascinante: ${fact}`;
            diaryTopic = `Día ${dayOfVisit}: Curiosidades`;
        } else {
            // Día 1: Historia/General (Default)
            const fact = country.facts[0]; // Usamos el primer fact que suele ser general
            content = `${fact}`;
            diaryTopic = `Día ${dayOfVisit}: Llegada y Contexto`;
        }

        text = `${intro} Son las ${localTime}. ${content}`;

        // Registrar en memoria
        this.addToMemory(country.id);

        return {
            text: text,
            type: theme,
            diaryEntry: {
                country: country.name,
                time: localTime,
                topic: diaryTopic,
                content: text
            }
        };
    }

    generateLoopContent(country, localTime) {
        const fact = country.facts[Math.floor(Math.random() * country.facts.length)];
        return {
            text: `En ${country.name}, son las ${localTime}. ${fact}`,
            type: 'LOOP',
            diaryEntry: {
                country: country.name,
                time: localTime,
                topic: "Resumen de Viaje",
                content: fact
            }
        };
    }

    getDayIntro(countryName, day) {
        if (day === 1) {
            return `Llegamos a ${countryName}. Comienza nuestro recorrido.`;
        } else if (day === 2) {
            return `Segundo día en ${countryName}. Hoy exploramos su cultura.`;
        } else {
            return `Último día en ${countryName}. Descubramos sus secretos finales.`;
        }
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
