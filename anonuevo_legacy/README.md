# `anonuevo` — Motor de transmisión `/vivos/*` + panel de control

Este directorio contiene el sistema de “hojas” para transmisión (rutas `/vivos/*`), el panel de control (`control.html`) y el servidor (`control-server.js`) que expone APIs y eventos para coordinación.

## 🚀 Inicio rápido (local)

```bash
cd anonuevo
npm install
npm start
```

Luego abrí:

- `http://localhost:3005/control.html` (panel)
- `http://localhost:3005/vivos/reloj/` (ejemplo de hoja)

## 🧭 Estructura (alto nivel)

- **`vivos/`**: páginas “hoja” (cada modo tiene su `index.html`).
- **`js/main.js`**: loader de modos + orquestación global.
- **`js/modes/`**: modos visuales.
- **`js/utils/`**: motores y utilidades compartidas.
- **`control-server.js`**: server \(puerto `3005`\) + eventos + APIs.
- **`control.html`**: panel de control.
- **`docs/`**: documentación organizada.

## 📚 Docs

Ver `docs/README.md`.

## Nota sobre “Studio”

Se removió del runtime (y su documentación quedó archivada en `docs/_archive/studio/`) para re-implementarlo desde cero de forma más ordenada.
