const KEY_ACTIVE = 'streaming_plan_active_v1';
const KEY_START_TS = 'streaming_plan_start_ts_v1';
const KEY_PLAN_ID = 'streaming_plan_id_v1';

const MIN = 60 * 1000;

// Plan maestro 3h (6 bloques × 30min)
const PLAN_3H_V1 = {
  id: '3h_v1',
  totalMs: 180 * MIN,
  blockMs: 30 * MIN,
  blocks: [
    { id: 'encendido', label: 'ENCENDIDO', scenes: ['intro', 'portada', 'globo', 'reloj', 'sistema'] },
    { id: 'aire_viaje', label: 'AIRE Y VIAJE', scenes: ['aereo', 'ruta', 'mapa'] },
    { id: 'respiracion', label: 'RESPIRACIÓN', scenes: ['clima', 'aire', 'sol'] },
    { id: 'invisible', label: 'LO INVISIBLE', scenes: ['satelites', 'sol', 'globo', 'radar'] },
    { id: 'tension', label: 'TENSIÓN', scenes: ['terremotos', 'incendios', 'observador', 'frecuencia'] },
    { id: 'humanidad', label: 'HUMANIDAD', scenes: ['diario', 'curiosidades', 'galeria', 'reloj'] }
  ]
};

function getPlan() {
  return PLAN_3H_V1;
}

function normPath(p) {
  // Normalizar a "/x/y/" (sin query/hash)
  const u = new URL(p, window.location.origin);
  let path = u.pathname || '/';
  if (!path.endsWith('/')) path += '/';
  return path;
}

function sceneToPath(scene) {
  if (scene === 'home') return '/';
  // Estas existen como hojas aunque no usen main.js
  if (scene === 'intro') return '/vivos/intro/';
  if (scene === 'portada') return '/vivos/portada/';
  return `/vivos/${scene}/`;
}

export class StreamingPlanEngine {
  constructor() {
    this.plan = getPlan();
    this.timer = null;
  }

  isActive() {
    try { return localStorage.getItem(KEY_ACTIVE) === '1'; } catch (e) { return false; }
  }

  getPlanId() {
    try { return localStorage.getItem(KEY_PLAN_ID) || this.plan.id; } catch (e) { return this.plan.id; }
  }

  getStartTs() {
    try {
      const v = Number(localStorage.getItem(KEY_START_TS) || '0');
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  ensureStarted() {
    if (!this.isActive()) return;
    const ts = this.getStartTs();
    if (ts) return;
    try {
      localStorage.setItem(KEY_START_TS, String(Date.now()));
      localStorage.setItem(KEY_PLAN_ID, this.plan.id);
    } catch (e) { }
  }

  stop() {
    try {
      localStorage.setItem(KEY_ACTIVE, '0');
      localStorage.removeItem(KEY_START_TS);
      localStorage.removeItem(KEY_PLAN_ID);
    } catch (e) { }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  start({ reset = true } = {}) {
    try {
      localStorage.setItem(KEY_ACTIVE, '1');
      localStorage.setItem(KEY_PLAN_ID, this.plan.id);
      if (reset) localStorage.setItem(KEY_START_TS, String(Date.now()));
      // Desactivar Show Runner legacy para evitar dobles cortes
      localStorage.setItem('show_runner_active_v1', '0');
    } catch (e) { }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  compute(now = Date.now()) {
    const startTs = this.getStartTs();
    if (!startTs) return null;
    const plan = this.plan;

    const elapsed = Math.max(0, now - startTs);
    const loopElapsed = elapsed % plan.totalMs;

    const blockIdx = Math.floor(loopElapsed / plan.blockMs);
    const block = plan.blocks[blockIdx] || plan.blocks[0];

    const blockElapsed = loopElapsed % plan.blockMs;
    const scenes = block.scenes || [];
    const sceneDur = scenes.length ? (plan.blockMs / scenes.length) : plan.blockMs;
    const sceneIdx = scenes.length ? Math.min(scenes.length - 1, Math.floor(blockElapsed / sceneDur)) : 0;
    const scene = scenes[sceneIdx] || 'mapa';

    const nextBoundary = (blockIdx * plan.blockMs) + ((sceneIdx + 1) * sceneDur);
    const msToNext = Math.max(1_000, nextBoundary - loopElapsed);

    return {
      planId: plan.id,
      blockIdx,
      block,
      sceneIdx,
      scene,
      scenePath: sceneToPath(scene),
      msToNext
    };
  }

  init() {
    if (!this.isActive()) return;
    this.ensureStarted();
    this.enforce();
  }

  enforce() {
    if (!this.isActive()) return;
    const info = this.compute();
    if (!info) return;

    const current = normPath(window.location.href);
    const expected = normPath(info.scenePath);

    if (current !== expected) {
      window.location.href = info.scenePath;
      return;
    }

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      try { this.enforce(); } catch (e) { }
    }, info.msToNext);
  }
}

export const streamingPlanEngine = new StreamingPlanEngine();

