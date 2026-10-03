# Plan del proyecto

Figuras de navegación astronómica es una aplicación web para dibujar las figuras de un libro de
introducción a la navegación por el Sol y las estrellas: coordenadas terrestres y celestes, el
triángulo de posición, la recta de altura y las correcciones de la altura. Quien la usa es el autor
del libro, un marino con mucha experiencia en el mar y poca paciencia para los programas de dibujo.

## Objetivos

1. **Figuras correctas.** Cada figura se construye con geometría real a partir de los valores que
   se escriben (latitud, declinación, horario…), y los rótulos dicen exactamente lo que se mide.
2. **Fácil de usar.** Letra grande, controles amplios y un recorrido en cinco pasos: elegir la
   figura, ajustar los valores, decidir qué se ve, el aspecto y el pie de figura.
3. **Listas para imprimir.** PNG de hasta 4100 px, SVG para el maquetador, blanco y negro para la
   imprenta y notación internacional o española.
4. **Para enseñar.** Construcción paso a paso, animaciones y vídeo para clases o presentaciones.
5. **Mantenible.** Sin dependencias, con pruebas automáticas y documentación para seguir
   ampliándola (con o sin ayuda de Claude Code).

## Estado actual: versión 2.0

### Hecho

- [x] Once tipos de figura en tres grupos (ver el catálogo).
- [x] Valores en grados y minutos con hemisferio, deslizadores y fechas.
- [x] Opciones de cada figura, rótulos editables y arrastrables, giro de la esfera con el ratón.
- [x] Estilos: color o blanco y negro, letra, grosor, notación, rótulos con palabras o símbolos,
      rótulos que siguen las curvas, flechas y líneas ocultas.
- [x] Construcción paso a paso de todas las figuras, con título de paso opcional en la imagen.
- [x] Animaciones: construir paso a paso, girar la esfera o cambiar un valor; grabación en vídeo
      (MP4 o WebM, según el navegador).
- [x] Exportar PNG (tres tamaños, fondo transparente opcional), SVG, ZIP con un PNG por paso y
      los ajustes en JSON (para guardar las figuras de cada capítulo).
- [x] Pestaña de datos calculados (altura, azimut, orto, depresión, situación observada…).
- [x] Deshacer y rehacer, y autoguardado en el navegador.
- [x] Funciona en el móvil y en modo oscuro (la hoja de la figura siempre es blanca).
- [x] 41 pruebas automáticas (fórmulas, formatos, cada figura con valores al azar, empaquetador).
- [x] Construcción en un solo archivo HTML y publicación automática en GitHub Pages.

### Decisiones tomadas

Se tomaron sin consultar porque eran fáciles de cambiar; conviene revisarlas:

- **Sin dependencias de npm.** El empaquetador (`scripts/build.mjs`) y el ZIP son propios. Así el
  repositorio funciona con solo tener Node 20 o superior.
- **Año de referencia 2026** para la posición del Sol en la figura de la eclíptica. La precisión
  (centésimas de grado) basta para ilustrar, no para navegar.
- **Notación por defecto internacional** (φ, λ, δ, t). La española (l, L, d, hL) está a un clic.
- **Licencia MIT**, con autoría genérica: cambia el nombre en `LICENSE` si quieres.
- **Vista inicial de cada esfera** elegida para que los elementos clave queden de frente; se
  puede girar con el ratón.

## Catálogo de figuras

| Figura | Qué enseña | Valores | Pasos |
| --- | --- | --- | --- |
| Coordenadas terrestres | Latitud y longitud | φ, λ | 4–5 |
| Punto subastral y círculo de altura | El astro en la vertical de un punto; círculo de alturas iguales | δ, hG, a, posición del observador | 4 |
| Coordenadas horizontales | Altura, azimut y distancia cenital | a, Z | 5–6 |
| Coordenadas ecuatoriales | Declinación, horario, Aries y ángulo sidéreo | δ, t, tγ | 4–5 |
| Triángulo de posición | Polo, cénit y astro; altura y azimut calculados | φ, δ, t | 6 |
| Movimiento diurno | Orto, ocaso, culminaciones, circumpolares | φ, δ, t | 3–5 |
| La eclíptica y el Sol | Declinación y ascensión recta del Sol a lo largo del año | fecha | 4–5 |
| Altura meridiana del Sol | Latitud por la meridiana (l = z + d) | φ, δ | 5 |
| Horarios vistos desde el polo | hL = hG + λ; hG = hGγ + AS | λ, hG, hGγ | 2–5 |
| Recta de altura | Método de Marcq Saint-Hilaire; corte de dos rectas | Z, Δa (×2) | 4–5 |
| Depresión del horizonte | ai, dp, ap, refracción | altura del ojo, ai | 3–5 |

## Arquitectura

```
index.html          página para desarrollar (carga src/main.js como módulo)
src/
  core/             sin DOM: funciona en el navegador y en Node
    math.js         vectores, arcos, círculos en grados
    astro.js        fórmulas náuticas (altura, azimut, orto, Sol, depresión…)
    format.js       grados y minutos, hemisferios, notaciones
    draw.js         clase Fig: primitivas → SVG, pasos de construcción
    render.js       figura + estado + estilo → SVG
    state.js        estado por defecto, validación al importar
  figures/          una figura por archivo + index.js (registro)
  ui/               controles, exportación (PNG, vídeo) y ZIP
  platform.js       descargas y almacenamiento (claude.ai o navegador normal)
  main.js           la interfaz
scripts/            build.mjs (un solo archivo), serve.mjs, render-examples.mjs
tests/              node:test
```

El dibujo es una función pura: `renderFigure(figura, estado, estilo) → SVG`. Eso permite probar
cada figura en Node, generar ejemplos sin navegador y reutilizar el mismo código para PNG, SVG,
pasos y vídeo.

## Hoja de ruta

### 2.1: más figuras para el libro

- Latitud por la Polar (con la corrección por la distancia polar de la estrella).
- Corrección completa de la altura del Sol: semidiámetro, paralaje, limbo inferior y superior.
- El sextante: partes y lectura (dibujo esquemático original).
- Ortodrómica y loxodrómica sobre la esfera y en la carta Mercator.
- La Tierra en su órbita y las estaciones.
- Husos horarios y hora legal.
- Reconocer estrellas: alineaciones a partir de la Osa Mayor y Orión (posiciones reales del catálogo).

### 2.2: trabajar por capítulos

- «Mi libro»: lista numerada de figuras con sus ajustes, exportable de una vez (ZIP).
- Numeración automática de figuras en el pie («Figura 3.2»).
- Texto alternativo (descripción) generado para cada figura, para la edición digital.
- Exportar GIF animado además de vídeo.

### 2.3: calidad

- Comparación visual automática de `examples/` entre versiones (pruebas de regresión).
- Interfaz en inglés (los textos ya están separados por figura).
- Línea de órdenes: `node scripts/render.mjs ajustes.json` para generar todas las figuras de un
  capítulo sin abrir el navegador.

## Riesgos y límites conocidos

- **Fuentes del PNG.** El PNG usa las fuentes instaladas en el ordenador (Georgia o la serif del
  sistema). Para un acabado idéntico en todas partes, usar el SVG con la fuente de la maqueta.
- **Vídeo.** Depende del navegador: Chrome y Edge graban MP4; Firefox, WebM; Safari antiguo puede
  no grabar. La animación siempre se puede reproducir y los pasos descargar como PNG.
- **Escala.** La depresión del horizonte y la refracción se dibujan exageradas (lo dice la figura).
- **Cálculos.** Son para ilustrar y comprobar el texto, no para navegar.

## Publicar en GitHub

Ver la sección «Crear el repositorio» del README.
