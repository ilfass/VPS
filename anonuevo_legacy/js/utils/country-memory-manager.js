/**
 * Country Memory Manager
 * Gestiona la memoria persistente de cada país visitado
 */

export class CountryMemoryManager {
    constructor() {
        this.memories = new Map(); // Cache local
        this.apiBase = '/control-api';
    }

    /**
     * Carga la memoria de un país desde el servidor
     * @param {string} countryId - ID del país
     * @returns {Promise<object>} Memoria del país o null si no existe
     */
    async loadCountryMemory(countryId) {
        // Verificar cache primero
        if (this.memories.has(countryId)) {
            return this.memories.get(countryId);
        }

        try {
            const response = await fetch(`${this.apiBase}/api/country-memory/${countryId}`);
            if (response.ok) {
                const memory = await response.json();
                this.memories.set(countryId, memory);
                return memory;
            }
        } catch (e) {
            console.warn(`[CountryMemory] Error loading memory for ${countryId}:`, e);
        }

        // Si no existe, crear estructura vacía
        return {
            countryId: countryId,
            visits: [],
            totalVisits: 0,
            lastVisit: null,
            accumulatedNarrative: ""
        };
    }

    /**
     * Guarda una nueva visita en la memoria del país
     * @param {string} countryId - ID del país
     * @param {object} visitData - Datos de la visita
     * @returns {Promise<boolean>} Éxito o fallo
     */
    async saveVisit(countryId, visitData) {
        try {
            const response = await fetch(`${this.apiBase}/api/country-memory/${countryId}/visit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visitData)
            });

            if (response.ok) {
                const updatedMemory = await response.json();
                this.memories.set(countryId, updatedMemory);
                return true;
            }
        } catch (e) {
            console.error(`[CountryMemory] Error saving visit for ${countryId}:`, e);
        }
        return false;
    }

    /**
     * Obtiene el contexto narrativo acumulado de un país
     * @param {string} countryId - ID del país
     * @returns {Promise<string>} Narrativa acumulada
     */
    async getAccumulatedNarrative(countryId) {
        const memory = await this.loadCountryMemory(countryId);
        return memory.accumulatedNarrative || "";
    }

    /**
     * Obtiene todas las visitas previas de un país
     * @param {string} countryId - ID del país
     * @returns {Promise<Array>} Array de visitas
     */
    async getPreviousVisits(countryId) {
        const memory = await this.loadCountryMemory(countryId);
        return memory.visits || [];
    }

    /**
     * Verifica si un país ha sido visitado antes
     * @param {string} countryId - ID del país
     * @returns {Promise<boolean>} True si ha sido visitado
     */
    async hasBeenVisited(countryId) {
        const memory = await this.loadCountryMemory(countryId);
        return memory.totalVisits > 0;
    }
}

export const countryMemoryManager = new CountryMemoryManager();
