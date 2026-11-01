# Reels y TikToks de Pimen Reformas

Genera vídeos verticales listos para subir a Instagram y TikTok. Un mismo archivo sirve para las dos.

**Esta es la rama `reels` del repositorio de la web. Nunca la fusiones con `main`:** todo lo que entra en `main` se publica en pimenleads.com. La rama no se publica en la web, pero sí la puede ver cualquiera en GitHub, también el plan de `docs/`. No subas aquí contraseñas ni datos de clientes.

## Ponerlo en marcha (solo la primera vez)

1. Instala Node.js, versión LTS, desde [nodejs.org](https://nodejs.org).
2. Abre Terminal y descarga el proyecto:

```bash
git clone -b reels --single-branch https://github.com/jaumepicart/pimenleads-web.git pimen-reels
```

3. Instala lo que necesita:

```bash
cd pimen-reels && npm ci
```

## Generar los vídeos

Dentro de la carpeta `pimen-reels`:

```bash
npm run generar
```

Genera todos los vídeos que aún no existan. La primera vez descarga el motor de renderizado, unos 200 MB. Hace falta internet, también para las tipografías. Si ves un error de «Timed out» seguido de «Se vuelve a probar», es normal: déjalo terminar.

Cada vídeo queda en `salida/<nombre>/`:

| Archivo | Para qué |
|---|---|
| `<nombre>.mp4` | El vídeo, 1080×1920 y sin sonido |
| `portada.png` | La portada, si la plataforma la pide |
| `texto.txt` | El texto para pegar al publicar |

`salida/catalogo.csv` indica qué prueba cada vídeo. Sirve para comparar resultados.

Para rehacer un vídeo después de cambiarlo, indica su número:

```bash
npm run generar -- 003
```

## Publicar

1. Mira el vídeo entero en el móvil y lee `texto.txt`.
2. Súbelo a Instagram y TikTok y añade un audio de la biblioteca comercial de cada aplicación.
3. Publica como máximo un vídeo al día, y alterna días y horas.

## Vídeos nuevos

Cada archivo de `videos/` es un vídeo. Para crear otro, copia uno, cámbiale el número y edita los textos. O abre esta carpeta con Claude Code y pídele el siguiente lote: las normas están en `CLAUDE.md`.

Para ver los cambios al momento, sin generar el vídeo:

```bash
npm run editor
```

## Qué hay y qué falta

| Formato | Estado |
|---|---|
| Texto en lista | Listo |
| Presupuesto en pantalla | Listo |
| Vuestra voz sobre animación | Por construir |
| Vosotros a cámara, con cortes y subtítulos automáticos | Por construir |
| Precios con barras | Por construir: faltan los precios validados |
| Fotos reales de obras | Por construir: faltan las fotos con permiso |

El plan completo está en [docs/7-automatizar-reels.md](docs/7-automatizar-reels.md).

## Si algo falla

- **`npm ci` o `npm run generar` dan error:** copia el mensaje completo y pásaselo a Claude Code, abierto en esta carpeta.
- **Probado solo en un Mac Intel con macOS 13.** Aún no se ha ejecutado en Apple Silicon. Debería funcionar, pero es la primera vez.
- **No actualices los paquetes** sin motivo: `npm ci` instala las versiones ya probadas.
- **Licencia de Remotion:** es gratis para empresas de hasta 3 empleados. Si pasáis de ahí, hace falta licencia.
