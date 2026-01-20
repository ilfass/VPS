// Circuito de streaming (Dream Mode / rotación automática)
// Mantenerlo centralizado evita listas duplicadas por modo.

export const STREAM_ROTATION = [
    'mapa',
    'diario',
    'curiosidades',
    'continente',
    'ruta',
    'estadisticas',
    'galeria',
    'globo',
    'clima',
    'aereo',
    'satelites',
    'terremotos',
    'aire',
    'incendios',
    'sol',
    'ciudad'
];

export function getModeLabel(mode) {
    const labels = {
        mapa: 'Mapa Global',
        diario: 'Diario',
        curiosidades: 'Curiosidades',
        continente: 'Continente',
        ruta: 'Ruta',
        estadisticas: 'Estadísticas',
        galeria: 'Galería',
        globo: 'Globo 3D',
        clima: 'Clima',
        aereo: 'Tráfico Aéreo',
        satelites: 'Satélites',
        terremotos: 'Terremotos',
        aire: 'Calidad del Aire',
        incendios: 'Incendios',
        sol: 'Actividad Solar',
        ciudad: 'Ciudad en vivo'
    };
    return labels[mode] || mode;
}

function loadRecentPages() {
    try {
        const v = JSON.parse(localStorage.getItem('stream_recent_pages') || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

function saveRecentPages(arr) {
    try {
        localStorage.setItem('stream_recent_pages', JSON.stringify(arr.slice(-12)));
    } catch { }
}

export function markVisited(mode) {
    const recent = loadRecentPages();
    recent.push({ mode, ts: Date.now() });
    saveRecentPages(recent);
}

export function pickNextMode(currentMode) {
    const recent = loadRecentPages()
        .map(x => x?.mode)
        .filter(Boolean);
    const recentSet = new Set(recent.slice(-6));

    const candidates = STREAM_ROTATION
        .filter(m => m !== currentMode)
        .filter(m => !recentSet.has(m));

    const pool = candidates.length ? candidates : STREAM_ROTATION.filter(m => m !== currentMode);
    return pool[Math.floor(Math.random() * pool.length)];
}

