// Cada figura debe dibujarse sin valores rotos (NaN, undefined…) con cualquier combinación
// razonable de valores, opciones y estilos, y respetar la construcción paso a paso.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIGURES, GROUPS } from '../src/figures/index.js';
import { renderFigure } from '../src/core/render.js';
import { defaultFigureState, defaultState, sanitizeState, DEFAULT_STYLE } from '../src/core/state.js';

const BAD = /NaN|undefined|Infinity|\[object Object\]/;

// Generador pseudoaleatorio con semilla, para que las pruebas sean repetibles.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('el registro de figuras es coherente', () => {
  const ids = new Set();
  for (const f of FIGURES) {
    assert.ok(!ids.has(f.id), `id repetido: ${f.id}`);
    ids.add(f.id);
    assert.ok(GROUPS.some((g) => g.id === f.group), `${f.id}: grupo desconocido`);
    assert.ok(f.name && f.desc && f.caption, `${f.id}: faltan textos`);
    assert.equal(typeof f.draw, 'function');
    assert.equal(typeof f.compute, 'function');
    for (const p of f.params) {
      assert.ok(p.min <= p.def && p.def <= p.max, `${f.id}.${p.k}: valor por defecto fuera de rango`);
      assert.ok(['angle', 'number', 'day', undefined].includes(p.kind), `${f.id}.${p.k}: tipo desconocido`);
    }
    for (const a of f.animations || []) assert.ok(f.params.some((p) => p.k === a.param), `${f.id}: animación con valor desconocido`);
  }
});

for (const f of FIGURES) {
  test(`${f.id}: se dibuja con valores al azar`, () => {
    const rand = rng(f.id.length * 7919);
    for (let i = 0; i < 40; i++) {
      const fs = defaultFigureState(f);
      for (const p of f.params) fs.params[p.k] = p.min + (p.max - p.min) * rand();
      for (const [k] of f.opts) fs.opts[k] = rand() > 0.4;
      if (f.view) fs.view = { yaw: -180 + 360 * rand(), pitch: -60 + 149 * rand() };
      fs.caption = i % 3 ? '' : 'Figura de prueba con un pie de figura bastante largo para comprobar el ajuste';
      const style = {
        ...DEFAULT_STYLE,
        mode: rand() > 0.5 ? 'bn' : 'color',
        words: rand() > 0.5, values: rand() > 0.3, curved: rand() > 0.5,
        notation: rand() > 0.5 ? 'esp' : 'intl', size: ['s', 'm', 'l'][i % 3], weight: ['f', 'n', 'g'][i % 3],
      };
      const r = renderFigure(f, fs, style);
      const bad = r.svg.match(BAD);
      assert.equal(bad, null, `${f.id}: ${bad && r.svg.slice(Math.max(0, bad.index - 60), bad.index + 40)}`);
      assert.ok(r.steps.length >= 2, `${f.id}: al menos 2 pasos`);
      assert.deepEqual(r.steps.map((s) => s.n), r.steps.map((_, j) => j + 1), `${f.id}: pasos numerados sin huecos`);
      const rows = f.compute(fs.params, fs.opts);
      for (const [k, v] of rows) assert.ok(typeof k === 'string' && typeof v === 'string' && !BAD.test(v), `${f.id}: dato roto ${k}=${v}`);
    }
  });

  test(`${f.id}: la construcción paso a paso añade elementos en cada paso`, () => {
    const fs = defaultFigureState(f);
    const full = renderFigure(f, fs, DEFAULT_STYLE);
    let prev = 0;
    for (const st of full.steps) {
      const r = renderFigure(f, fs, DEFAULT_STYLE, { reveal: { upto: st.n, frac: 1 } });
      assert.ok(r.svg.length > prev, `${f.id}: el paso ${st.n} no añade nada`);
      prev = r.svg.length;
      const half = renderFigure(f, fs, DEFAULT_STYLE, { reveal: { upto: st.n, frac: 0.5 } });
      assert.equal(half.svg.match(BAD), null);
    }
  });
}

test('el estado importado se valida y se recorta a los rangos', () => {
  const raw = defaultState(FIGURES);
  raw.figures.horizontales.params.alt = 500;
  raw.figures.horizontales.opts.zd = 'sí';
  raw.style.mode = 'neón';
  raw.figure = 'no-existe';
  const s = sanitizeState(JSON.parse(JSON.stringify(raw)), FIGURES);
  assert.equal(s.figures.horizontales.params.alt, 90);
  assert.equal(s.figures.horizontales.opts.zd, false);
  assert.equal(s.style.mode, 'color');
  assert.equal(s.figure, 'horizontales');
  assert.deepEqual(sanitizeState({ version: 1 }, FIGURES), defaultState(FIGURES), 'otra versión: valores por defecto');
});
