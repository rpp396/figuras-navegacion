#!/usr/bin/env node
// Genera un SVG de cada figura (valores por defecto) y de cada uno de sus pasos en examples/.
// Útil para revisar cambios en el dibujo sin abrir el navegador. Uso: npm run examples

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURES } from '../src/figures/index.js';
import { renderFigure } from '../src/core/render.js';
import { defaultFigureState, DEFAULT_STYLE } from '../src/core/state.js';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../examples');
mkdirSync(out, { recursive: true });
let n = 0;
for (const f of FIGURES) {
  const fs = defaultFigureState(f);
  const full = renderFigure(f, fs, DEFAULT_STYLE);
  writeFileSync(resolve(out, `${f.id}.svg`), full.svg);
  n++;
  for (const st of full.steps) {
    const r = renderFigure(f, fs, DEFAULT_STYLE, { reveal: { upto: st.n, frac: 1 } });
    writeFileSync(resolve(out, `${f.id}-paso-${st.n}.svg`), r.svg);
    n++;
  }
}
console.log(`${n} archivos SVG en examples/`);
