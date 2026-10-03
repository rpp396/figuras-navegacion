import { Y, arc, add, sub, mul, rot, hor, vert } from '../core/math.js';
import { altAz, diurnal, upperCulmination, lowerCulmination } from '../core/astro.js';
import { dm, fLat, fAz3, fNum } from '../core/format.js';

/** Dibuja una curva separando lo que queda sobre el horizonte (y ≥ 0) de lo que queda bajo él. */
function splitHorizon(F, pts, catUp, catDown) {
  const runs = [];
  let up = pts[0][1] >= 0, run = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], ub = b[1] >= 0;
    if (ub === up) run.push(b);
    else {
      const t = a[1] / (a[1] - b[1]);
      const m = add(a, mul(sub(b, a), t));
      run.push(m); runs.push({ up, run }); run = [m, b]; up = ub;
    }
  }
  runs.push({ up, run });
  for (const r of runs) {
    if (r.run.length < 2) continue;
    if (r.up) F.curve(r.run, catUp); else F.curve(r.run, catDown, { dash: true });
  }
}

const KIND = { circumpolar: 'Circumpolar: nunca se pone', nunca: 'Nunca sale sobre el horizonte', orto: 'Sale y se pone' };

export default {
  id: 'diurno',
  group: 'celeste',
  name: 'Movimiento diurno',
  desc: 'Orto, ocaso y astros circumpolares',
  view: { yaw: -110, pitch: 16 },
  params: [
    { k: 'lat', kind: 'angle', sym: 'lat', label: 'Latitud del observador', min: -89, max: 89, def: 40, hem: ['N', 'S'] },
    { k: 'dec', kind: 'angle', sym: 'dec', label: 'Declinación del astro', min: -89, max: 89, def: 20, hem: ['N', 'S'] },
    { k: 't', kind: 'angle', sym: 'ha', label: 'Horario del lugar del astro', min: 0, max: 360, def: 290, suffix: 'hacia el W',
      help: 'Mueve el astro sobre su paralelo. Anímalo para ver un día entero.' },
  ],
  opts: [
    ['orto', 'Orto, ocaso y pasos por el meridiano', true],
    ['tipos', 'Ejemplos de astro circumpolar y nunca visible', true],
    ['polo', 'Altura del polo igual a la latitud', true],
    ['ecuador', 'Ecuador celeste', true],
    ['cardinales', 'Los cuatro puntos cardinales', true],
    ['plano', 'Sombrear el plano del horizonte', true],
    ['sombra', 'Sombrear la media esfera bajo el horizonte', false],
  ],
  astro: { type: 'estrella', name: 'Astro' },
  caption: 'Movimiento diurno de los astros.',
  animations: [
    { label: 'Un día completo', param: 't', from: 0, to: 360 },
    { label: 'Viajar hacia el norte', param: 'lat', from: 0, to: 80 },
  ],

  draw(F, p, o, ctx) {
    F.sphere = true;
    const N = F.N, { lat, dec, t } = p;
    const sg = lat >= 0 ? 1 : -1;
    const H0 = hor(0), H90 = hor(90);
    const PN = vert(0, lat), PS = mul(PN, -1), Pe = sg > 0 ? PN : PS;
    const M = vert(180, 90 - lat), w = [-1, 0, 0];
    const eq = (th) => rot(M, w, th);
    const onPar = (d) => (th) => rot(eq(th), PN, d);
    const circle = (d) => { const f = onPar(d), pts = []; for (let th = 180; th <= 540; th += 2) pts.push(f(th)); return pts; };

    F.step(1, 'Horizonte, cénit y polo elevado');
    if (o.sombra) F.bowl();
    if (o.plano) F.fillPlane(arc(H0, H90, 0, 360, 4), F.pal.plane);
    F.curve(arc(H0, H90, 0, 360), 'ref');
    F.curve(arc(H0, Y, 0, 360), 'ref2');
    F.seg(mul(PS, 1.2), mul(PN, 1.2), 'ref2');
    F.dot(Y, F.pal.ink, 4);
    F.dot(Pe, F.pal.ink, 4);
    F.labR('cenit', F.words ? 'Cénit' : 'Cenit', Y, 12, { bold: true });
    F.labR('pe', sg > 0 ? 'Pn' : 'Ps', mul(Pe, 1.2), 10, { bold: true });
    F.labR('pd', sg > 0 ? 'Ps' : 'Pn', mul(Pe, -1.2), 10);
    const cards = o.cardinales ? [['N', 0], ['E', 90], ['S', 180], ['W', 270]] : [[sg > 0 ? 'N' : 'S', sg > 0 ? 0 : 180]];
    for (const [k, a] of cards) if (F.V(hor(a))[2] > -0.35) F.labR('c' + k, k, hor(a), 12, { bold: true });
    const ha = F.pickAngle(hor, [0, 90, 180, 270]);
    F.labT('horizonte', 'Horizonte', hor(ha), rot(hor(ha), Y, -10), 10, { italic: true, scale: 0.9 });
    if (o.polo) {
      const base = sg > 0 ? 0 : 180;
      const pts = arc(hor(base), Y, 0, Math.abs(lat));
      F.curve(pts, 'c2', { arrow: 'trim' });
      const txt = F.words ? `Altura del polo = ${dm(Math.abs(lat))}` : F.vals ? `${N.lat} = ${fLat(lat)}` : N.lat;
      F.labR('polo', txt, vert(base, Math.abs(lat) / 2), 12, { col: F.pal.c2, scale: 0.9 });
    }

    if (o.ecuador) {
      F.step(2, 'Ecuador celeste');
      F.curve(arc(M, w, 0, 360), 'eq');
      const ea = F.pickAngle(eq, [0, 90, 180, 270, t]);
      F.labT('ecuador', 'Ecuador celeste', eq(ea), rot(eq(ea), PN, -10), 10, { italic: true, scale: 0.85, col: F.pal.eqc });
    }

    const s3 = o.ecuador ? 3 : 2;
    F.step(s3, 'El astro describe su paralelo');
    const f = onPar(dec);
    splitHorizon(F, circle(dec), 'c1', 't1');
    for (const th0 of [30, 210]) {
      if (f(th0)[1] >= 0) { F.arrowHead([f(th0 - 14), f(th0 - 7), f(th0)], 'c1'); break; }
    }
    const X = f(t);
    F.astro(X, ctx.astroType);
    F.labR('astro', ctx.astroName || '', X, 20, { bold: true });

    let s = s3;
    if (o.orto) {
      F.step(++s, 'Orto, ocaso y pasos por el meridiano');
      const di = diurnal(lat, dec);
      F.dot(f(0), F.pal.c1, 4.5);
      F.labR('culsup', 'Culminación superior', f(0), 12, { scale: 0.8, italic: true });
      F.dot(f(180), F.pal.c1, 4.5);
      F.labR('culinf', 'Culminación inferior', f(180), 12, { scale: 0.8, italic: true });
      if (di.kind === 'orto') {
        F.dot(f(360 - di.t0), F.pal.c3, 5.5);
        F.labR('orto', 'Orto', f(360 - di.t0), 14, { bold: true, col: F.pal.c3 });
        F.dot(f(di.t0), F.pal.c3, 5.5);
        F.labR('ocaso', 'Ocaso', f(di.t0), 14, { bold: true, col: F.pal.c3 });
      }
    }

    if (o.tipos) {
      const dc = 90 - Math.abs(lat) + 12;
      if (dc < 87) {
        F.step(++s, 'Astros circumpolares y nunca visibles');
        const dUp = sg * dc, dDown = -sg * dc;
        splitHorizon(F, circle(dUp), 't2', 't2');
        splitHorizon(F, circle(dDown), 't3', 't3');
        // Cada rótulo va en el punto más cercano al lector de su círculo.
        const front = (d) => [0, 60, 120, 180, 240, 300].map((th) => onPar(d)(th)).sort((a, b) => F.V(b)[2] - F.V(a)[2])[0];
        F.labR('circ', 'Circumpolar', front(dUp), 10, { italic: true, scale: 0.85, col: F.pal.c2 });
        F.labR('nunca', 'Nunca visible', front(dDown), 10, { italic: true, scale: 0.85, col: F.pal.c3 });
      }
    }
  },

  compute(p) {
    const di = diurnal(p.lat, p.dec);
    const { alt, az } = altAz(p.lat, p.dec, p.t);
    const up = upperCulmination(p.lat, p.dec);
    const low = lowerCulmination(p.lat, p.dec);
    const rows = [['Tipo de astro', KIND[di.kind]]];
    rows.push(['Altura en la culminación superior', `${up < 0 ? '−' : ''}${dm(up)}`]);
    rows.push(['Altura en la culminación inferior', `${low < 0 ? '−' : ''}${dm(low)}`]);
    if (di.kind === 'orto') {
      rows.push(['Arco semidiurno', dm(di.t0)]);
      rows.push(['Horas sobre el horizonte', `${fNum((2 * di.t0) / 15, 1)} h aprox.`]);
      rows.push(['Azimut del orto', fAz3(di.zOrto)]);
      rows.push(['Azimut del ocaso', fAz3(di.zOcaso)]);
    }
    rows.push(['Altura ahora', `${alt < 0 ? '−' : ''}${dm(alt)}${alt < 0 ? ' (bajo el horizonte)' : ''}`]);
    rows.push(['Azimut ahora', fAz3(az)]);
    return rows;
  },
};
