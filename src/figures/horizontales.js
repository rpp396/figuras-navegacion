import { Y, arc, small, hor, vert, rot } from '../core/math.js';
import { dm, fAz3 } from '../core/format.js';

export default {
  id: 'horizontales',
  group: 'celeste',
  name: 'Coordenadas horizontales',
  desc: 'Altura y azimut sobre el horizonte',
  view: { yaw: -90, pitch: 15 },
  params: [
    { k: 'alt', kind: 'angle', sym: 'alt', label: 'Altura del astro', min: 0, max: 90, def: 40,
      help: 'Arco de vertical desde el horizonte hasta el astro.' },
    { k: 'az', kind: 'angle', sym: 'az', label: 'Azimut', min: 0, max: 360, def: 50, suffix: 'desde el N hacia el E',
      help: 'Arco de horizonte desde el norte hasta el vertical del astro.' },
  ],
  opts: [
    ['lineas', 'Líneas del observador a la estrella, a su pie y al N', true],
    ['obs', 'Observador y línea al cénit', true],
    ['cardinales', 'Los cuatro puntos cardinales (si no, solo el N)', false],
    ['zd', 'Distancia cenital', false],
    ['almic', 'Almicantarat del astro', false],
    ['primer', 'Primer vertical (E–W)', false],
    ['nadir', 'Nadir', false],
    ['grid', 'Red de almicantarats y verticales', false],
    ['plano', 'Sombrear el plano del horizonte', true],
    ['sombra', 'Sombrear la media esfera bajo el horizonte', true],
  ],
  astro: { type: 'punto', name: 'Estrella' },
  caption: 'Coordenadas horizontales: altura y azimut.',
  animations: [
    { label: 'Dar la vuelta al horizonte', param: 'az', from: 0, to: 360 },
    { label: 'Del horizonte al cénit', param: 'alt', from: 0, to: 90 },
  ],

  draw(F, p, o, ctx) {
    F.sphere = true;
    const N = F.N, { alt, az } = p;
    const H0 = hor(0), H90 = hor(90);
    const X = vert(az, alt), O = [0, 0, 0];

    F.step(1, 'El observador y el horizonte');
    if (o.sombra) F.bowl();
    if (o.plano) F.fillPlane(arc(H0, H90, 0, 360, 4), F.pal.plane);
    if (o.grid) {
      for (const a of [30, 60]) F.curve(small(Y, 90 - a), 'grid');
      for (let z = 30; z < 360; z += 30) if (z % 90) F.curve(arc(hor(z), Y, 0, 90), 'grid');
    }
    F.curve(arc(H0, H90, 0, 360), 'ref');
    if (o.obs || o.lineas) {
      const s = F.P(O);
      F.dotS(s[0], s[1], F.pal.ink, 6);
      F.lab('O', F.words ? 'Observador' : 'O', s[0] - 12, s[1] + F.fs * 0.35, { anchor: 'end' });
    }
    const ha = F.pickAngle(hor, [0, 90, 180, 270, az, az / 2]);
    F.labCurve('horizonte', 'Horizonte', arc(H0, H90, ha - 28, ha + 28), 'in',
      () => F.labT('horizonte', 'Horizonte', hor(ha), rot(hor(ha), Y, -10), 10, { italic: !F.words }), { italic: !F.words });

    F.step(2, 'Cénit, meridiano y norte');
    F.curve(arc(H0, Y, 0, 360), 'ref2');
    if (o.primer) F.curve(arc(H90, Y, 0, 360), 'grid');
    if (o.obs) F.line(O, Y, 'ref2', 'dot');
    if (o.lineas) F.line(O, H0, 'ref2', 'dot');
    F.dot(Y, F.pal.ink, 4);
    if (o.nadir) { F.dot([0, -1, 0], F.pal.ink, 4); F.labR('nadir', 'Nadir', [0, -1, 0], 12); }
    F.labR('cenit', F.words ? 'Cénit' : 'Cenit', Y, 12);
    const cards = o.cardinales ? [['N', 0], ['E', 90], ['S', 180], ['W', 270]] : [['N', 0]];
    for (const [k, a] of cards) if (F.V(hor(a))[2] > -0.35) F.labR('c' + k, k, hor(a), 12, { bold: !F.words, scale: 1.1 });
    F.labCurve('meridiano', F.words ? 'Meridiano celeste' : 'Meridiano del lugar', arc(H0, Y, 105, 165), 'out',
      () => F.labR('meridiano', 'Meridiano del lugar', vert(0, 50), 10, { italic: true, scale: 0.85 }), { italic: !F.words });

    F.step(3, 'La estrella y su vertical');
    if (o.lineas) { F.line(O, X, 'ref2'); F.line(O, hor(az), 'ref2'); }
    F.curve(arc(hor(az), Y, 0, 90), 'ref2');
    if (o.almic && alt < 89.5) {
      F.curve(small(Y, 90 - alt), 'ref2');
      if (alt < 80) F.labT('almic', 'Almicantarat', vert(az + 90, alt), vert(az + 90, alt + 10), 8, { italic: true, scale: 0.85 });
    }
    F.astro(X, ctx.astroType);
    F.labR('astro', ctx.astroName || '', X, 18, { bold: !F.words });

    const side = (a) => vert(az + 12, a);
    F.step(4, 'Azimut');
    const azP = arc(H0, H90, 0, az);
    F.curve(azP, 'c2', { arrow: 'end' });
    const azT = F.val(N.az, dm(az), 'Azimut');
    F.labCurve('az', azT, azP, 'out', () => {
      const am = hor(az / 2);
      F.labT('az', azT, am, rot(am, Y, -10), 12, { col: F.pal.c2 });
    }, { col: F.pal.c2 });

    F.step(5, 'Altura');
    const altP = arc(hor(az), Y, 0, alt);
    F.curve(altP, 'c1', { arrow: 'trim' });
    const altT = F.val(N.alt, dm(alt), 'Altura');
    F.labCurve('alt', altT, altP, 'in', () => F.labT('alt', altT, vert(az, alt / 2), side(alt / 2), 12, { col: F.pal.c1 }), { col: F.pal.c1 });

    if (o.zd) {
      F.step(6, 'Distancia cenital');
      const zdP = arc(hor(az), Y, 90, alt);
      F.curve(zdP, 'c3', { arrow: 'trim' });
      const zt = F.words ? F.val('', dm(90 - alt), 'Distancia cenital') : F.vals ? `${N.zd} = 90° − ${N.alt} = ${dm(90 - alt)}` : N.zd;
      F.labCurve('zd', zt, zdP, 'in', () => F.labT('zd', zt, vert(az, (alt + 90) / 2), side((alt + 90) / 2), 12, { col: F.pal.c3 }), { col: F.pal.c3 });
    }
  },

  compute(p) {
    return [
      ['Altura', dm(p.alt)],
      ['Azimut', `${dm(p.az)} (${fAz3(p.az)})`],
      ['Distancia cenital (90° − altura)', dm(90 - p.alt)],
    ];
  },
};
