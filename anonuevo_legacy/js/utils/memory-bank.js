
export const PHRASE_STRUCTURES = {
    INTRO: [
        "Llegamos a {COUNTRY}.",
        "Esto es {COUNTRY}.",
        "Ahora visitamos {COUNTRY}.",
        "Nos adentramos en {COUNTRY}.",
        "Exploremos {COUNTRY}.",
        "Miren esto, estamos en {COUNTRY}.",
        "Nuestro viaje nos lleva a {COUNTRY}.",
        "Aterrizamos virtualmente en {COUNTRY}."
    ],
    CONNECTORS: [
        "Un detalle interesante es que",
        "Resulta fascinante que",
        "Pocos saben que",
        "Es curioso observar que",
        "La historia nos cuenta que",
        "En este lugar,"
    ],
    CLOSERS: [
        "Un lugar único.",
        "Algo para recordar.",
        "Impresionante.",
        "Así es este rincón del mundo.",
        "Seguimos viaje."
    ]
};

export class MemoryBank {
    constructor() {
        this.usedPhrases = new Set();
        this.recentStructures = []; // Cola de estructuras recientes para evitar monotonía sintáctica
        this.maxHistory = 10;
    }

    /**
     * Obtiene una frase de una categoría asegurando que no se haya usado recientemente.
     * @param {string} category - Clave de PHRASE_STRUCTURES (ej: 'INTRO')
     * @param {object} replacements - Objeto con valores a reemplazar (ej: {COUNTRY: 'Japón'})
     */
    getUniquePhrase(category, replacements = {}) {
        const templates = PHRASE_STRUCTURES[category];
        if (!templates) return "";

        // Filtrar frases usadas recientemente si es posible
        let available = templates.filter(t => !this.usedPhrases.has(this.hash(t)));

        // Si agotamos todas, reseteamos memoria para esa categoría (rotación)
        if (available.length === 0) {
            templates.forEach(t => this.usedPhrases.delete(this.hash(t)));
            available = templates;
        }

        // Selección aleatoria
        const selectedTemplate = available[Math.floor(Math.random() * available.length)];

        // Registrar uso
        this.usedPhrases.add(this.hash(selectedTemplate));
        this.pruneMemory();

        // Reemplazar placeholders
        let finalPhrase = selectedTemplate;
        for (const [key, value] of Object.entries(replacements)) {
            finalPhrase = finalPhrase.replace(`{${key}}`, value);
        }

        return finalPhrase;
    }

    hash(str) {
        // Hash simple para strings
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash;
    }

    pruneMemory() {
        // Mantener el set de frases usadas en un tamaño razonable para permitir reuso a largo plazo
        if (this.usedPhrases.size > 50) {
            // Eliminar arbitrariamente (o por antigüedad si implementáramos timestamp)
            // Aquí simplemente limpiamos todo para empezar ciclo nuevo
            this.usedPhrases.clear();
        }
    }
}

export const memoryBank = new MemoryBank();
