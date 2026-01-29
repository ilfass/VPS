/**
 * Dialogue Engine
 * Motor de interacción conversacional inteligente
 * Gestiona turnos, estados y disparadores multimedia.
 */

import { audioManager } from './audio-manager.js';
import { avatarSubtitlesManager } from './avatar-subtitles.js';

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
  if (mode === 'mapa') {
    const country = localStorage.getItem('last_country_name') || 'el mundo';
    return `viajando por ${country}`;
  }
  if (mode === 'viaje') return 'en plena travesía';
  if (mode === 'galeria') return 'explorando los archivos visuales';
  return 'en el centro de comando';
}

function safeLines(text, maxLines = 1) {
  const raw = text.split('\n')
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
    return false;
  } catch (e) { return false; }
}

// Mapeo de Rol -> Voz/Prioridad
function getVoicePriority(role) {
  // 'ilfass' -> 'normal' (Voz Masculina Principal)
  // 'companion' -> 'companion' (Voz Femenina/Alternativa)
  return role === 'companion' ? 'news' : 'normal';
}

export class DialogueEngine {
  constructor() {
    this.queue = [];
    this.isSpeaking = false;
    this.timer = null;
    this.lastCycleAt = 0;
    this.minCycleGap = 35000; // 35 segundos entre ciclos completos
  }

  init() {
    if (this.timer) clearInterval(this.timer);
    // Revisión frecuente (cada 1s) para reactividad
    this.timer = setInterval(() => this.tick(), 1000);
    console.log("DialogueEngine v2 started.");
  }

  async tick() {
    if (!isActive()) return;
    if (this.isSpeaking) return;

    // Si hay items en cola, reproducir el siguiente
    if (this.queue.length > 0 && !isBusy()) {
      this.playNext();
      return;
    }

    // Si no hay cola, verificar si toca generar nuevo ciclo
    if (this.queue.length === 0 && !isBusy()) {
      const elapsed = now() - this.lastCycleAt;
      const lastSpokeAgo = now() - getLastSpoke();

      // Generar si pasó el tiempo de ciclo Y el tiempo de silencio
      if (elapsed > this.minCycleGap && lastSpokeAgo > 5000) {
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

    // Activar visualmente al rol (ilfass o companion) - DUAL AVATARS
    avatarSubtitlesManager.activateRole(item.role);

    audioManager.speak(item.text, priority, () => {
      setLastSpoke(now());


      // ILUSTRACIÓN VISUAL (AGRESIVA - 100% INTENTO)
      const isIlfass = item.role === 'ilfass';
      const isCompanion = item.role === 'companion';

      // Siempre intentar mostrar algo visual
      if (isIlfass || isCompanion) {
        (async () => {
          try {
            const { multimediaOrchestrator } = await import('./multimedia-orchestrator.js');
            const { pexelsClient } = await import('./pexels-client.js');
            const { sfxEngine } = await import('./sfx-engine.js');

            sfxEngine.reveal();

            const currentMode = currentModeFromPath();
            let query = currentMode === 'mapa' ? (localStorage.getItem('last_country_name') || 'planet earth') : currentMode;
            // Reforzar query si es genérico
            if (query.length < 3) query = "landscape nature city";

            // 50% chance de video
            const wantVideo = Math.random() > 0.5;
            const context = query.toUpperCase();

            // LÓGICA DE MEMORIA - Bypass de saturación para demo agresiva
            let useFromMemory = null;
            let forceNew = true; // Forzar búsqueda nueva muy seguido

            try {
              // Intentar buscar memoria pero con poca exigencia
              const memRes = await fetch(`/control-api/api/media-memory?query=${encodeURIComponent(query)}`);
              if (memRes.ok) {
                const memData = await memRes.json();
                if (memData.results && memData.results.length > 0) {
                  // Solo usar memoria si tenemos mucha variedad, sino buscar fresco
                  if (memData.results.length > 20) {
                    const candidates = memData.results.filter(m => m.type === (wantVideo ? 'video' : 'image'));
                    if (candidates.length > 0) {
                      useFromMemory = candidates[Math.floor(Math.random() * candidates.length)];
                      forceNew = false;
                    }
                  }
                }
              }
            } catch (e) { }

            // Si decidimos usar memoria
            if (useFromMemory && !forceNew) {
              console.log(`[DialogueEngine] 💾 Usando media de memoria: ${useFromMemory.url}`);
              multimediaOrchestrator.showMediaOverlay({
                type: useFromMemory.type,
                url: useFromMemory.url,
                context: context,
                ttlMs: wantVideo ? 15000 : 8000
              }, 500); // 500ms delay
            } else {
              // BUSQUEDA FRESCA (Pexels)
              // (Logica antigua de fallback)
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
                    // Guardar
                    fetch('/control-api/api/media-memory', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query, url: file.link, type: 'video', context, source: 'pexels' })
                    }).catch(() => { });
                    return;
                  }
                }
              }

              // Fallback Imagen
              const photos = await pexelsClient.searchPhotos(query, 5);
              if (photos.length > 0) {
                const pic = photos[Math.floor(Math.random() * photos.length)];
                multimediaOrchestrator.showMediaOverlay({
                  type: 'image',
                  url: pic.src.landscape,
                  context: context,
                  ttlMs: 8000
                });
                fetch('/control-api/api/media-memory', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query, url: pic.src.landscape, type: 'image', context, source: 'pexels' })
                }).catch(() => { });
              }
            }
          } catch (e) { console.warn("Visual Trigger Error", e); }
        })();
      } else {
        // Tick simple
        import('./sfx-engine.js').then(m => m.sfxEngine.tick());
      }

      // Calcular "aire" dinámico antes del siguiente
      // Gaps muy cortos para evitar silencios
      const nextRole = this.queue[0]?.role;
      const isConversation = nextRole && nextRole !== item.role;
      const gap = isConversation ? (100 + Math.random() * 200) : (400 + Math.random() * 400);

      console.log(`⏱️ Gap para siguiente: ${Math.round(gap)}ms`);

      setTimeout(() => {
        // Apagar animación de hablar antes de pasar al siguiente
        avatarSubtitlesManager.setSpeaking(false);
        this.isSpeaking = false;

        // El tick() o esta misma recursión dispararán el siguiente
        if (this.queue.length) {
          this.playNext();
        } else {
          console.log("✅ Ráfaga finalizada. Forzando nuevo ciclo inmediato...");
          this.lastCycleAt = 0; // Reset timer para forzar generación en el próximo tick
          setTimeout(() => this.tick(), 50); // Tick casi inmediato
        }
      }, gap);
    }, (txt) => avatarSubtitlesManager.setSubtitles(txt));
  }

  // --- Generation Logic (Similar to previous, kept for context) ---

  async generateCycle() {
    const mode = currentModeFromPath();
    const movement = mapMovement(mode);
    const companionName = getCompanionName();

    console.log(`[Dialogue] Generating cycle for: ${mode} (${movement})`);

    // Prompt Estructurado
    const prompt = `
      Eres el guionista de una transmisión futurista de exploración global.
      Rol 1: ILFASS (Narrador Principal, Masculino, Filosófico, voz grave).
      Rol 2: ${companionName} (IA Acompañante, Femenina, Curiosa, Datos precisos).
      Contexto: Estamos ${movement}.
      
      Genera un diálogo MUY BREVE de 3 o 4 turnos.
      Formato exacto:
      [Ilfass] (texto corto, impactante)
      [Companion] (dato curioso, pregunta o complemento)
      [Ilfass] (conclusión reflexiva)
      [Companion] (cierre o transición, opcional)
      
      Reglas:
      - Español neutro pero elegante.
      - Sin saludos repetitivos.
      - Enfócate en la inmensidad, el tiempo, la humanidad.
      - 30-50 palabras por turno máximo.
    `.trim();

    const rawId = await aiGenerate(prompt);
    if (!rawId) return;

    this.parseAndQueue(rawId);
  }

  parseAndQueue(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const ilfassLines = [];
    const compLines = [];
    let chatLine = null;

    // Parser super simple
    lines.forEach(line => {
      if (line.toLowerCase().startsWith('[ilfass]')) {
        ilfassLines.push(line.replace(/^\[.*?\]/, '').trim());
      } else if (line.toLowerCase().startsWith('[companion]')) {
        compLines.push(line.replace(/^\[.*?\]/, '').trim());
      } else if (line.toLowerCase().startsWith('[chat]')) {
        chatLine = line.replace(/^\[.*?\]/, '').trim();
      }
    });

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
