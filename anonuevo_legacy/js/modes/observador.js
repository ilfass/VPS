import { createTvScene } from '../utils/tv-scene.js';
import { ProgressiveBuilder } from '../utils/progressive-builder.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class ObservadorMode {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.builder = null;
    this.refreshTimer = null;
    this._lastData = null;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.bgImage = null;
    this.bgImageUrl = null;
  }

  async mount() {
    if (!eventManager.pollInterval) eventManager.init();

    this.container.innerHTML = '';
    this.scene = createTvScene({
      modeId: 'observador',
      title: 'OBSERVADOR',
      subtitle: 'Pulso visual en tiempo real',
      accent: '#38bdf8'
    });
    this.container.appendChild(this.scene.root);

    // Build UI
    this.scene.setStatus('BUILD');
    this.scene.setTicker('Recolectando señales…');

    // Limpiar primero
    this.scene.main.innerHTML = '';
    
    // Asegurar que el contenedor tenga posición relativa
    this.scene.main.style.position = 'relative';
    this.scene.main.style.zIndex = '1';

    // Imagen de fondo dinámica desde Pexels
    await this.loadBackgroundImage('technology data');

    // Canvas animado de fondo (ondas de datos) - AGREGAR DESPUÉS de limpiar
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        opacity: 0.5;
        background: transparent;
    `;
    this.scene.main.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // Esperar un frame para asegurar que el DOM esté listo
    requestAnimationFrame(() => {
      this.resizeCanvas();
      this.initParticles();
      this.animate();
    });
    
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      if (this.canvas.width > 0 && this.canvas.height > 0) {
        this.initParticles();
      }
    });

    const main = document.createElement('div');
    main.style.cssText = `
      width:100%; height:100%;
      display:flex; flex-direction:column;
      gap: 12px;
      padding: 16px;
      position: relative;
      z-index: 2;
    `;

    main.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); border-radius: 16px; padding: 12px 16px; border: 1px solid rgba(56,189,248,0.2);">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:32px; line-height:1;">📊</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-weight:900; letter-spacing:.10em; font-size:14px; color: rgba(255,255,255,0.95); font-family:'JetBrains Mono', monospace;">
              PULSO EN VIVO
            </div>
            <div id="obs-ts" style="font-size:11px; color: rgba(255,255,255,0.65); font-family:'JetBrains Mono', monospace;">—</div>
          </div>
        </div>
        <div id="obs-only" style="font-size:14px; font-weight:800; color: rgba(56,189,248,1); font-family:'JetBrains Mono', monospace; padding: 6px 12px; background: rgba(56,189,248,0.15); border-radius: 8px; border: 1px solid rgba(56,189,248,0.3);">ALL</div>
      </div>
      
      <div id="obs-chart" style="
        flex: 0 0 auto;
        height: 100px;
        border: 1px solid rgba(56,189,248,0.25);
        background: linear-gradient(135deg, rgba(0,0,0,0.5), rgba(56,189,248,0.1));
        border-radius: 16px;
        padding: 14px;
        display: flex;
        align-items: end;
        justify-content: space-around;
        gap: 8px;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(56,189,248,0.15);
      "></div>

      <div id="obs-commentary" style="
        flex: 0 0 auto;
        border: 2px solid rgba(56,189,248,0.3);
        background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(56,189,248,0.08));
        border-radius: 20px;
        padding: 18px;
        font-size: 15px;
        line-height: 1.5;
        color: rgba(255,255,255,0.95);
        max-height: 120px;
        min-height: 70px;
        white-space: pre-wrap;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(56,189,248,0.2);
      ">
        <div style="position: absolute; top: 12px; right: 12px; font-size:24px; opacity:0.3;">💭</div>
        <div id="obs-commentary-bg" style="
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 50%, rgba(56,189,248,0.12), transparent 70%);
          pointer-events: none;
          animation: pulseBg 4s ease-in-out infinite;
        "></div>
        <div id="obs-commentary-fade" style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          pointer-events: none;
          z-index: 2;
        "></div>
        <div id="obs-commentary-text" style="position: relative; z-index: 1;">—</div>
      </div>

      <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; flex: 1 1 auto; min-height:0;">
        <div style="border:2px solid rgba(56,189,248,0.2); background: rgba(0,0,0,0.5); border-radius: 20px; overflow:hidden; min-height:0; display:flex; flex-direction:column; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
          <div style="padding:12px 16px; border-bottom:2px solid rgba(56,189,248,0.2); font-weight:900; font-size:13px; letter-spacing:.1em; color: rgba(255,255,255,0.9); font-family:'JetBrains Mono', monospace; display:flex; align-items:center; gap:8px; background: rgba(56,189,248,0.1);">
            <span style="font-size:20px;">📰</span>
            <span>TOP ÍTEMS</span>
          </div>
          <div id="obs-items" style="flex:1; overflow:auto; padding:12px 16px; display:flex; flex-direction:column; gap:10px;"></div>
        </div>
        <div style="border:2px solid rgba(56,189,248,0.2); background: rgba(0,0,0,0.5); border-radius: 20px; overflow:hidden; min-height:0; display:flex; flex-direction:column; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
          <div style="padding:12px 16px; border-bottom:2px solid rgba(56,189,248,0.2); font-weight:900; font-size:13px; letter-spacing:.1em; color: rgba(255,255,255,0.9); font-family:'JetBrains Mono', monospace; display:flex; align-items:center; gap:8px; background: rgba(56,189,248,0.1);">
            <span style="font-size:20px;">🔑</span>
            <span>KEYWORDS</span>
          </div>
          <div id="obs-kws" style="flex:1; overflow:auto; padding:12px 16px; display:flex; flex-direction:column; gap:8px;"></div>
        </div>
      </div>
    `;

    // Agregar estilos de animación
    if (!document.getElementById('obs-visual-styles')) {
      const style = document.createElement('style');
      style.id = 'obs-visual-styles';
      style.textContent = `
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes growBar {
          from { width: 0; opacity: 0; }
          to { width: 100%; opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseBg {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(56,189,248,0.3); }
          50% { box-shadow: 0 0 40px rgba(56,189,248,0.6); }
        }
      `;
      document.head.appendChild(style);
    }

    // Agregar el contenido principal
    this.scene.main.appendChild(main);

    this.builder = new ProgressiveBuilder({ listEl: this.scene.build, sfx: this.scene.sfx });

    await this.refresh({ isInitial: true });
    this.refreshTimer = setInterval(() => this.refresh({ isInitial: false }), 60 * 1000);
  }

  async loadBackgroundImage(query = 'technology') {
    try {
      const res = await fetch(`/control-api/api/images/next?query=${encodeURIComponent(query)}&orientation=landscape`);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data?.ok && data.url) {
        this.bgImageUrl = data.url;
        // Crear elemento de imagen de fondo
        const bgImg = document.createElement('div');
        bgImg.style.cssText = `
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: url(${data.url});
          background-size: cover;
          background-position: center;
          opacity: 0.15;
          filter: blur(2px);
          transition: opacity 0.5s;
        `;
        this.scene.main.appendChild(bgImg);
        this.bgImage = bgImg;
      }
    } catch (e) {
      console.warn('[Observador] Error cargando imagen de fondo:', e);
    }
  }

  async refresh({ isInitial } = {}) {
    if (!this.scene) return;

    const only = pickOnlyCycle(isInitial ? 0 : Date.now());
    this.scene.setStatus('BUILD');
    this.scene.setTicker(`Recolectando señales (${only.toUpperCase()})…`);
    this.scene.build.innerHTML = '';
    this.scene.cards.innerHTML = '';

    this.builder.clear();
    this.builder
      .addStep(`Fetch pulso (${only})`, async () => {
        this._lastData = await fetchPulse(only);
      }, { delayMs: 650 })
      .addStep('Renderizando panel', async () => {
        this.render(this._lastData);
      }, { delayMs: 650 });

    await this.builder.start();
    this.scene.setStatus('LIVE');
    this.scene.setTicker(`OBSERVADOR · ${only.toUpperCase()} · actualizado`);
  }

  render(data) {
    const tsEl = this.scene.root.querySelector('#obs-ts');
    const onlyEl = this.scene.root.querySelector('#obs-only');
    const cEl = this.scene.root.querySelector('#obs-commentary-text');
    const itemsEl = this.scene.root.querySelector('#obs-items');
    const kwsEl = this.scene.root.querySelector('#obs-kws');
    const chartEl = this.scene.root.querySelector('#obs-chart');

    if (!data || !data.ok) {
      if (cEl) cEl.textContent = 'No hay pulso disponible ahora mismo.';
      if (tsEl) tsEl.textContent = '—';
      if (onlyEl) onlyEl.textContent = '—';
      if (itemsEl) itemsEl.innerHTML = '';
      if (kwsEl) kwsEl.innerHTML = '';
      return;
    }

    if (tsEl) {
      tsEl.textContent = (data.generatedAt || '').toString().slice(0, 19).replace('T', ' ');
      tsEl.style.animation = 'fadeInUp 0.4s ease-out';
    }
    if (onlyEl) {
      onlyEl.textContent = (data.only || 'all').toString().toUpperCase();
      onlyEl.style.animation = 'fadeInUp 0.4s ease-out';
    }
    if (cEl) {
      const fullCommentary = (data.commentary || '—').toString().trim() || '—';
      const maxLength = 120;
      const commentaryText = fullCommentary.length > maxLength 
        ? fullCommentary.substring(0, maxLength) + '...' 
        : fullCommentary;
      cEl.textContent = commentaryText;
      cEl.style.animation = 'fadeInUp 0.5s ease-out';
    }

    const blocks = data.blocks || {};
    const categoryCounts = {
      news: (blocks.news || []).length,
      trends: (blocks.trends || []).length,
      culture: (blocks.culture || []).length,
      scitech: (blocks.scitech || []).length,
      health: (blocks.health || []).length,
      security: (blocks.security || []).length
    };
    const merged = []
      .concat(blocks.news || [])
      .concat(blocks.trends || [])
      .concat(blocks.culture || [])
      .concat(blocks.scitech || [])
      .concat(blocks.health || [])
      .concat(blocks.security || [])
      .slice(0, 3);
    
    const totalItems = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

    if (itemsEl) {
      const icons = { news: '📰', trends: '📈', culture: '🎭', scitech: '🔬', health: '🏥', security: '🔒' };
      itemsEl.innerHTML = merged.map((it, idx) => {
        const title = esc((it?.title || '').toString()).slice(0, 70);
        const src = esc((it?.source || '').toString()).slice(0, 25);
        const kind = (it?.kind || 'news').toString();
        const icon = icons[kind] || '📌';
        const delay = idx * 100;
        const colors = {
          news: 'rgba(59,130,246,0.2)',
          trends: 'rgba(168,85,247,0.2)',
          culture: 'rgba(236,72,153,0.2)',
          scitech: 'rgba(34,197,94,0.2)',
          health: 'rgba(239,68,68,0.2)',
          security: 'rgba(245,158,11,0.2)'
        };
        const borderColors = {
          news: 'rgba(59,130,246,0.5)',
          trends: 'rgba(168,85,247,0.5)',
          culture: 'rgba(236,72,153,0.5)',
          scitech: 'rgba(34,197,94,0.5)',
          health: 'rgba(239,68,68,0.5)',
          security: 'rgba(245,158,11,0.5)'
        };
        return `
          <div style="
            border:2px solid ${borderColors[kind] || 'rgba(255,255,255,0.2)'}; 
            background: linear-gradient(135deg, ${colors[kind] || 'rgba(0,0,0,0.3)'}, rgba(0,0,0,0.4)); 
            border-radius: 16px; 
            padding: 14px;
            animation: fadeInUp 0.6s ease-out ${delay}ms both;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
          " onmouseenter="this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 8px 24px rgba(56,189,248,0.3)'" onmouseleave="this.style.transform=''; this.style.boxShadow=''">
            <div style="position: absolute; top: 8px; right: 8px; font-size:28px; opacity:0.2; animation: float 3s ease-in-out infinite;">${icon}</div>
            <div style="display:flex; align-items:start; gap:12px; position: relative; z-index: 1;">
              <div style="font-size:32px; line-height:1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${icon}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:900; font-size: 14px; color: rgba(255,255,255,0.98); line-height:1.4; margin-bottom:8px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${title || '—'}</div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.7); font-family:'JetBrains Mono', monospace; text-transform:uppercase; letter-spacing:1px; padding: 4px 8px; background: rgba(0,0,0,0.3); border-radius: 6px; display: inline-block;">${src || '—'}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const kws = Array.isArray(data.keywords) ? data.keywords.slice(0, 6) : [];
    if (kwsEl) {
      const maxCount = kws.length > 0 ? Math.max(...kws.map(k => Number(k?.count || 0))) : 1;
      kwsEl.innerHTML = kws.map((k, idx) => {
        const kw = esc((k?.keyword || '').toString());
        const count = Number(k?.count || 0);
        const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const delay = idx * 60;
        return `
          <div style="
            animation: slideInLeft 0.5s ease-out ${delay}ms both;
            border:2px solid rgba(56,189,248,0.3); 
            background: linear-gradient(135deg, rgba(56,189,248,0.15), rgba(0,0,0,0.3)); 
            border-radius: 14px; 
            padding: 12px 14px;
            overflow: hidden;
            position: relative;
            transition: all 0.3s;
          " onmouseenter="this.style.transform='scale(1.05)'; this.style.borderColor='rgba(56,189,248,0.6)'" onmouseleave="this.style.transform=''; this.style.borderColor='rgba(56,189,248,0.3)'">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:800; font-size: 13px; color: rgba(255,255,255,0.95); font-family:'JetBrains Mono', monospace;">🔑 ${kw || '—'}</span>
              <span style="font-size: 12px; font-weight:900; color: rgba(56,189,248,1); font-family:'JetBrains Mono', monospace; padding: 4px 10px; background: rgba(56,189,248,0.2); border-radius: 8px;">${count}</span>
            </div>
            <div style="height:6px; background: rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
              <div style="
                height:100%; 
                width:${width}%; 
                background: linear-gradient(90deg, rgba(56,189,248,0.8), rgba(56,189,248,1));
                border-radius:3px;
                animation: growBar 0.8s ease-out ${delay + 300}ms both;
                box-shadow: 0 0 12px rgba(56,189,248,0.5);
              "></div>
            </div>
          </div>
        `;
      }).join('');
    }
    
    // Renderizar gráfico de barras de categorías con emojis
    if (chartEl && totalItems > 0) {
      const colors = {
        news: 'rgba(59,130,246,0.9)',
        trends: 'rgba(168,85,247,0.9)',
        culture: 'rgba(236,72,153,0.9)',
        scitech: 'rgba(34,197,94,0.9)',
        health: 'rgba(239,68,68,0.9)',
        security: 'rgba(245,158,11,0.9)'
      };
      const emojis = {
        news: '📰',
        trends: '📈',
        culture: '🎭',
        scitech: '🔬',
        health: '🏥',
        security: '🔒'
      };
      const labels = {
        news: 'NEWS',
        trends: 'TRENDS',
        culture: 'CULTURE',
        scitech: 'SCI-TECH',
        health: 'HEALTH',
        security: 'SECURITY'
      };
      const maxCount = Math.max(...Object.values(categoryCounts), 1);
      
      chartEl.innerHTML = Object.entries(categoryCounts).map(([key, count], idx) => {
        const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const delay = idx * 120;
        return `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; animation: fadeInUp 0.6s ease-out ${delay}ms both;">
            <div style="font-size:24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); animation: float 2s ease-in-out infinite ${delay}ms;">${emojis[key] || '📊'}</div>
            <div style="
              width: 100%;
              height: ${height}%;
              min-height: ${count > 0 ? '12px' : '0'};
              background: linear-gradient(180deg, ${colors[key] || 'rgba(255,255,255,0.4)'}, ${colors[key]?.replace('0.9', '0.6') || 'rgba(255,255,255,0.3)'});
              border-radius: 8px 8px 0 0;
              box-shadow: 0 -4px 16px ${colors[key]?.replace('0.9', '0.5') || 'rgba(0,0,0,0.3)'};
              animation: growBar 0.8s ease-out ${delay + 200}ms both;
              position: relative;
            ">
              <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size:11px; font-weight:900; color: ${colors[key] || '#fff'}; font-family:'JetBrains Mono', monospace;">${count}</div>
            </div>
            <div style="font-size:9px; color: rgba(255,255,255,0.8); font-family:'JetBrains Mono', monospace; font-weight:700; text-align:center;">${labels[key] || key.toUpperCase()}</div>
          </div>
        `;
      }).join('');
    }
  }

  resizeCanvas() {
    if (!this.canvas || !this.scene?.main) {
      return;
    }
    const rect = this.scene.main.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (window.innerWidth || 1920);
    const h = rect.height > 0 ? rect.height : (window.innerHeight || 1080);
    
    if (w > 0 && h > 0) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      
      const sizeChanged = Math.abs(this.canvas.width - w) > 10 || Math.abs(this.canvas.height - h) > 10;
      if (this.particles.length === 0 || sizeChanged) {
        this.initParticles();
      }
    }
  }

  initParticles() {
    if (!this.canvas) return;
    const count = 80;
    this.particles = [];
    const w = this.canvas.width || 1920;
    const h = this.canvas.height || 1080;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 3 + 2,
        opacity: Math.random() * 0.6 + 0.4
      });
    }
  }

  animate() {
    if (!this.ctx || !this.canvas) return;
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h) {
      this.animationId = requestAnimationFrame(() => this.animate());
      return;
    }
    
    this.ctx.clearRect(0, 0, w, h);
    
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      
      p.x = Math.max(0, Math.min(w, p.x));
      p.y = Math.max(0, Math.min(h, p.y));
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
      this.ctx.fill();
    });
    
    // Conectar partículas cercanas con líneas más visibles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 * (1 - dist / 150)})`;
          this.ctx.lineWidth = 2;
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

async function fetchPulse(only = 'all') {
  try {
    const qsOnly = only && only !== 'all' ? `&only=${encodeURIComponent(only)}` : '';
    const url = `/control-api/api/observer/pulse?lang=es-419&geo=US&cc=ES&max=12${qsOnly}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

function pickOnlyCycle(seed) {
  const arr = ['all', 'news', 'trends', 'scitech', 'health', 'security', 'culture'];
  const idx = Math.abs((Number(seed) || 0)) % arr.length;
  return arr[idx];
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
