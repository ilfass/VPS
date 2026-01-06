# El Viaje de los Reyes Magos

Página interactiva que representa el viaje de los 3 Reyes Magos (Melchor, Gaspar y Baltasar) desde Oriente hasta Belén.

## Características

- Mapa interactivo con D3.js mostrando la ruta del viaje
- Animación del recorrido paso a paso
- Información sobre cada rey y su regalo
- Música de fondo
- Diseño elegante con tema navideño

## Tecnologías

- D3.js para visualización del mapa
- TopoJSON para datos geográficos
- HTML5 Audio para música de fondo
- CSS3 para animaciones

## Estructura

- `index.html` - Página principal
- `styles.css` - Estilos y animaciones
- `script.js` - Lógica del mapa y animación
- `music.mp3` - Música de fondo (agregar archivo)

## Uso

1. Agregar archivo de música `music.mp3` o `music.ogg` en la carpeta
   - Recomendado: Música navideña instrumental o villancicos tradicionales
   - Ejemplos: "Ya vienen los Reyes Magos", música de época, música clásica navideña
2. Abrir `index.html` en un navegador
3. La animación comenzará automáticamente después de 2 segundos
4. La voz en off narrará automáticamente cada ubicación e historia

## Características

- **Voz en off automática**: Usa Web Speech API para narrar las historias
- **Animaciones de los reyes**: Los 3 reyes aparecen juntos con animaciones de flotación
- **Ciclo infinito**: Perfecto para streaming continuo sin intervención
- **Música de fondo**: Reproduce automáticamente si está disponible

## Ruta del Viaje

1. Persia (Oriente) - Inicio del viaje
2. Babilonia - Pasando por las antiguas tierras
3. Damasco - Ciudad de comercio
4. Jerusalén - Consultando al rey Herodes
5. Belén - Llegada al pesebre
