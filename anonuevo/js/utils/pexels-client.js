/**
 * Pexels API Client
 * Busca imágenes y videos de alta calidad para el streaming.
 */

export class PexelsClient {
    constructor() {
        this.apiKey = localStorage.getItem('pexels_api_key') || '563492ad6f917000010000019036987158784400a9446067098e7275';
        this.baseUrl = 'https://api.pexels.com/v1';
        this.videoBaseUrl = 'https://api.pexels.com/videos';
    }

    /**
     * Establece la API Key
     * @param {string} key 
     */
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('pexels_api_key', key);
    }

    getHeaders() {
        return {
            'Authorization': this.apiKey
        };
    }

    /**
     * Busca fotos de un país o tema
     * @param {string} query Termino de busqueda (ej: "Japan landscape")
     * @param {number} perPage Cantidad de resultados
     * @returns {Promise<Array>}
     */
    async searchPhotos(query, perPage = 5) {
        if (!this.apiKey) {
            console.warn('[Pexels] No API Key set');
            return [];
        }

        try {
            const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
            const res = await fetch(url, { headers: this.getHeaders() });
            if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);

            const data = await res.json();
            return data.photos || [];
        } catch (e) {
            console.error('[Pexels] Search error:', e);
            return [];
        }
    }

    /**
     * Busca videos de un país o tema (para fondo dinámico)
     * @param {string} query 
     * @returns {Promise<Array>}
     */
    async searchVideos(query, perPage = 3) {
        if (!this.apiKey) return [];

        try {
            const url = `${this.videoBaseUrl}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&size=medium`;
            const res = await fetch(url, { headers: this.getHeaders() });
            if (!res.ok) throw new Error(`Pexels Video API error: ${res.status}`);

            const data = await res.json();
            return data.videos || [];
        } catch (e) {
            console.error('[Pexels] Video search error:', e);
            return [];
        }
    }

    /**
     * Obtiene una imagen aleatoria de alta calidad para un país
     * @param {string} countryName 
     */
    async getBestImageForCountry(countryName) {
        // Intentar queries variados para evitar siempre lo mismo
        const queries = [
            `${countryName} landscape`,
            `${countryName} city street`,
            `${countryName} nature`,
            `${countryName} culture`
        ];

        const q = queries[Math.floor(Math.random() * queries.length)];
        const photos = await this.searchPhotos(q, 10);

        if (photos.length > 0) {
            // Aleatorizar selección del set
            const pic = photos[Math.floor(Math.random() * photos.length)];
            return {
                url: pic.src.landscape || pic.src.large2x, // Priorizar alta calidad landscape
                photographer: pic.photographer,
                color: pic.avg_color,
                alt: pic.alt
            };
        }
        return null;
    }
}

export const pexelsClient = new PexelsClient();
