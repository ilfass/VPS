export class YouTubeOAuth {
  constructor({ clientId, redirectUri = null, apiBase = '/control-api' } = {}) {
    if (!clientId) throw new Error('YouTubeOAuth: clientId requerido');
    this.clientId = clientId;
    this.apiBase = apiBase;
    this.redirectUri = redirectUri || `${window.location.origin}/vivos/youtube/oauth-callback.html`;
    this.scopes = [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];
    this.marginMs = 5 * 60 * 1000;
  }

  _get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  _set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  _del(k) { try { localStorage.removeItem(k); } catch (e) {} }

  getAccessTokenRaw() { return this._get('youtube_oauth_token') || ''; }
  getRefreshTokenRaw() { return this._get('youtube_refresh_token') || ''; }
  getExpiryMs() {
    const v = this._get('youtube_token_expiry');
    const n = v ? Number(v) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  isAuthenticated() {
    const token = this.getAccessTokenRaw();
    const exp = this.getExpiryMs();
    if (!token || !exp) return false;
    return Date.now() < (exp - this.marginMs);
  }

  clearTokens() {
    this._del('youtube_oauth_token');
    this._del('youtube_refresh_token');
    this._del('youtube_token_expiry');
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshTokenRaw();
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(`${this.apiBase}/api/youtube/oauth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token || !data?.expires_in) {
      throw new Error(data?.error || 'refresh_failed');
    }

    this._set('youtube_oauth_token', data.access_token);
    this._set('youtube_token_expiry', String(Date.now() + Number(data.expires_in) * 1000));
    return data.access_token;
  }

  async getAccessToken() {
    if (this.isAuthenticated()) return this.getAccessTokenRaw();

    const token = this.getAccessTokenRaw();
    const exp = this.getExpiryMs();
    const hasToken = !!token && !!exp;
    const canRefresh = !!this.getRefreshTokenRaw();

    if (hasToken && canRefresh) {
      return await this.refreshAccessToken();
    }
    throw new Error('not_authenticated');
  }

  _authUrl({ state }) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.scopes.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    if (state) url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForTokens(code) {
    const res = await fetch(`${this.apiBase}/api/youtube/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: this.redirectUri })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token || !data?.expires_in) {
      throw new Error(data?.error || 'token_exchange_failed');
    }

    this._set('youtube_oauth_token', data.access_token);
    if (data.refresh_token) this._set('youtube_refresh_token', data.refresh_token);
    this._set('youtube_token_expiry', String(Date.now() + Number(data.expires_in) * 1000));
    return data;
  }

  authorize() {
    const state = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const url = this._authUrl({ state });

    const w = 520, h = 640;
    const left = Math.max(0, Math.round((screen.width - w) / 2));
    const top = Math.max(0, Math.round((screen.height - h) / 2));
    const popup = window.open(
      url,
      'youtube_oauth',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      throw new Error('popup_blocked');
    }

    return new Promise((resolve, reject) => {
      let done = false;

      const cleanup = () => {
        window.removeEventListener('message', onMsg);
        try { popup.close(); } catch (e) {}
      };

      const onMsg = async (event) => {
        if (event.origin !== window.location.origin) return;
        const msg = event.data || {};
        if (!msg.type) return;
        if (msg.state && msg.state !== state) return;
        if (done) return;

        if (msg.type === 'youtube_oauth_error') {
          done = true;
          cleanup();
          reject(new Error(msg.error || 'oauth_error'));
          return;
        }
        if (msg.type === 'youtube_oauth_success') {
          done = true;
          try {
            const tokens = await this.exchangeCodeForTokens(msg.code);
            cleanup();
            resolve(tokens);
          } catch (e) {
            cleanup();
            reject(e);
          }
        }
      };

      window.addEventListener('message', onMsg);

      const timer = setInterval(() => {
        if (done) { clearInterval(timer); return; }
        if (popup.closed) {
          clearInterval(timer);
          cleanup();
          reject(new Error('popup_closed'));
        }
      }, 400);
    });
  }
}

/**
 * YouTube OAuth 2.0 Manager
 * Maneja autenticación OAuth 2.0 para YouTube API
 */

export class YouTubeOAuth {
  constructor({ clientId, redirectUri = null }) {
    this.clientId = clientId;
    this.redirectUri = redirectUri || `${window.location.origin}/vivos/studio/oauth-callback.html`;
    this.scopes = [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtubepartner'
    ];
    this.tokenKey = 'youtube_oauth_token';
    this.refreshTokenKey = 'youtube_refresh_token';
    this.tokenExpiryKey = 'youtube_token_expiry';
  }

  /**
   * Inicia el flujo de autenticación OAuth
   */
  authorize() {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'true');

    // Abrir ventana de autenticación
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const authWindow = window.open(
      authUrl.toString(),
      'YouTube OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    return new Promise((resolve, reject) => {
      // Escuchar mensaje del callback
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'youtube_oauth_success') {
          window.removeEventListener('message', messageListener);
          authWindow.close();
          this.handleAuthCode(event.data.code)
            .then(resolve)
            .catch(reject);
        } else if (event.data.type === 'youtube_oauth_error') {
          window.removeEventListener('message', messageListener);
          authWindow.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageListener);

      // Timeout después de 5 minutos
      setTimeout(() => {
        window.removeEventListener('message', messageListener);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Intercambia código de autorización por tokens
   */
  async handleAuthCode(code) {
    try {
      // Enviar código al backend para intercambiar por tokens
      const res = await fetch('/control-api/api/youtube/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: this.redirectUri })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to exchange code for tokens');
      }

      const data = await res.json();
      this.saveTokens(data);
      return data;
    } catch (e) {
      console.error('[YouTubeOAuth] Error exchanging code:', e);
      throw e;
    }
  }

  /**
   * Obtiene access token válido (refresca si es necesario)
   */
  async getValidAccessToken() {
    const token = localStorage.getItem(this.tokenKey);
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    const refreshToken = localStorage.getItem(this.refreshTokenKey);

    if (!token || !expiry) {
      throw new Error('No access token found. Please authorize.');
    }

    // Verificar si el token está expirado (con margen de 5 minutos)
    const expiryTime = parseInt(expiry, 10);
    const now = Date.now();
    const margin = 5 * 60 * 1000; // 5 minutos

    if (now >= expiryTime - margin) {
      // Token expirado o próximo a expirar, refrescar
      if (refreshToken) {
        console.log('[YouTubeOAuth] Token expirado, refrescando...');
        return await this.refreshAccessToken(refreshToken);
      } else {
        throw new Error('Token expired and no refresh token available. Please re-authorize.');
      }
    }

    return token;
  }

  /**
   * Refresca el access token usando refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const res = await fetch('/control-api/api/youtube/oauth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to refresh token');
      }

      const data = await res.json();
      this.saveTokens(data);
      return data.access_token;
    } catch (e) {
      console.error('[YouTubeOAuth] Error refreshing token:', e);
      // Si falla el refresh, limpiar tokens y requerir nueva autorización
      this.clearTokens();
      throw new Error('Failed to refresh token. Please re-authorize.');
    }
  }

  /**
   * Guarda tokens en localStorage
   */
  saveTokens(data) {
    if (data.access_token) {
      localStorage.setItem(this.tokenKey, data.access_token);
    }
    if (data.refresh_token) {
      localStorage.setItem(this.refreshTokenKey, data.refresh_token);
    }
    if (data.expires_in) {
      const expiry = Date.now() + (data.expires_in * 1000);
      localStorage.setItem(this.tokenExpiryKey, expiry.toString());
    }
  }

  /**
   * Limpia tokens almacenados
   */
  clearTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
  }

  /**
   * Verifica si está autenticado
   */
  isAuthenticated() {
    const token = localStorage.getItem(this.tokenKey);
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    
    if (!token || !expiry) return false;
    
    const expiryTime = parseInt(expiry, 10);
    const now = Date.now();
    const margin = 5 * 60 * 1000;
    
    return now < expiryTime - margin;
  }

  /**
   * Obtiene información del estado de autenticación
   */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!localStorage.getItem(this.tokenKey),
      hasRefreshToken: !!localStorage.getItem(this.refreshTokenKey),
      tokenExpiry: localStorage.getItem(this.tokenExpiryKey)
    };
  }
}
