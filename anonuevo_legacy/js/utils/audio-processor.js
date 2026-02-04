/**
 * Audio Processor
 * Modulo simple para evitar errores de carga 404.
 * En el futuro aqui puede ir logica de compresion/EQ.
 */
export class AudioProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;
    console.log("[AudioProcessor] Loaded placeholder module.");
  }
}
