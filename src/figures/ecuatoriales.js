import { DEG, Y, arc, small, add, mul, mod360, rot } from '../core/math.js';
import { dm, fLat, fHours } from '../core/format.js';

export default {
  id: 'ecuatoriales',
  group: 'celeste',
  name: 'Coordenadas ecuatoriales',
  desc: 'Declinación y horario de un astro',
  view: { yaw: 30, pitch: 15 },
  params: [
    { k: 'dec', kind: 'angle', sym: 'dec', label: 'Declinación del astro', min: -90, max: 90, def: 25, hem: ['N', 'S'],
      help: 'Distancia angular del astro al ecuador celeste.' },
    { k: 't', kind: 'angle', sym: 'ha', label: 'Horario del lugar', min: 0, max: 360, def: 50, suffix: 'hacia el W',
      help: 'Arco de ecuador desde el meridiano del lugar hasta el círculo horario del astro, contado hacia el oeste.' },
    { k: 'tA', kind: 'angle', sym: 'haA', label: 'Horario de Aries', min: 0, max: 360, def: 340, suffix: 'hacia el W',
      help: 'Solo se usa si activas el punto Aries.' },
  ],
  opts: [
    ['grid', 'Red de paralelos y círculos horarios', false],
    ['aries', 'Punto Aries y ángulo sidéreo', false],
    ['paralelo', 'Paralelo de declinación', false],
    ['cardinales', 'Letras W y E sobre el ecuador', true],
    ['plano', 'Sombrear el plano del ecuador', true],
  ],
  astro: { type: 'estrella', name: 'Astro' },
  caption: 'Coordenadas ecuatoriales: declinación y horario del lugar.',
  animations: [
    { label: 'El astro recorre su paralelo', param: 't', from: 0, to: 360 },
    { label: 'Cambiar la declinación', param: 'dec', from: -60, to: 60 },
  ],

  draw(F, p, o, ctx) {
    F.sphere = true;
    const N = F.N, { dec, t, tA } = p;
    const M = [0, 0, 1], w = [-1, 0, 0];
    const eq = (th) => rot(M, w, th);
    const X = rot(eq(t), Y, dec);

    F.step(1, 'Ecuador celeste, polos y meridiano');
    if (o.plano) F.fillPlane(arc(M, w, 0, 360, 4), F.pal.plane);
    if (o.grid) {
      for (const d of [-60, -30, 30, 60]) F.curve(small(Y, 90 - d), 'grid');
      for (let h = 30; h < 360; h += 30) F.curve(arc(eq(h), Y, -90, 90), 'grid');
    }
    F.curve(arc(M, w, 0, 360), 'ref');
    F.seg([0, -1.2, 0], [0, 1.2, 0], 'ref2');
    F.curve(arc(M, Y, -90, 90), 'ref');
    F.labR('pn', 'Pn', [0, 1.2, 0], 10);
    F.labR('ps', 'Ps', [0, -1.2, 0], 10);
    const ea = F.pickAngle(eq, [0, t, ...(o.aries ? [tA] : []), ...(o.cardinales ? [90, 270] : [])], F.curved ? 0 : 0.5);
    F.labCurve('ecuador', 'Ecuador celeste', arc(M, w, ea - 40, ea + 40), 'out',
      () => F.labT('ecuador', 'Ecuador celeste', eq(ea), rot(eq(ea), Y, -10), 10, { italic: true }), { italic: true });
    F.labR('meridiano', 'Meridiano superior del lugar', rot(M, Y, 58), 10, { italic: true, scale: 0.85 });
    if (o.cardinales) { F.labR('W', 'W', eq(90), 14, { bold: true }); F.labR('E', 'E', eq(-90), 14, { bold: true }); }

    F.step(2, 'El astro y su círculo horario');
    F.curve(arc(eq(t), Y, -90, 90), 'ref2');
    if (o.paralelo && Math.abs(dec) < 89.5) F.curve(small(Y, 90 - dec), 'ref2');
    F.astro(X, ctx.astroType);
    F.labR('astro', ctx.astroName || '', X, 20, { bold: true });
    F.labR('horario', 'Círculo horario del astro', rot(eq(t), Y, dec >= 0 ? -40 : 40), 10, { italic: true, scale: 0.85 });

    F.step(3, 'Declinación');
    F.curve(arc(eq(t), Y, 0, dec), 'c1', { arrow: 'trim' });
    F.labT('dec', F.val(N.dec, fLat(dec), 'Declinación'), rot(eq(t), Y, dec / 2), rot(eq(t + 10), Y, dec / 2), 12, { col: F.pal.c1 });

    F.step(4, 'Horario del lugar');
    F.curve(arc(M, w, 0, t), 'c2', { arrow: 'end' });
    const below = (dec >= 0 ? -10 : 10) * (o.aries ? -1 : 1);
    F.labT('t', F.val(N.ha, dm(t), 'Horario'), eq(t / 2), rot(eq(t / 2), Y, below), 12, { col: F.pal.c2 });

    if (o.aries) {
      F.step(5, 'Punto Aries y ángulo sidéreo');
      const AS = mod360(t - tA);
      const offD = dec >= 0 ? -7 : 7;
      const par = (th) => add(mul(eq(th), Math.cos(offD * DEG)), mul(Y, Math.sin(offD * DEG)));
      F.curve(arc(eq(tA), Y, -90, 90), 'grid');
      const n = Math.max(2, Math.ceil(AS / 2));
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(par(tA + (AS * i) / n));
      F.curve(pts, 'c3', { arrow: 'end' });
      F.seg(eq(tA), par(tA), 't3');
      F.seg(eq(t), par(t), 't3');
      F.dot(eq(tA), F.pal.c3, 5);
      F.labR('aries', 'γ', eq(tA), 14, { bold: true, scale: 1.15, col: F.pal.c3 });
      F.labT('as', F.val(N.sha, dm(AS), 'Ángulo sidéreo'), par(tA + AS / 2), rot(eq(tA + AS / 2), Y, dec >= 0 ? -17 : 17), 12, { col: F.pal.c3 });
    }
  },

  compute(p) {
    const AS = mod360(p.t - p.tA);
    return [
      ['Declinación', fLat(p.dec)],
      ['Horario del lugar', `${dm(p.t)} (${fHours(p.t)})`],
      ['Distancia polar', dm(90 - p.dec)],
      ['Ángulo sidéreo (si se usa Aries)', dm(AS)],
      ['Ascensión recta (360° − AS)', `${dm(mod360(360 - AS))} (${fHours(360 - AS)})`],
    ];
  },
};
