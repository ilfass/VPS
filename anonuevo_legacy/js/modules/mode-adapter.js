/**
 * ModeAdapter
 * Envuelve un modo existente (`js/modes/*.js`) para montarlo dentro de un contenedor del Studio,
 * sin navegación entre páginas.
 */
export class ModeAdapter {
  constructor({ modeId, moduleUrl, container }) {
    this.modeId = modeId;
    this.moduleUrl = moduleUrl;
    this.container = container;
    this.instance = null;
  }

  async mount() {
    if (!this.container) throw new Error('ModeAdapter requires container');
    if (!this.moduleUrl) throw new Error('ModeAdapter requires moduleUrl');

    // Aislar layout del modo dentro del contenedor.
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';

    const mod = await import(this.moduleUrl);
    const ModeClass = mod?.default;
    if (!ModeClass) throw new Error(`No default export in ${this.moduleUrl}`);

    this.instance = new ModeClass(this.container);
    if (typeof this.instance.mount === 'function') {
      await this.instance.mount();
    }
  }

  async unmount() {
    try {
      if (this.instance && typeof this.instance.unmount === 'function') {
        await this.instance.unmount();
      }
    } catch (e) {
      // ignore
    } finally {
      this.instance = null;
      try { this.container.innerHTML = ''; } catch (e) { }
    }
  }
}

