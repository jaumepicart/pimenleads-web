# Reels y TikToks de Pimen Reformas

Generador de vídeos verticales para captar particulares que quieren reformar en Barcelona. La empresa la llevan Alex y Jaume, y no hacen obras: orientan en el precio y consiguen hasta 3 presupuestos de empresas. El plan y la estrategia están en `docs/`.

## Cómo funciona

- Cada `videos/NNN-nombre.json` es un vídeo. `npm run generar` crea en `salida/` el MP4, la portada y el texto.
- `src/Reel.jsx` tiene los formatos de escena: `gancho`, `paso`, `documento` y `cierre`.
- `**texto**` resalta una parte de un titular. Campo `prueba`: qué compara el vídeo; actualiza `salida/catalogo.csv`.
- Remotion solo saca fotogramas y los codifica `ffmpeg-static`, para que también funcione en macOS anterior al 15.
- Comprueba cada vídeo nuevo mirando fotogramas de la mitad de cada escena, no del inicio.

## Normas de cada vídeo

- **Sin precios sin validar.** Solo importes de ejemplo, con la nota `EJEMPLO` visible.
- **Solo promesas que ya hace la web:** «primero hablas con Alex o Jaume», «gratis», «sin compromiso», «hasta 3 presupuestos».
- **Sin «empresas revisadas»** hasta haberlo comprobado con cada empresa.
- **Sin «te pagamos» ni la bonificación** sin sus condiciones al lado.
- **Sin clientes, reseñas ni obras inventadas.** Sin avatares de IA, voces clonadas ni renders presentados como obras reales.
- **Sin datos legales o técnicos no comprobados** (permisos, plazos, normativa).
- **Barcelona o un barrio** en la primera frase o en el texto de arriba.
- **Una sola variable por ronda de pruebas,** y al menos 3 vídeos por opción (`docs/7-automatizar-reels.md`, apartado 5).

## Seguridad

Esta es la rama `reels` de `jaumepicart/pimenleads-web`, un repositorio público. Nunca la fusiones con `main`, porque GitHub Pages publica `main` entero en pimenleads.com. Trabaja y sube siempre a `reels`. No subas contraseñas, claves ni datos de clientes: todo lo que hay aquí se puede ver en GitHub.

## Lo siguiente que hay que construir

Los formatos con voz y con cara: transcribir la grabación con Whisper, quitar silencios y añadir subtítulos, marca y cierre. Hazlo en un Mac con macOS 15 o posterior y con una grabación real, porque en ese equipo sí funciona el codificador de Remotion.
