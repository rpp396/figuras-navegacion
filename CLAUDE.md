# CLAUDE.md

Guía para trabajar en este repositorio con Claude Code (o cualquier otra persona).

## Qué es

Aplicación web en español para dibujar figuras de navegación astronómica (coordenadas terrestres y
celestes, triángulo de posición, recta de altura…) para un libro y para clases. El usuario final es
un marino mayor: la interfaz tiene que ser clara, con letra grande y sin jerga informática.
El plan y la hoja de ruta están en `PLAN.md`; la guía de uso, en `docs/guia-de-uso.md`.

## Comandos

```bash
npm run dev        # servidor local en http://localhost:8080 (los módulos ES no van con file://)
npm test           # pruebas con node:test (sin dependencias)
npm run build      # dist/index.html (documento completo) y dist/artifact.html (para claude.ai)
npm run examples   # examples/*.svg: cada figura y cada paso, para revisar el dibujo sin navegador
```

No hay dependencias de npm ni `node_modules`. Node 20 o superior.

## Estructura

- `src/core/` es **puro** (sin DOM): `math.js`, `astro.js`, `format.js`, `draw.js` (clase `Fig`),
  `render.js`, `state.js`. Se ejecuta en Node en las pruebas.
- `src/figures/` una figura por archivo; `index.js` las registra y agrupa.
- `src/ui/` controles, exportación (PNG, vídeo) y ZIP. `src/platform.js` aísla lo que cambia entre
  claude.ai y un navegador normal (descargas y `localStorage`).
- `src/main.js` la interfaz. `index.html` la página de desarrollo. `src/styles.css` los estilos.

## Convenciones de geometría (importante)

- Todos los ángulos de la API van en **grados**.
- Mundo 3D: `Y` arriba. En figuras del horizonte, `Y` es el cénit y `hor(A) = [sin A, 0, −cos A]`:
  N = −z, E = +x, S = +z, W = −x. En figuras terrestres y ecuatoriales, `Y` es el polo norte y
  `geo(lat, lon)` pone la longitud E hacia +x.
- Latitud y declinación positivas al N; longitud positiva al E; horarios (t, hL, hG) hacia el W de
  0° a 360°; azimut desde el N hacia el E.
- Cámara: `view = {yaw, pitch}`; `F.P(p)` devuelve `[x, y, profundidad]`, y profundidad > 0 es la
  cara visible de la esfera. Lienzo de 820 × 780, centro (410, 392), radio 290 (`draw.js`).
- Figuras planas (meridiana, horarios, recta, depresión) trabajan en coordenadas de pantalla con
  `F.path`, `F.poly`, `F.place`…

## Cómo añadir una figura

1. Crea `src/figures/mi-figura.js` exportando por defecto un objeto con `id`, `group`
   (`tierra` | `celeste` | `plano`), `name`, `desc`, `view` (o `null` si es plana), `params`,
   `opts`, `astro` (opcional), `caption`, `animations`, `draw(F, p, o, ctx)` y `compute(p, o)`.
   Copia la estructura de una figura parecida.
2. Tipos de `params`: `angle` (grados y minutos; `hem: ['N','S']` para hemisferio), `number` (con
   `unit` y `step`) y `day` (día del año, 0 = 1 de enero). `def` debe estar entre `min` y `max`.
3. En `draw`, llama a `F.step(n, 'Título')` antes de cada grupo de elementos. Los pasos van
   numerados desde 1 **sin huecos**: los pasos opcionales, al final y con un contador.
4. Rótulos: `F.val(símbolo, valor, palabra)` respeta los estilos de símbolos/palabras y
   valores. Los símbolos salen de `F.N` (notación internacional o española, en `format.js`).
5. Regístrala en `src/figures/index.js`. Ejecuta `npm test` y `npm run examples` y mira los SVG.

## Reglas del empaquetador (`scripts/build.mjs`)

Es mínimo a propósito. Solo admite importaciones relativas con nombre o por defecto
(`import { a, b as c } from './x.js'`), `export function|const|let|class`, `export default` y
`export { … }`. Sin importaciones circulares ni `export` de variables que cambien después (las
importaciones se copian, no son vivas). Si algo no se admite, el build falla con un mensaje claro.

## Estilo

- Textos de la interfaz en español, en frase normal (sin mayúsculas en títulos), con verbos claros:
  «Descargar PNG», «Grabar vídeo». Términos náuticos correctos (horario, cénit, azimut, Aries…).
- Formatos: `dm()` para grados y minutos, `fLat`/`fLon` con hemisferio, coma decimal, signo menos
  tipográfico (−).
- Controles de al menos 44 px de alto; letra Atkinson Hyperlegible; colores siempre desde las
  variables de `styles.css` (tema claro y oscuro). La hoja de la figura es siempre blanca.
- Código: módulos ES, 2 espacios, comillas simples, comentarios en español donde aclaren algo.

## Antes de dar algo por terminado

- `npm test` en verde.
- `npm run build` sin errores.
- Revisar visualmente las figuras tocadas (`npm run examples` o `npm run dev`).
- Si cambia la forma del estado guardado, sube `STATE_VERSION` en `src/core/state.js` y añade la
  migración en `sanitizeState`, o los ajustes guardados por el usuario se perderán.

## Publicar en GitHub Pages

Automático: al subir a `main`, `.github/workflows/pages.yml` pasa las pruebas, construye y fuerza
la rama `gh-pages` con `index.html`, `docs/` y `.nojekyll`. Pages publica esa rama en
<https://rpp396.github.io/figuras-navegacion/>. No edites `gh-pages` a mano.

## Publicar en claude.ai

`dist/artifact.html` es el contenido de la página sin `<!doctype>`, `<html>`, `<head>` ni `<body>`
(el visor los añade). Se publica con la capacidad `downloads` para que funcionen las descargas.
