import { DEG } from '../core/math.js';
import { CX, CY, W, H } from '../core/draw.js';
import { fixFromTwoLines } from '../core/astro.js';
import { fAz3, fNum, fMinSigned, fDist, KM_PER_MILE } from '../core/format.js';

// Plantilla de trazado: norte arriba, 1 milla = K píxeles. Situación de estima en el centro.
const K = 12;

const u = (Z) => [Math.sin(Z * DEG), -Math.cos(Z * DEG)];
const at = (e, n) => [CX + e * K, CY - n * K];
const plus = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k];

function line(F, idp, Z, da, catMain, catThin, o, N) {
  const C = [CX, CY];
  const d = u(Z);
  const pv = [Math.cos(Z * DEG), Math.sin(Z * DEG)];
  const D = at(da * Math.sin(Z * DEG), da * Math.cos(Z * DEG));
  return {
    azimut() {
      F.path([C, plus(C, d, 300)], 'ref2', { arrow: true });
      F.path([C, plus(C, d, -60)], 'ref2', { kind: 'dot' });
      const tip = plus(C, d, 300);
      F.place(idp + 'az', F.words ? `Azimut ${fAz3(Z)}` : `${N.az} = ${fAz3(Z)}`, tip, d[0], d[1], 14, { scale: 0.9 });
    },
    intercept() {
      if (Math.abs(da) > 0.2) F.path([C, D], catMain, { arrow: true });
      F.dotS(D[0], D[1], F.pal[catMain === 'c2' ? 'c2' : 'c3'], 5);
      const side = da >= 0 ? 'hacia el astro' : 'alejándose del astro';
      const txt = F.vals ? `${N.da} = ${fMinSigned(da)} (${side})` : N.da;
      const m = plus(C, d, (da * K) / 2);
      const perp = [pv[0], pv[1]];
      F.place(idp + 'da', F.words ? `Diferencia de alturas ${fMinSigned(da)}` : txt, m, perp[0], perp[1], 14, { col: F.pal[catMain], scale: 0.9 });
      F.place(idp + 'pd', F.words ? 'Punto determinante' : 'Pd', D, -perp[0], -perp[1], 14, { scale: 0.9 });
    },
    recta() {
      F.path([plus(D, pv, -270), plus(D, pv, 270)], catThin === 't1' ? 'c1' : 'c3');
      F.place(idp + 'recta', 'Recta de altura', plus(D, pv, 230), -d[0], -d[1], 16, { col: F.pal[catThin === 't1' ? 'c1' : 'c3'], italic: true, scale: 0.9 });
      if (o.arco) {
        const Rc = 1100;
        const Cc = plus(D, d, Rc);
        const a0 = Math.atan2(-d[1], -d[0]);
        const pts = [];
        for (let i = -20; i <= 20; i++) { const a = a0 + (i / 20) * 0.26; pts.push([Cc[0] + Rc * Math.cos(a), Cc[1] + Rc * Math.sin(a)]); }
        F.path(pts, catThin, { kind: 'in' });
        if (idp === 'a') {
          const end = [pts[0], pts[pts.length - 1]].find((q) => (q[0] - D[0]) * pv[0] + (q[1] - D[1]) * pv[1] < 0);
          F.place(idp + 'arco', 'Círculo de alturas iguales', end, -d[0], -d[1], 14, { italic: true, scale: 0.8, col: F.pal.ref });
        }
      }
    },
  };
}

export default {
  id: 'recta',
  group: 'plano',
  name: 'Recta de altura',
  desc: 'Método de Marcq Saint-Hilaire en la carta',
  view: null,
  params: [
    { k: 'Z1', kind: 'angle', sym: 'az', label: 'Azimut del astro', min: 0, max: 360, def: 50, suffix: 'verdadero' },
    { k: 'd1', kind: 'number', sym: 'da', label: 'Diferencia de alturas (observada − estimada)', unit: '′', min: -20, max: 20, step: 0.1, def: 6,
      help: 'Positiva: el punto determinante va hacia el astro. Negativa: se aleja del astro.' },
    { k: 'Z2', kind: 'angle', sym: 'az', label: 'Azimut del segundo astro', min: 0, max: 360, def: 160, suffix: 'verdadero',
      help: 'Solo se usa con la segunda recta.' },
    { k: 'd2', kind: 'number', sym: 'da', label: 'Diferencia de alturas del segundo astro', unit: '′', min: -20, max: 20, step: 0.1, def: -4,
      help: 'Solo se usa con la segunda recta.' },
  ],
  opts: [
    ['dos', 'Segunda recta y situación observada', false],
    ['arco', 'Arco del círculo de alturas iguales', true],
    ['cuadricula', 'Cuadrícula de 5 millas', true],
    ['norte', 'Flecha del norte y escala', true],
  ],
  caption: 'La recta de altura por el método de Marcq Saint-Hilaire.',
  animations: [
    { label: 'Cambiar el azimut', param: 'Z1', from: 0, to: 360 },
    { label: 'Cambiar la diferencia de alturas', param: 'd1', from: -15, to: 15 },
  ],

  draw(F, p, o) {
    const N = F.N;
    const C = [CX, CY];
    const L1 = line(F, 'a', p.Z1, p.d1, 'c2', 't1', o, N);
    const L2 = o.dos ? line(F, 'b', p.Z2, p.d2, 'c3', 't3', o, N) : null;

    F.step(1, 'Situación de estima');
    if (o.cuadricula) {
      for (let i = -30; i <= 30; i += 5) {
        const x = CX + i * K, y = CY - i * K;
        if (x > 10 && x < W - 10) F.path([[x, 30], [x, H - 40]], 'grid');
        if (y > 30 && y < H - 40) F.path([[10, y], [W - 10, y]], 'grid');
      }
    }
    if (o.norte) {
      F.path([[W - 60, 140], [W - 60, 70]], 'ink', { arrow: true });
      F.lab('norte', 'N', W - 60, 58, { bold: true });
      F.path([[40, H - 70], [40 + 5 * K, H - 70]], 'ink');
      F.path([[40, H - 76], [40, H - 64]], 'ink');
      F.path([[40 + 5 * K, H - 76], [40 + 5 * K, H - 64]], 'ink');
      F.lab('escala', F.dist === 'km' ? `5 millas (${fNum(5 * KM_PER_MILE, 1)} km)` : '5 millas', 40 + 5 * K + 10, H - 64, { anchor: 'start', scale: 0.8 });
    }
    F.raw(`<circle cx="${CX}" cy="${CY}" r="7" fill="${F.pal.paper}" stroke="${F.pal.ink}" stroke-width="2"/><circle cx="${CX}" cy="${CY}" r="2" fill="${F.pal.ink}"/>`);
    F.place('se', F.words ? 'Situación de estima' : 'Se', C, -0.7, 0.7, 14, { bold: true });

    F.step(2, 'Azimut del astro');
    L1.azimut();
    F.step(3, 'Diferencia de alturas');
    L1.intercept();
    F.step(4, 'Recta de altura');
    L1.recta();

    if (L2) {
      F.step(5, 'Segunda recta y situación observada');
      L2.azimut();
      L2.intercept();
      L2.recta();
      const fx = fixFromTwoLines(p.Z1, p.d1, p.Z2, p.d2);
      if (fx) {
        const S = at(fx.e, fx.n);
        F.raw(`<circle cx="${S[0].toFixed(1)}" cy="${S[1].toFixed(1)}" r="9" fill="${F.pal.paper}" stroke="${F.pal.ink}" stroke-width="2.4"/><circle cx="${S[0].toFixed(1)}" cy="${S[1].toFixed(1)}" r="2.6" fill="${F.pal.ink}"/>`);
        F.place('so', F.words ? 'Situación observada' : 'So', S, 0.7, 0.7, 16, { bold: true });
      }
    }
  },

  compute(p, o = {}, ctx = {}) {
    const D = (x) => fDist(x, ctx.dist);
    const rows = [
      ['Azimut', fAz3(p.Z1)],
      ['Diferencia de alturas', `${fMinSigned(p.d1)} = ${D(Math.abs(p.d1))} ${p.d1 >= 0 ? 'hacia el astro' : 'alejándose del astro'}`],
    ];
    if (o.dos) {
      const fx = fixFromTwoLines(p.Z1, p.d1, p.Z2, p.d2);
      if (fx) {
        const dist = Math.hypot(fx.e, fx.n);
        const rumbo = (Math.atan2(fx.e, fx.n) / DEG + 360) % 360;
        rows.push(['Situación observada', `${D(Math.abs(fx.n))} al ${fx.n >= 0 ? 'N' : 'S'} y ${D(Math.abs(fx.e))} al ${fx.e >= 0 ? 'E' : 'W'} de la estima`]);
        rows.push(['Desde la estima', `${D(dist)} al ${fAz3(rumbo)}`]);
      } else rows.push(['Situación observada', 'Las dos rectas son paralelas: no se cortan']);
    }
    return rows;
  },
};
