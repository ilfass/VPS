const KEY_ACTIVE = 'streaming_plan_active_v1';
const KEY_LAST_SPOKE = 'streaming_last_spoke_at_v1';
const KEY_COMPANION_NAME = 'streaming_companion_name_v1';

function now() { return Date.now(); }

function isActive() {
  try { return localStorage.getItem(KEY_ACTIVE) === '1'; } catch (e) { return false; }
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
  if (['clima', 'aire'].includes(m)) return 'CLIMA';
  if (['satelites', 'sol'].includes(m)) return 'SATELITES';
  if (['ruta', 'mapa', 'globo', 'observador'].includes(m)) return 'HUMANIDAD';
  if (['terremotos', 'incendios'].includes(m)) return 'TENSION';
  return 'HUMANIDAD'; // Default
}

function mapWorldState(mode) {
  const m = String(mode || '').toLowerCase();
  if (['terremotos', 'incendios'].includes(m)) return 'INESTABLE';
  if (['aereo', 'satelites', 'ruta'].includes(m)) return 'ACTIVO';
  if (['clima', 'aire', 'sol'].includes(m)) return 'CALMO';
  return 'CONTINUO';
}

function mapEmotional(mode) {
  const m = String(mode || '').toLowerCase();
  if (['curiosidades', 'intro'].includes(m)) return 'LIGERO';
  if (['diario', 'galeria', 'terremotos', 'incendios', 'memoria'].includes(m)) return 'PROFUNDO';
  if (['observador', 'reloj'].includes(m)) return 'NEUTRO';
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
async function speakRole(text, role) {
  if (!text) return;
  // Role mapping:
  // 'ilfass' -> 'normal' (Voz Masculina Principal)
  // 'companion' -> 'companion' (Voz Femenina/Alternativa)
  const priority = role === 'companion' ? 'news' : 'normal';

  setLastSpoke(now());

  // Pequeño delay artificial antes de hablar para "respirar"
  await new Promise(r => setTimeout(r, 500));

  await audioManager.speak(text, priority, () => { });
}

export class DialogueEngine {
  constructor() {
    this.timer = null;
    this.cycleMs = 12 * 60 * 1000; // Ciclos más largos (12 min) como pide el bloque de ritmo
    this.queue = [];
    this.running = false;
    this.lastCycleAt = 0;
  }

  init() {
    if (!isActive()) return;
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 2500); // Check rápido
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.queue = [];
    this.running = false;
  }

  async tick() {
    if (!isActive()) return;

    // Música ambiente siempre viva
    try { if (!audioManager.musicLayer) await audioManager.init(); } catch (e) { }
    try { if (!audioManager.isMusicPlaying) audioManager.startAmbience(); } catch (e) { }

    const last = getLastSpoke();
    const gap = last ? (now() - last) : 999_999;

    // Regla de Oro: Evitar silencios > 20-25s de VOZ (cubiertos por música, pero riesgo de vacío)
    if (gap > 25_000 && !isBusy() && !this.queue.length) {
      // Disparar recap o bumper visual si no hay nada en cola
      try {
        const ev = new CustomEvent('stream_force_recap');
        window.dispatchEvent(ev);
        // Marcamos como "hablado" para resetear timer y no spammear
        setLastSpoke(now());
      } catch (e) { }
      return;
    }

    // Generación de cola
    if ((now() - this.lastCycleAt) > this.cycleMs || (this.queue.length === 0 && gap > 15_000)) {
      if (!this.running && !this.queue.length) {
        this.lastCycleAt = now();
        await this.generateCycle();
      }
    }

    // Consumo de cola
    if (this.queue.length && !this.running && !isBusy()) {
      // Verificar si toca esperar (ritmo de música)
      // Cada item en cola puede tener un 'delay' pre-calculado
      const nextItem = this.queue[0];
      if (nextItem && nextItem.timestamp && now() < nextItem.timestamp) {
        return; // Esperando delay de música
      }

      this.running = true;
      try {
        await this.runQueue();
      } finally {
        this.running = false;
      }
    }
  }

  async generateCycle() {
    console.log("🧠 Generando nuevo ciclo narrativo...");
    const mode = currentModeFromPath();
    const movement = mapMovement(mode);
    const worldState = mapWorldState(mode);
    const emotional = mapEmotional(mode);
    const hoja = mode.toUpperCase();

    // 1. ILFASS PROMPT
    const ilfassPrompt = `
Sos Ilfass.
Sos un viajante que observa el mundo en tiempo real.
No explicás tecnología ni datos técnicos.
Hablás en frases cortas, poéticas y reflexivas.
No repetís frases de transmisiones anteriores.
No hacés preguntas al público.
No usás muletillas.

Contexto visual actual: ${hoja}
Movimiento dominante: ${movement}
Estado del mundo: ${worldState}
Clima emocional: ${emotional}

Generá entre 2 y 3 intervenciones de 1 o 2 frases cada una.
Formato: Texto plano, una por línea.
`.trim();

    // 2. COMPANION PROMPT
    const companionName = getCompanionName();
    const companionPrompt = `
Sos ${companionName}, una voz acompañante de Ilfass.
No sos protagonista.
Tu función es sostener el ritmo.
Podés:
- Hacer preguntas breves.
- Aportar una observación concreta.
- Reaccionar suavemente a lo que dijo Ilfass.
- Leer el pulso general del chat (sin mencionar nombres).

No explicás de más.
No debates.
No interrumpís.

Contexto visual actual: ${hoja}
Tema del bloque: ${movement}
Nivel de actividad del chat: MEDIO

Generá entre 2 y 3 intervenciones breves.
Formato: Texto plano, una por línea.
`.trim();

    // 3. CHAT INTERACTION (Eventual, 40% chance of triggering)
    let chatLine = null;
    if (Math.random() < 0.4) {
      try {
        // Intentar leer chat REAL primero
        let realMessages = [];
        // El token y videoId deben estar en localStorage (guardados por control.html)
        const ytToken = localStorage.getItem('youtube_oauth_token');
        const ytVideoId = localStorage.getItem('yt_video_id_v1') || localStorage.getItem('youtube-video-id');

        if (ytToken && ytVideoId) {
          try {
            const chatReq = await fetch(`/control-api/api/chat/live?videoId=${ytVideoId}`, {
              headers: { 'Authorization': `Bearer ${ytToken}` }
            });
            const chatData = await chatReq.json();
            if (chatData.messages && chatData.messages.length > 0) {
              realMessages = chatData.messages;
            }
          } catch (e) { console.warn("Fallo lectura chat real", e); }
        }

        let chatPrompt = "";

        if (realMessages.length > 0) {
          // Usar mensajes reales
          // Tomamos 3 al azar para dar contexto
          const sample = realMessages.sort(() => 0.5 - Math.random()).slice(0, 3).map(m => `"${m.text}"`).join(" / ");
          chatPrompt = `
El chat está activo con mensajes reales: ${sample}.
Seleccioná UNO o reaccioná al clima general de estos mensajes.
Respondé de forma breve, abierta y no técnica como la voz acompañante "La Señal".
Nunca cierres el tema.
No cites usuarios por nombre exacto, referite a ellos como "alguien dice" o "nos cuentan".
`.trim();
        } else {
          // Simulación (fallback)
          chatPrompt = `
El chat está activo (simulado). Temas: viajes, clima, noche, insomnio, tecnología.
Seleccioná UNA pregunta o reacción genérica del público.
Respondé de forma breve, abierta y no técnica como la voz acompañante "La Señal".
Nunca cierres el tema.
No cites usuarios.
`.trim();
        }

        chatLine = await aiGenerate(chatPrompt);
      } catch (e) { }
    }

    const [t1, t2] = await Promise.all([
      aiGenerate(ilfassPrompt),
      aiGenerate(companionPrompt)
    ]);

    const ilfassLines = safeLines(t1, 3);
    const compLines = safeLines(t2, 3);
    if (chatLine) compLines.push(safeLines(chatLine, 1)[0]);

    // Algoritmo de mezclado con tiempos (RITMO DE RADIO)
    // Patrón: Voz (15s) -> Musica (8s) -> Voz 2 -> Musica -> Voz 1
    const newQueue = [];
    let currentTime = now() + 2000; // Arranque suave

    // Maximo de items por ciclo
    const items = [];

    // Primero Ilfass (fuerte)
    if (ilfassLines[0]) items.push({ role: 'ilfass', text: ilfassLines.shift() });

    // Luego Companion
    if (compLines[0]) items.push({ role: 'companion', text: compLines.shift() });

    // Luego Ilfass
    if (ilfassLines[0]) items.push({ role: 'ilfass', text: ilfassLines.shift() });

    // Cierre Companion
    if (compLines[0]) items.push({ role: 'companion', text: compLines.shift() });

    // Asignar tiempos
    items.forEach(item => {
      newQueue.push({
        ...item,
        timestamp: currentTime
      });
      // Calculo de duración estimada + Silencio de música (5-10s)
      // 100 caracteres ~ 6-8 seg audio. + 8 seg música.
      const audioDur = Math.max(5000, (item.text.length * 60));
      const musicGap = 6000 + Math.random() * 4000; // 6 a 10 seg de música
      currentTime += audioDur + musicGap;
    });

    this.queue = newQueue;
    console.log(`✅ Ciclo generado: ${newQueue.length} items. Próxima voz: ${new Date(newQueue[0]?.timestamp).toTimeString()}`);
  }

  async runQueue() {
    if (!this.queue.length) return;

    // Sacar el primero
    const item = this.queue.shift();
    if (!item?.text) return;

    console.log(`🎙️ [${item.role}] Playing: "${item.text.substring(0, 30)}..."`);
    await speakRole(item.text, item.role);

    // El "silencio con música" es implícito: 
    // runQueue termina, el tick vuelve a evaluar, 
    // y el siguiente item tiene 'timestamp' en el futuro gracias a generateCycle.
  }
}

export const dialogueEngine = new DialogueEngine();

