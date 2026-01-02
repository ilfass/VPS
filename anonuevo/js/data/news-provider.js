// Proveedor de Noticias Internacionales
// Obtiene feeds RSS a través de un proxy CORS y normaliza los datos.

const RSS_FEEDS = [
    // Ciencia y Tecnología (El País)
    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia/portada',
    // Tecnología (BBC Mundo)
    'https://www.bbc.com/mundo/temas/tecnologia/index.xml',
    // Ciencia (BBC Mundo)
    'https://www.bbc.com/mundo/temas/ciencia/index.xml',
    // National Geographic España (Ciencia)
    'https://www.nationalgeographic.com.es/feeds/rss/ciencia',
    // Muy Interesante (Curiosidades/Ciencia)
    'https://www.muyinteresante.com.mx/feed'
];

const NEWS_INTRO_TEMPLATES = [
    "Una noticia que está recorriendo el mundo...",
    "Desde distintos puntos del planeta, llega esta novedad...",
    "Algo que está ocurriendo ahora mismo...",
    "Información reciente de actualidad internacional...",
    "En el ámbito de la ciencia y el descubrimiento...",
    "Actualizando información global...",
    "Un dato relevante de las últimas horas..."
];

const BLACKLIST_KEYWORDS = [
    "guerra", "muerte", "asesinato", "política", "crisis", "ataque", "violencia",
    "fallece", "tragedia", "accidente", "policial", "robo", "crimen", "bomba",
    "misil", "ejército", "militar", "secuestro", "violación", "cárcel"
];

export class NewsProvider {
    constructor() {
        this.seenTitles = new Set();
        this.cache = [];
        this.lastFetch = 0;
    }

    async fetchNews() {
        // Si tenemos caché reciente (menos de 1 hora) y con items, usarlo
        if (Date.now() - this.lastFetch < 3600000 && this.cache.length > 0) {
            return this.popNextNews();
        }

        console.log("📡 Buscando nuevas noticias internacionales...");
        const allNews = [];

        // Seleccionar 2 feeds al azar para no sobrecargar
        const feedsToFetch = RSS_FEEDS.sort(() => 0.5 - Math.random()).slice(0, 2);

        for (const url of feedsToFetch) {
            try {
                // Usar allorigins como proxy CORS
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (data.contents) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(data.contents, "text/xml");
                    const items = xmlDoc.querySelectorAll("item");

                    items.forEach(item => {
                        const title = item.querySelector("title")?.textContent || "";
                        const description = item.querySelector("description")?.textContent || "";

                        // Limpieza básica de HTML en descripción
                        const cleanDesc = description.replace(/<[^>]*>?/gm, '').substring(0, 200);

                        if (this.isValidNews(title, cleanDesc)) {
                            allNews.push({
                                title: title,
                                summary: cleanDesc,
                                source: "Actualidad Internacional"
                            });
                        }
                    });
                }
            } catch (e) {
                console.warn(`Error fetching feed ${url}:`, e);
            }
        }

        // Mezclar y guardar en caché
        this.cache = allNews.sort(() => 0.5 - Math.random());
        this.lastFetch = Date.now();

        return this.popNextNews();
    }

    isValidNews(title, summary) {
        const text = (title + " " + summary).toLowerCase();

        // 1. Filtro de duplicados
        if (this.seenTitles.has(title)) return false;

        // 2. Filtro de palabras prohibidas (No política/guerra)
        if (BLACKLIST_KEYWORDS.some(word => text.includes(word))) return false;

        // 3. Longitud mínima
        if (title.length < 10) return false;

        return true;
    }

    popNextNews() {
        if (this.cache.length === 0) return null;

        const newsItem = this.cache.pop();
        this.seenTitles.add(newsItem.title);

        // Limitar memoria de vistos
        if (this.seenTitles.size > 100) {
            const iterator = this.seenTitles.values();
            this.seenTitles.delete(iterator.next().value);
        }

        return newsItem;
    }

    getRandomIntro() {
        return NEWS_INTRO_TEMPLATES[Math.floor(Math.random() * NEWS_INTRO_TEMPLATES.length)];
    }
}

export const newsProvider = new NewsProvider();
