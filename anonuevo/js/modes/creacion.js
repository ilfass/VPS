import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class CreacionMode {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.builder = null;
    this.refreshTimer = null;
    this.data = null;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
  }

  async mount() {
    if (!eventManager.pollInterval) eventManager.init();

    this.container.innerHTML = '';
    this.scene = createTvScene({
      modeId: 'creacion',
      title: 'TALLER',
      subtitle: 'Creación en vivo (listas + señales)',
      accent: '#a855f7'
    });
    this.container.appendChild(this.scene.root);

    this.scene.setStatus('BUILD');
    this.scene.setTicker('Iniciando taller…');

    // Canvas animado de fondo (flujo de datos)
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        opacity: 0.35;
    `;
    this.scene.main.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.initParticles();
    this.animate();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Asegurar que el contenido esté encima del canvas
    this.scene.main.style.position = 'relative';
    this.scene.main.style.zIndex = '1';

    // Main UI
    const main = document.createElement('div');
    main.style.cssText = `width:100%; height:100%; padding:14px; display:flex; flex-direction:column; gap:12px; position:relative; z-index:1;`;
    main.innerHTML = `
      <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:12px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="font-weight:900; letter-spacing:.10em; font-size:12px; color: rgba(255,255,255,0.72); font-family:'JetBrains Mono', monospace;">
            CREACIÓN
          </div>
          <div id="mk-ts" style="font-size:12px; color: rgba(255,255,255,0.55); font-family:'JetBrains Mono', monospace;">—</div>
        </div>
        <div style="font-size:12px; color: rgba(168,85,247,0.92); font-family:'JetBrains Mono', monospace;">BUILD → LIVE</div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 0.9fr; gap: 12px; flex: 1 1 auto; min-height:0;">
        <div style="border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.30); border-radius: 16px; overflow:hidden; min-height:0;">
          <div style="padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.07); font-weight:900; font-size:12px; letter-spacing:.08em; color: rgba(255,255,255,0.70); font-family:'JetBrains Mono', monospace;">LISTA DEL DÍA</div>
          <div id="mk-list" style="height:100%; overflow:auto; padding:10px 12px; display:flex; flex-direction:column; gap:8px;"></div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; min-height:0;">
          <div style="border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.22); border-radius: 16px; padding: 12px;">
            <div style="font-weight:900; font-size:12px; letter-spacing:.08em; color: rgba(255,255,255,0.70); font-family:'JetBrains Mono', monospace;">PROMPT / INTENCIÓN</div>
            <div id="mk-intent" style="margin-top:8px; font-size:14px; color: rgba(255,255,255,0.88); line-height:1.35;">
              Transformar señales en una lista clara y narrable.
            </div>
          </div>
          <div style="border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.22); border-radius: 16px; padding: 12px; min-height:0;">
            <div style="font-weight:900; font-size:12px; letter-spacing:.08em; color: rgba(255,255,255,0.70); font-family:'JetBrains Mono', monospace;">RESULTADO</div>
            <div id="mk-result" style="margin-top:8px; font-size:13px; color: rgba(255,255,255,0.78); line-height:1.45; white-space:pre-wrap;">
              —
            </div>
          </div>
        </div>
      </div>
    `;

    this.scene.main.innerHTML = '';
    this.scene.main.appendChild(main);
    
    // Agregar estilos de animación si no existen
    if (!document.getElementById('creacion-anim-styles')) {
      const style = document.createElement('style');
      style.id = 'creacion-anim-styles';
      style.textContent = `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });

    await this.buildOnce({ isInitial: true });
    this.refreshTimer = setInterval(() => this.buildOnce({ isInitial: false }), 90 * 1000);
  }

  async buildOnce() {
    if (!this.scene) return;
    const listEl = this.scene.root.querySelector('#mk-list');
    const resultEl = this.scene.root.querySelector('#mk-result');
    const tsEl = this.scene.root.querySelector('#mk-ts');

    if (listEl) listEl.innerHTML = '';
    if (resultEl) resultEl.textContent = '—';
    this.scene.build.innerHTML = '';
    this.scene.cards.innerHTML = '';

    this.scene.setStatus('BUILD');
    this.scene.setTicker('Armando lista…');

    this.builder.clear();
    this.builder
      .addStep('Recolectar pulso (ALL)', async () => {
        this.data = await fetchPulse();
        if (tsEl && this.data?.generatedAt) tsEl.textContent = String(this.data.generatedAt).slice(0, 19).replace('T', ' ');
      })
      .addStep('Seleccionar 10 ítems', async () => {
        const items = pickItems(this.data).slice(0, 10);
        if (!listEl) return;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const row = document.createElement('div');
          row.style.cssText = `
            border:1px solid rgba(168,85,247,0.20);
            background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(0,0,0,0.15));
            border-radius: 14px;
            padding: 12px;
            animation: fadeInUp 0.5s ease-out ${i * 80}ms both;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
            overflow: hidden;
          `;
          row.onmouseenter = () => {
            row.style.transform = 'translateY(-2px)';
            row.style.boxShadow = '0 4px 12px rgba(168,85,247,0.2)';
          };
          row.onmouseleave = () => {
            row.style.transform = '';
            row.style.boxShadow = '';
          };
          row.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(180deg, rgba(168,85,247,0.8), rgba(168,85,247,0.4));"></div>
            <div style="padding-left: 12px;">
              <div style="display:flex; align-items:start; gap:10px;">
                <div style="font-size:18px; line-height:1;">${i === 0 ? '⭐' : i < 3 ? '✨' : '•'}</div>
                <div style="flex:1;">
                  <div style="font-weight:900; font-size:13px; color: rgba(255,255,255,0.95); line-height:1.3;">${esc(it.title)}</div>
                  <div style="margin-top:6px; font-size:10px; color: rgba(255,255,255,0.6); font-family:'JetBrains Mono', monospace; text-transform:uppercase; letter-spacing:0.5px;">${esc(it.source)}</div>
                </div>
              </div>
            </div>
          `;
          listEl.appendChild(row);
          await sleep(200);
        }
      })
      .addStep('Sintetizar “resultado”', async () => {
        if (!resultEl) return;
        const kws = Array.isArray(this.data?.keywords) ? this.data.keywords.slice(0, 5).map(k => k.keyword).filter(Boolean) : [];
        const one = kws.slice(0, 3).join(', ');
        resultEl.style.animation = 'fadeInUp 0.6s ease-out';
        resultEl.innerHTML = one
          ? `<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
               <span style="font-size:20px;">🎯</span>
               <span style="font-weight:700; color: rgba(168,85,247,0.9);">Claves: ${esc(one)}</span>
             </div>
             <div style="color: rgba(255,255,255,0.85); line-height:1.5;">Listo para narrar en el aire: una lista curada desde el pulso.</div>`
          : `<div style="color: rgba(255,255,255,0.85); line-height:1.5;">Listo para narrar en el aire: una lista curada desde el pulso.</div>`;
      });

    await this.builder.start();
    this.scene.setStatus('LIVE');
    this.scene.setTicker('TALLER · creación en vivo · actualizado');
  }

  resizeCanvas() {
    if (!this.canvas || !this.scene?.main) return;
    const rect = this.scene.main.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  initParticles() {
    if (!this.canvas) return;
    const count = 45;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.8 + 0.8,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  animate() {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
      this.ctx.fill();
    });
    
    // Conectar partículas cercanas
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(168, 85, 247, ${0.25 * (1 - dist / 110)})`;
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
        }
      }
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  unmount() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', () => this.resizeCanvas());
    try { if (this.refreshTimer) clearInterval(this.refreshTimer); } catch (e) { }
    this.refreshTimer = null;
    try { this.builder?.stop?.(); } catch (e) { }
    try { this.scene?.destroy?.(); } catch (e) { }
    this.scene = null;
    this.container.innerHTML = '';
  }
}

async function fetchPulse() {
  try {
    const r = await fetch('/control-api/api/observer/pulse?lang=es-419&geo=US&cc=ES&max=12');
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

function pickItems(data) {
  const blocks = data?.blocks || {};
  const merged = []
    .concat(blocks.news || [])
    .concat(blocks.scitech || [])
    .concat(blocks.security || [])
    .concat(blocks.trends || [])
    .concat(blocks.health || [])
    .concat(blocks.culture || []);

  return merged
    .map(it => ({
      title: (it?.title || '').toString().trim() || '—',
      source: (it?.source || '').toString().trim() || '—'
    }))
    .filter(it => it.title && it.title !== '—');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

