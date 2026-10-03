# Figuras de navegación astronómica

Aplicación web para dibujar las figuras de un libro o una clase de navegación por el Sol y las
estrellas: coordenadas terrestres y celestes, triángulo de posición, movimiento diurno, recta de
altura y más. Se eligen los valores en grados y minutos y la figura se dibuja con geometría real,
lista para descargar en PNG o SVG, paso a paso o como vídeo.

![La aplicación](docs/img/aplicacion.png)

## Figuras

| | | |
| --- | --- | --- |
| ![](docs/img/terrestre.png) Coordenadas terrestres | ![](docs/img/subastral.png) Punto subastral y círculo de altura | ![](docs/img/horizontales.png) Coordenadas horizontales |
| ![](docs/img/ecuatoriales.png) Coordenadas ecuatoriales | ![](docs/img/triangulo.png) Triángulo de posición | ![](docs/img/diurno.png) Movimiento diurno |
| ![](docs/img/ecliptica.png) La eclíptica y el Sol | ![](docs/img/meridiana.png) Altura meridiana del Sol | ![](docs/img/horarios.png) Horarios vistos desde el polo |
| ![](docs/img/recta.png) Recta de altura | ![](docs/img/depresion.png) Depresión del horizonte | |

## Qué se puede hacer

- Ajustar cada valor en grados y minutos (con hemisferio) o con un deslizador.
- Elegir qué se ve, mover los rótulos con el ratón, cambiar su texto y girar la esfera.
- Color o blanco y negro, notación internacional (φ, λ, δ, t) o española (l, L, d, hL), rótulos
  con símbolos o con palabras, que pueden seguir las curvas.
- Ver la figura **paso a paso** y descargar todos los pasos en un ZIP de imágenes.
- **Animar**: construir la figura, girar la esfera o cambiar un valor (por ejemplo, un día entero
  del movimiento diurno) y grabarlo en vídeo.
- Consultar los **datos calculados**: altura y azimut, orto y ocaso, depresión, situación
  observada…
- Descargar PNG (hasta 4100 px, con fondo transparente si se quiere) o SVG para la maqueta.
- Guardar los ajustes en un archivo y volver a abrirlos; deshacer y rehacer.

La [guía de uso](docs/guia-de-uso.md) lo explica paso a paso.

## Usarla

- **En internet:** una vez creado el repositorio y activado GitHub Pages (ver abajo), la
  aplicación queda en `https://TU-USUARIO.github.io/figuras-navegacion/`.
- **Sin internet:** ejecuta `npm run build` y abre `dist/index.html` con doble clic. Es un único
  archivo que se puede copiar a cualquier ordenador.

## Desarrollo

Necesitas [Node.js](https://nodejs.org) 20 o superior. No hay dependencias que instalar.

```bash
npm run dev        # http://localhost:8080
npm test           # pruebas automáticas
npm run build      # dist/index.html y dist/artifact.html
npm run examples   # examples/*.svg de cada figura y cada paso
```

La estructura del código, las convenciones de geometría y cómo añadir una figura están en
[CLAUDE.md](CLAUDE.md). El plan y la hoja de ruta, en [PLAN.md](PLAN.md).

## Crear el repositorio

1. Crea un repositorio vacío en GitHub llamado `figuras-navegacion` (sin README ni licencia).
2. En la carpeta del proyecto:

   ```bash
   git init
   git add .
   git commit -m "Figuras de navegación astronómica 2.0"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/figuras-navegacion.git
   git push -u origin main
   ```

3. En GitHub, ve a **Settings → Pages** y en **Source** elige **GitHub Actions**. Cada vez que
   subas cambios a `main`, el flujo `Publicar en GitHub Pages` pasa las pruebas, construye la
   aplicación y la publica.

## Licencia

MIT. Las figuras que generes con la aplicación son tuyas.
