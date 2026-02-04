// Proveedor de Noticias Internacionales (Real-time Observer)
// Obtiene titulares desde el servidor (/control-api), que agrega múltiples fuentes (RSS/JSON)
// sin depender de proxies CORS en el navegador.

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
        try {
            // Pedir “pulso” (server-side aggregator). Incluye WORLD/SCIENCE/TECH y más.
            const res = await fetch('/control-api/api/observer/pulse?lang=es-419&geo=US&cc=ES&max=10');
            if (res.ok) {
                const data = await res.json();
                const blocks = data?.blocks || {};
                const commentary = (data?.commentary || '').trim();

                // 1) Si el servidor generó comentario (tendencias + contexto), lo priorizamos como “pieza” de noticias.
                if (commentary && this.isValidNews('Pulso del mundo', commentary)) {
                    allNews.push({
                        title: 'Pulso del mundo',
                        summary: commentary,
                        source: 'Observador en tiempo real',
                        url: null
                    });
                }

                const merged = []
                    .concat(blocks.news || [])
                    .concat(blocks.scitech || [])
                    .concat(blocks.health || []);

                for (const it of merged) {
                    const title = it?.title || '';
                    const summary = it?.summary || '';
                    if (this.isValidNews(title, summary)) {
                        allNews.push({
                            title,
                            summary: summary || title,
                            source: it?.source || 'Actualidad Internacional',
                            url: it?.url || null
                        });
                    }
                }
            }
        } catch (e) {
            console.warn(`Error fetching observer pulse:`, e);
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
