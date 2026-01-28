
const KEY_ACTIVE = 'streaming_plan_active_v1';
const KEY_LAST_SPOKE = 'streaming_last_spoke_at_v1';
const KEY_COMPANION_NAME = 'streaming_companion_name_v1';

function now() { return Date.now(); }

function isActive() {
  // Activo por defecto para permitir diálogos (User Request)
  try {
    const val = localStorage.getItem(KEY_ACTIVE);
    return val !== '0'; // Activo salvo que se apague explícitamente
  } catch (e) { return true; }
}

function setLastSpoke(ts) {
  try { localStorage.setItem(KEY_LAST_SPOKE, String(ts)); } catch (e) { }
}

function getLastSpoke() {
  try {
    const v = Number(localStorage.getItem(KEY_LAST_SPOKE) || '0');
    return Number.isFinite(v) ? v : 0;
  } catch (e) { return 0; }
}

function getCompanionName() {
  // Opciones: 'El Pulso', 'La Señal', 'El Eco', 'La Bitácora'
  try { return localStorage.getItem(KEY_COMPANION_NAME) || 'La Señal'; } catch (e) { return 'La Señal'; }
}

function currentModeFromPath() {
  const segs = window.location.pathname.split('/').filter(Boolean);
  const idx = segs.indexOf('vivos');
  if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
  return 'home';
}

// Mapeo detallado para el contexto del prompt
function mapMovement(mode) {
  const m = String(mode || '').toLowerCase();
  if (['aereo'].includes(m)) return 'AVIONES';
  if (['clima', 'aire', 'frecuencia'].includes(m)) return 'CLIMA';
  if (['satelites', 'sol', 'sistema', 'radar'].includes(m)) return 'SATELITES';
  if (['ruta', 'mapa', 'globo', 'observador'].includes(m)) return 'HUMANIDAD';
  if (['terremotos', 'incendios'].includes(m)) return 'TENSION';
  return 'HUMANIDAD'; // Default
}

function mapWorldState(mode) {
  const m = String(mode || '').toLowerCase();
  if (['terremotos', 'incendios', 'radar'].includes(m)) return 'INESTABLE';
  if (['aereo', 'satelites', 'ruta', 'sistema'].includes(m)) return 'ACTIVO';
  if (['clima', 'aire', 'sol', 'frecuencia'].includes(m)) return 'CALMO';
  return 'CONTINUO';
}

function mapEmotional(mode) {
  const m = String(mode || '').toLowerCase();
  if (['curiosidades', 'intro', 'frecuencia'].includes(m)) return 'LIGERO';
  if (['diario', 'galeria', 'terremotos', 'incendios', 'memoria', 'radar'].includes(m)) return 'PROFUNDO';
  if (['observador', 'reloj', 'sistema'].includes(m)) return 'NEUTRO';
  return 'NEUTRO';
}

function safeLines(txt, maxLines) {
  const raw = String(txt || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^[-•\d\)\."]+/, '').replace(/["”]+$/, '').trim()) // Limpieza agresiva de bullets y comillas
    .filter(Boolean);
  return raw.slice(0, maxLines);
}

async function aiGenerate(prompt) {
  try {
    const res = await fetch('/control-api/api/generate-narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, temperature: 0.8 }) // Temperatura alta para variedad
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data?.narrative || data?.text || '';
  } catch (e) {
    console.error("Narrative Gen Error:", e);
    return '';
  }
}

function isBusy() {
  try {
    // Si el AudioManager está hablando, estamos ocupados.
    // La cola gestiona el flujo, así que "busy" es hablar.
    if (audioManager.isSpeaking) return true;
    if (audioManager.currentAudio) return true;
    if (audioManager.currentUtterance) return true;
    if (document.getElementById('media-overlay-container')) return true;
    const mi = window.app?.currentModeInstance;
    if (mi?.isNarrating) return true;
  } catch (e) { }
  return false;
}

// Mapeo de Rol -> Voz/Prioridad
function getVoicePriority(role) {
  // 'ilfass' -> 'normal' (Voz Masculina Principal)
  // 'companion' -> 'companion' (Voz Femenina/Alternativa)
  return role === 'companion' ? 'news' : 'normal';
}

export class DialogueEngine {
  constructor() {
    this.timer = null;
    this.cycleMs = 40 * 1000; // MÁS DINÁMICO: 40 segundos (QA Request)
    this.queue = [];
    this.isSpeaking = false;
    this.lastCycleAt = 0;
  }

  init() {
    if (!isActive()) return;
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 2000); // Check rápido cada 2s
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.queue = [];
    this.isSpeaking = false;
  }

  async tick() {
    if (!isActive()) return;

    // Música ambiente siempre viva
    try { if (!audioManager.musicLayer) await audioManager.init(); } catch (e) { }
    try { if (!audioManager.isMusicPlaying) audioManager.startAmbience(); } catch (e) { }

    const last = getLastSpoke();
    const gap = last ? (now() - last) : 999_999;

    // Anti-silencio: si pasan 35s sin voz, disparar algo para que no parezca muerto
    if (gap > 35_000 && !this.isSpeaking && !this.queue.length && !isBusy()) {
      try {
        const ev = new CustomEvent('stream_force_recap');
        window.dispatchEvent(ev);
        setLastSpoke(now());
      } catch (e) { }
      return;
    }

    // Generación de cola
    // Si pasó mucho tiempo O la cola está vacía y hay silencio incómodo (>15s)
    if ((now() - this.lastCycleAt) > this.cycleMs || (this.queue.length === 0 && gap > 15_000)) {
      if (!this.isSpeaking && !this.queue.length) {
        this.lastCycleAt = now();
        await this.generateCycle();
      }
    }

    // Consumo de cola (Event Driven Loop)
    // Si hay items y no estamos hablando actualmente
    if (this.queue.length && !this.isSpeaking && !isBusy()) {
      this.playNext();
    }
  }

  playNext() {
    if (!this.queue.length) return;

    // Sacar siguiente item
    const item = this.queue.shift();
    if (!item?.text) {
      this.playNext(); // Skip empty
      return;
    }

    this.isSpeaking = true;
    const priority = getVoicePriority(item.role);

    console.log(`🎙️ [${item.role}] Speaking: "${item.text.substring(0, 30)}..."`);

    // Hablar y esperar callback al terminar
    // ESTO ES CLAVE: audioManager.speak llama al callback CUANDO TERMINA EL AUDIO.
    audioManager.speak(item.text, priority, () => {
      setLastSpoke(now());

      // ILUSTRACIÓN VISUAL (90% de probabilidad o si es Ilfass)
      if (item.role === 'ilfass' && Math.random() > 0.1) {
        (async () => {
          try {
            const { multimediaOrchestrator } = await import('./multimedia-orchestrator.js');
            const { pexelsClient } = await import('./pexels-client.js');
            const { sfxEngine } = await import('./sfx-engine.js');

            sfxEngine.reveal();

            const currentMode = currentModeFromPath();
            const query = currentMode === 'mapa' ? (localStorage.getItem('last_country_name') || 'world map') : currentMode;
            // 40% chance de video
            const wantVideo = Math.random() > 0.6;
            const context = query.toUpperCase();

            // LÓGICA DE MEMORIA INTELIGENTE (User Request: 2 uses limit, 6 saturation, AI fallback)
            let useFromMemory = null;
            let forceNew = false;

            try {
              const memRes = await fetch(`/control-api/api/media-memory?query=${encodeURIComponent(query)}`);
              if (memRes.ok) {
                const memData = await memRes.json();
                if (memData.results && memData.results.length > 0) {
                  // Filtrar por tipo
                  const candidates = memData.results.filter(m => m.type === (wantVideo ? 'video' : 'image'));

                  // 1. SATURACIÓN: Si hay 6 o más opciones, rotación aleatoria pura
                  if (candidates.length >= 6) {
                    useFromMemory = candidates[Math.floor(Math.random() * candidates.length)];
                    console.log(`[DialogueEngine] 🔄 Saturación alcanzada (${candidates.length} items). Rotando aleatoriamente.`);
                  } else {
                    // 2. USO LIMITADO: Buscar items usados < 2 veces
                    const fresh = candidates.filter(m => (m.useCount || 0) < 2);
                    if (fresh.length > 0) {
                      // Usar uno de los frescos
                      useFromMemory = fresh[0];
                    } else {
                      // Todos usados >= 2 veces -> FORZAR NUEVO para enriquecer la DB
                      console.log(`[DialogueEngine] ♻️ Items existentes agotados (uso >= 2). Forzando nueva descarga/generación.`);
                      forceNew = true;
                    }
                  }
                } else {
                  forceNew = true;
                }
              }
            } catch (e) { forceNew = true; }

            // EJECUTAR: MEMORIA
            if (useFromMemory && !forceNew) {
              console.log(`[DialogueEngine] 💾 Usando media de memoria: ${useFromMemory.url} (uso: ${useFromMemory.useCount || 0})`);
              multimediaOrchestrator.showMediaOverlay({
                type: useFromMemory.type,
                url: useFromMemory.url,
                context: context,
                ttlMs: useFromMemory.type === 'video' ? 15000 : 8000
              });
              // Actualizar uso
              fetch('/control-api/api/media-memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: useFromMemory.url })
              }).catch(() => { });
              return;
            }

            // EJECUTAR: GENERACIÓN / PEXELS (NUEVO)

            // Si es IMAGEN, intentar GENERAR con IA primero (User Request)
            if (!wantVideo) {
              // 95% de intentar IA primero
              if (Math.random() < 0.95) {
                console.log(`[DialogueEngine] 🎨 Intentando generar imagen IA para "${query}"...`);
                try {
                  const aiRes = await fetch('/control-api/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: `Cinematic shot of ${query}, highly detailed, 8k, atmospheric lighting`, context: context })
                  });
                  const aiData = await aiRes.json();
                  if (aiRes.ok && aiData.url) {
                    multimediaOrchestrator.showMediaOverlay({
                      type: 'image',
                      url: aiData.url,
                      context: context + ' (AI)',
                      ttlMs: 8000
                    });
                    return; // Éxito con IA
                  }
                } catch (e) { console.warn("AI Gen failed, falling back to Pexels", e); }
              }
            }

            // FALLBACK A PEXELS
            if (wantVideo) {
              const videos = await pexelsClient.searchVideos(query, 3);
              if (videos && videos.length > 0) {
                const vid = videos[0];
                const file = vid.video_files.find(f => f.quality === 'hd' && f.width >= 1280) || vid.video_files[0];
                if (file) {
                  multimediaOrchestrator.showMediaOverlay({
                    type: 'video',
                    url: file.link,
                    context: context,
                    ttlMs: 15000
                  });
                  // GUARDAR EN MEMORIA
                  fetch('/control-api/api/media-memory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: query,
                      url: file.link,
                      type: 'video',
                      context: context,
                      source: 'pexels'
                    })
                  }).catch(() => { });
                  return;
                }
              }
            }

            // Fallback Pexels Imagen
            const photos = await pexelsClient.searchPhotos(query, 5);
            if (photos.length > 0) {
              const pic = photos[Math.floor(Math.random() * photos.length)];
              multimediaOrchestrator.showMediaOverlay({
                type: 'image',
                url: pic.src.landscape,
                context: context,
                ttlMs: 8000
              });
              // GUARDAR EN MEMORIA
              fetch('/control-api/api/media-memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: query,
                  url: pic.src.landscape,
                  type: 'image',
                  context: context,
                  source: 'pexels'
                })
              }).catch(() => { });
            }
          } catch (e) { console.warn("Visual Trigger Error", e); }
        })();
      } else {
        // Si no hay imagen, al menos un tick de sonido
        import('./sfx-engine.js').then(m => m.sfxEngine.tick());
      }

      // Calcular "aire" dinámico antes del siguiente
      // Si cambia de hablante, el gap es corto (0.5 - 1.5s) para sensación de charla.
      // Si es el mismo, es una pausa de énfasis (2 - 3s).
      const nextRole = this.queue[0]?.role;
      const isConversation = nextRole && nextRole !== item.role;
      // Gap agresivamente corto para evitar "aire" muerto
      const gap = isConversation ? (200 + Math.random() * 500) : (800 + Math.random() * 1000);

      console.log(`⏱️ Gap para siguiente: ${Math.round(gap)}ms`);

      setTimeout(() => {
        this.isSpeaking = false;
        // El tick() o esta misma recursión dispararán el siguiente
        if (this.queue.length) {
          this.playNext();
        } else {
          console.log("✅ Ráfaga finalizada. Forzando nuevo ciclo inmediato...");
          this.lastCycleAt = 0; // Reset timer para forzar generación en el próximo tick
          setTimeout(() => this.tick(), 100);
        }
      }, gap);
    });
  }

  async generateCycle() {
    console.log("🧠 Generando nuevo ciclo narrativo (Conversacional)...");
    const mode = currentModeFromPath();
    const movement = mapMovement(mode);
    const emotional = mapEmotional(mode);

    // 1. ILFASS PROMPT (Reflexivo pero vivo)
    const ilfassPrompt = `
Sos Ilfass. Voz poética pero alerta.
Contexto visual: ${mode}.
Tono: ${emotional}.
Generá 2 observaciones MUY CORTAS sobre lo que está pasando ahora mismo.
Usá metáforas sobre flujo de datos o la conexión humana.
RESPONDÉ SIEMPRE EN ESPAÑOL.
`.trim();

    // 2. COMPANION PROMPT (Interactivo y Curioso)
    const companionName = getCompanionName();
    const companionPrompt = `
Sos "${companionName}". Tu rol es ser QA de la realidad y copiloto.
Contexto: ${mode}.
Interactuá con Ilfass. NO seas pasiva.
Generá 2 intervenciones BREVES en ESPAÑOL:
1. Una observación técnica o curiosa ("Detecto un patrón inusual en...", "Mira ese movimiento...").
2. Una pregunta directa a Ilfass o al espectador.
`.trim();

    // 3. CHAT INTERACTION (Eventual, 50% chance)
    let chatLine = null;
    // Intentamos obtener chat real siempre que sea posible
    if (Math.random() < 0.5) {
      try {
        let realMessages = [];
        const ytToken = localStorage.getItem('youtube_oauth_token');
        const ytVideoId = localStorage.getItem('yt_video_id_v1') || localStorage.getItem('youtube-video-id');

        if (ytToken && ytVideoId) {
          try {
            const chatReq = await fetch(`/control-api/api/chat/live?videoId=${ytVideoId}`, {
              headers: { 'Authorization': `Bearer ${ytToken}` }
            });
            const chatData = await chatReq.json();
            if (chatData.messages?.length > 0) realMessages = chatData.messages;
          } catch (e) { }
        }

        // Si hay chat real, usalo. Si no, simula.
        let chatPrompt = "";
        if (realMessages.length > 0) {
          const sample = realMessages.sort(() => 0.5 - Math.random()).slice(0, 2).map(m => `"${m.text}"`).join(" / ");
          chatPrompt = `El chat dice: ${sample}. Como ${companionName}, reaccioná brevemente a esto sin leer nombres de usuario.`;
        } else {
          chatPrompt = `Simulá leer un mensaje del chat sobre el paisaje actual. Como ${companionName}, comentalo brevemente.`;
        }

        chatLine = await aiGenerate(chatPrompt);
      } catch (e) { }
    }

    const [t1, t2] = await Promise.all([
      aiGenerate(ilfassPrompt),
      aiGenerate(companionPrompt)
    ]);

    const ilfassLines = safeLines(t1, 4);
    const compLines = safeLines(t2, 4);

    // Armar conversación entrelazada (PING PONG)
    const newQueue = [];

    // Patrón conversacional: A -> B (rápido) -> A (pausa) -> B (Chat)

    // 1. Apertura Ilfass
    if (ilfassLines[0]) newQueue.push({ role: 'ilfass', text: ilfassLines.shift() });

    // 2. Reacción Companion (pregunta/dato)
    if (compLines[0]) newQueue.push({ role: 'companion', text: compLines.shift() });

    // 3. Respuesta/Continuación Ilfass
    if (ilfassLines[0]) newQueue.push({ role: 'ilfass', text: ilfassLines.shift() });

    // 4. Chat o Cierre Companion
    if (chatLine) {
      newQueue.push({ role: 'companion', text: safeLines(chatLine, 1)[0] });
    } else if (compLines[0]) {
      newQueue.push({ role: 'companion', text: compLines.shift() });
    }

    this.queue = newQueue;
    console.log(`✅ Ciclo generado: ${newQueue.length} items.`);
    this.queue.forEach(q => console.log(`  -> [${q.role}] ${q.text.substring(0, 25)}...`));
  }
}

export const dialogueEngine = new DialogueEngine();
