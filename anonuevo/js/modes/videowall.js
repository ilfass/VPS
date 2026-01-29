/**
 * Videowall: APIs (Pexels) → narrador presenta → video en PrimaryStage → al terminar, comentario (voz).
 * Usa /control-api/api/videos/next y /control-api/api/videos/outro.
 */
import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';

function isStudioSubtitlesEnabled() {
  try {
    const v = localStorage.getItem('studio_subtitles_enabled');
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch (e) {
    return true;
  }
}

function speakWithStudioSubtitles(text, onEnd) {
  const enabled = isStudioSubtitlesEnabled();
  if (enabled) {
    try { avatarSubtitlesManager.show(); } catch (e) { }
  }
  audioManager.speak(
    text || ' ',
    'news',
    () => {
      if (enabled) {
        setTimeout(() => {
          try { avatarSubtitlesManager.hide(); } catch (e) { }
        }, 2500);
      }
      if (typeof onEnd === 'function') onEnd();
    },
    {
      mode: 'lines',
      onUpdate: (fullLine) => {
        if (!enabled) return;
        try { avatarSubtitlesManager.setSubtitles(fullLine); } catch (e) { }
      }
    }
  );
}

export default class VideowallMode {
  constructor(container) {
    this.container = container;
    this.video = null;
    this._enabled = true;
  }

  async mount() {
    this._enabled = true;
    this.container.innerHTML = '';
    const query = (window.__studioCurrentSlot?.query || 'nature').toString().trim() || 'nature';

    const res = await fetch(`/control-api/api/videos/next?query=${encodeURIComponent(query)}`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;

    if (!data || !data.ok || !data.url) {
      const msg = document.createElement('div');
      msg.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);color:rgba(255,255,255,0.8);font-family:monospace;font-size:14px;';
      msg.textContent = data?.error === 'PEXELS_API_KEY not configured'
        ? 'Videowall: PEXELS_API_KEY no configurada'
        : 'Videowall: no se pudo cargar el video';
      this.container.appendChild(msg);
      return;
    }

    const { url, intro, id } = data;

    const video = document.createElement('video');
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    video.preload = 'auto';
    video.playsInline = true;
    video.src = url;
    video.muted = false;
    this.video = video;
    this.container.appendChild(video);

    const runOutro = async () => {
      if (!this._enabled) return;
      const r2 = await fetch(`/control-api/api/videos/outro?query=${encodeURIComponent(query)}&id=${encodeURIComponent(String(id || ''))}`).catch(() => null);
      const d2 = r2?.ok ? await r2.json().catch(() => null) : null;
      const outro = (d2?.text || '').trim() || 'Hasta la próxima.';
      speakWithStudioSubtitles(outro, () => {});
    };

    video.onended = () => {
      runOutro();
    };

    speakWithStudioSubtitles(intro || `Un momento de ${query}.`, () => {
      if (!this._enabled || !video) return;
      video.play().catch(() => {});
    });
  }

  unmount() {
    this._enabled = false;
    try {
      if (this.video) {
        this.video.pause();
        this.video.src = '';
        this.video = null;
      }
      this.container.innerHTML = '';
      try { audioManager.cancel(); } catch (e) { }
    } catch (e) { }
  }
}
