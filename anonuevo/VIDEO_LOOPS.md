## Videos en el streaming (sin “videos externos”)

Sí: podés agregar video al sistema aunque todo sea programado.

### Dónde subir los videos
El servidor ya expone `/media/*` y el panel (`/control.html`) ya lista y permite lanzar **VID**.

- **Global (sirve para cualquier escena)**:
  - `anonuevo/media/Global/mi_loop.mp4`
- **Por país** (si querés que aparezcan al visitar un país):
  - `anonuevo/media/Argentina/loop_buenos_aires.mp4`
  - `anonuevo/media/Japan/loop_tokyo.webm`

### Formatos recomendados
- **MP4 (H.264 + AAC)**: máxima compatibilidad.
- **WebM (VP9/VP8)**: también ok, a veces más liviano.

Duración recomendada: **8–25s** en loop.

### Cómo lanzarlos en vivo
1. Abrí el panel: `/control.html`
2. Sección Media → filtro **VID**
3. Botón **LAUNCH**

El video se reproduce dentro de la escena (como overlay), ideal para capturar con OBS.

### Nota técnica (autoplay)
Para evitar bloqueos de autoplay en navegadores, los videos se reproducen **muted** por defecto.
El audio del stream queda a cargo de la música ambiente + voz.

