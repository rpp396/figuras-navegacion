import { DEG } from '../core/math.js';
import { W, H } from '../core/draw.js';
import { dip, refraction, horizonDistance } from '../core/astro.js';
import { dm, dmd, fNum } from '../core/format.js';

// Vista lateral, no a escala: la depresión y la refracción se exageran para que se vean.

const X0 = 190, Y0 = 560, RE = 1150;

/** Punto a distancia r de E con elevación e (grados, positiva hacia arriba). */
const ray = (E, r, e) => [E[0] + r * Math.cos(e * DEG), E[1] - r * Math.sin(e * DEG)];
const arcAt = (E, r, e0, e1) => {
  const n = Math.max(2, Math.ceil(Math.abs(e1 - e0) / 1.5));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(ray(E, r, e0 + ((e1 - e0) * i) / n));
  return pts;
};

export default {
  id: 'depresion',
  group: 'plano',
  name: 'Depresión del horizonte',
  desc: 'Altura instrumental, aparente y refracción',
  view: null,
  params: [
    { k: 'h', kind: 'number', label: 'Altura del ojo sobre el mar', unit: 'm', min: 1, max: 40, step: 0.5, def: 12 },
    { k: 'ai', kind: 'angle', sym: 'ai', label: 'Altura instrumental (la del sextante)', min: 3, max: 75, def: 25 },
  ],
  opts: [
    ['sensible', 'Horizonte sensible', true],
    ['aparente', 'Altura aparente', true],
    ['refraccion', 'Refracción y posición verdadera', true],
    ['cenit', 'Vertical del lugar', true],
    ['barco', 'Barco y altura del ojo', true],
    ['formula', 'Fórmulas al pie', true],
  ],
  astro: { type: 'estrella', name: 'Estrella' },
  caption: 'Depresión del horizonte y corrección de la altura.',
  animations: [
    { label: 'Subir la altura del ojo', param: 'h', from: 2, to: 40 },
    { label: 'Cambiar la altura del astro', param: 'ai', from: 5, to: 60 },
  ],

  draw(F, p, o, ctx) {
    const N = F.N;
    const dp = dip(p.h);
    const ap = p.ai - dp / 60;
    const th = 9 + (Math.min(p.h, 40) / 40) * 9; // depresión dibujada (exagerada), en grados
    const hpx = RE * (1 / Math.cos(th * DEG) - 1);
    const Cc = [X0, Y0 + RE];
    const E = [X0, Y0 - hpx];
    const T = [X0 + RE * Math.sin(th * DEG), Cc[1] - RE * Math.cos(th * DEG)];
    const aFig = Math.max(8, Math.min(70, ap)) ;
    const starR = Math.min(430, (E[1] - 60) / Math.sin(aFig * DEG));
    const S = ray(E, starR, aFig);

    F.step(1, 'El observador y la altura del ojo');
    const sea = [];
    for (let a = -0.62; a <= 0.62001; a += 0.02) sea.push([Cc[0] + RE * Math.sin(a), Cc[1] - RE * Math.cos(a)]);
    F.poly([...sea, [W + 40, H + 40], [-40, H + 40]], F.pal.sea);
    F.path(sea, 'ref');
    F.lab('mar', 'Superficie del mar', 30, Y0 + 70, { anchor: 'start', italic: true, scale: 0.85, col: F.pal.ref });
    if (o.barco) {
      F.poly([[X0 - 46, Y0 - 3], [X0 + 46, Y0 - 3], [X0 + 32, Y0 + 14], [X0 - 36, Y0 + 14]], F.pal.ref, { layer: 'marks' });
      F.path([[X0, Y0 - 3], E], 'ink');
      F.path([[X0 - 64, Y0 - 3], [X0 - 64, E[1]]], 'ink', { arrow: true });
      F.path([[X0 - 70, Y0 - 3], [X0 - 58, Y0 - 3]], 'ink');
      F.lab('h', F.vals ? `h = ${fNum(p.h, 1).replace(',0', '')} m` : 'h', X0 - 76, (Y0 + E[1]) / 2 + 6, { anchor: 'end', scale: 0.9 });
    }
    F.dotS(E[0], E[1], F.pal.ink, 4.5);
    F.place('ojo', F.words ? 'Ojo del observador' : 'Ojo', E, 0.6, 0.8, 12, { scale: 0.85 });
    if (o.cenit) {
      F.path([E, [X0, 40]], 'ref2', { kind: 'in' });
      F.lab('cenit', F.words ? 'Cénit' : 'Cenit', X0, 32);
      F.path([[X0, Y0 + 14], [X0, H - 10]], 'grid', { kind: 'in' });
      F.lab('centro', 'Hacia el centro de la Tierra', X0 + 10, H - 22, { anchor: 'start', italic: true, scale: 0.8 });
    }

    F.step(2, 'Horizonte sensible y horizonte de la mar');
    if (o.sensible) {
      F.path([E, [W - 24, E[1]]], 'ref2');
      F.lab('hsens', 'Horizonte sensible', W - 30, E[1] - 10, { anchor: 'end', italic: true, scale: 0.9 });
    }
    const dv = [T[0] - E[0], T[1] - E[1]];
    const L = (W - 24 - E[0]) / dv[0];
    const Vend = [E[0] + dv[0] * L, E[1] + dv[1] * L];
    F.path([E, Vend], 'ref');
    F.dotS(T[0], T[1], F.pal.ref, 4);
    F.lab('hmar', 'Horizonte de la mar', W - 30, Vend[1] + 28, { anchor: 'end', italic: true, scale: 0.9 });
    F.path(arcAt(E, 340, 0, -th), 'c2', { arrow: true });
    F.place('dp', F.val(N.dip, `${fNum(dp, 1)}′`, 'Depresión'), ray(E, 340, -th / 2), 1, 0, 10, { col: F.pal.c2 });

    F.step(3, 'Altura instrumental');
    F.path([E, S], 'ref2');
    F.astroAt(S, ctx.astroType, false);
    F.place('astro', ctx.astroName || '', S, 0.8, -0.6, 22, { bold: true });
    F.path(arcAt(E, 170, -th, aFig), 'c1', { arrow: true });
    F.place('ai', F.val(N.ai, dm(p.ai), 'Altura instrumental'), ray(E, 170, aFig + 5), -1, 0, 4, { col: F.pal.c1, anchor: 'end' });

    let s = 3;
    if (o.aparente) {
      F.step(++s, 'Altura aparente');
      F.path(arcAt(E, 270, 0, aFig), 'c3', { arrow: true });
      F.place('ap', F.words ? `Altura aparente ${dmd(ap)}` : F.vals ? `${N.ap} = ${N.ai} − ${N.dip} = ${dmd(ap)}` : N.ap, ray(E, 270, aFig + 4), -1, 0, 4, { col: F.pal.c3, scale: 0.9, anchor: 'end' });
    }
    if (o.refraccion) {
      F.step(++s, 'Refracción');
      const rFig = 5;
      const St = ray(E, starR, aFig - rFig);
      F.path([E, St], 'grid', { kind: 'in' });
      F.astroAt(St, ctx.astroType, false, { hollow: true });
      F.place('verdadera', 'Posición verdadera', St, 1, 0.2, 22, { italic: true, scale: 0.85 });
      F.path(arcAt(E, starR - 40, aFig, aFig - rFig), 'ang', { arrow: true });
      F.place('ref', F.val('R', `${fNum(refraction(ap), 1)}′`, 'Refracción'), ray(E, starR - 40, aFig - rFig / 2), 1, 0, 10, { scale: 0.85 });
    }

    if (o.formula) {
      F.lab('f1', `${N.dip} = 1,76′ √h = 1,76′ × √${fNum(p.h, 1).replace(',0', '')} = ${fNum(dp, 1)}′`, W - 24, 40, { anchor: 'end', scale: 0.85 });
      F.lab('f2', `${N.av} = ${N.ap} − R = ${dmd(ap)} − ${fNum(refraction(ap), 1)}′ = ${dmd(ap - refraction(ap) / 60)}`, W - 24, 70, { anchor: 'end', scale: 0.85 });
      F.lab('nota', 'Figura no a escala', W - 24, 756, { anchor: 'end', italic: true, scale: 0.75, col: F.pal.ref });
    }
  },

  compute(p) {
    const dp = dip(p.h);
    const ap = p.ai - dp / 60;
    const R = refraction(ap);
    return [
      ['Depresión del horizonte', `${fNum(dp, 1)}′`],
      ['Altura aparente (ai − dp)', dmd(ap)],
      ['Refracción media', `${fNum(R, 1)}′`],
      ['Altura verdadera de una estrella', dmd(ap - R / 60)],
      ['Distancia al horizonte de la mar', `${fNum(horizonDistance(p.h), 1)} millas aprox.`],
    ];
  },
};
