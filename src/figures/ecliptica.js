import { Y, arc, small, rot, angArc } from '../core/math.js';
import { sunForDay } from '../core/astro.js';
import { dm, fLat, fHours, fDate } from '../core/format.js';

// Esfera celeste con el polo norte arriba (Y). Aries en +z; la ascensión recta crece hacia +x (hacia el E).

const POINTS = [
  { l: 0, id: 'eqMar', text: 'Equinoccio de marzo' },
  { l: 90, id: 'solJun', text: 'Solsticio de junio' },
  { l: 180, id: 'eqSep', text: 'Equinoccio de septiembre' },
  { l: 270, id: 'solDic', text: 'Solsticio de diciembre' },
];

export default {
  id: 'ecliptica',
  group: 'celeste',
  name: 'La eclíptica y el Sol',
  desc: 'Declinación del Sol a lo largo del año',
  view: { yaw: 15, pitch: 28 },
  params: [
    { k: 'day', kind: 'day', label: 'Fecha', min: 0, max: 364, def: 140,
      help: 'El Sol recorre la eclíptica una vez al año. Su declinación varía entre 23° 26′ N y 23° 26′ S.' },
  ],
  opts: [
    ['estaciones', 'Equinoccios y solsticios', true],
    ['tropicos', 'Trópicos (paralelos de ±23° 26′)', true],
    ['eps', 'Oblicuidad de la eclíptica (ε)', true],
    ['decl', 'Declinación del Sol', true],
    ['ar', 'Ascensión recta del Sol', false],
    ['grid', 'Red de paralelos y círculos horarios', false],
    ['plano', 'Sombrear el plano del ecuador', true],
  ],
  astro: { type: 'sol', name: 'Sol' },
  caption: 'El Sol sobre la eclíptica.',
  animations: [{ label: 'Un año completo', param: 'day', from: 0, to: 364 }],

  draw(F, p, o, ctx) {
    F.sphere = true;
    const N = F.N;
    const s = sunForDay(Math.round(p.day));
    const A = [0, 0, 1], B = [1, 0, 0];
    const eqp = (a) => rot(A, B, a);
    const Bk = rot(B, Y, s.eps);
    const ecl = (l) => rot(A, Bk, l);
    const S = ecl(s.lambda);

    F.step(1, 'Esfera celeste y ecuador');
    if (o.plano) F.fillPlane(arc(A, B, 0, 360, 4), F.pal.plane);
    if (o.grid) {
      for (const d of [-60, -30, 30, 60]) F.curve(small(Y, 90 - d), 'grid');
      for (let h = 30; h < 360; h += 30) F.curve(arc(eqp(h), Y, -90, 90), 'grid');
    }
    F.curve(arc(A, B, 0, 360), 'ref');
    F.seg([0, -1.2, 0], [0, 1.2, 0], 'ref2');
    F.labR('pn', 'Pn', [0, 1.2, 0], 10);
    F.labR('ps', 'Ps', [0, -1.2, 0], 10);
    const ea = F.pickAngle(eqp, [0, 90, 180, 270, s.ra]);
    F.labT('ecuador', 'Ecuador celeste', eqp(ea), rot(eqp(ea), Y, -12), 10, { italic: true, scale: 0.9 });

    F.step(2, 'La eclíptica');
    F.curve(arc(A, Bk, 0, 360), 'c3');
    F.curve(arc(A, Bk, s.lambda + 12, s.lambda + 40), 'c3', { arrow: 'end' });
    const la = F.pickAngle(ecl, [0, 90, 180, 270, s.lambda], 0.2);
    F.labT('ecliptica', 'Eclíptica', ecl(la), rot(ecl(la), rot(Y, B, -s.eps), 12), 10, { italic: true, col: F.pal.c3 });
    if (o.eps) {
      const aa = angArc(A, B, ecl(40), 14);
      if (aa) {
        F.curve(aa.pts, 'ang');
        F.labAt('eps', F.vals ? `${N.eps} = ${dm(s.eps)}` : N.eps, aa.mid, { scale: 0.9 });
      }
    }

    F.step(3, 'Equinoccios y solsticios');
    if (o.tropicos) {
      F.curve(small(Y, 90 - s.eps), 'grid');
      F.curve(small(Y, 90 + s.eps), 'grid');
      F.labR('cancer', 'Trópico de Cáncer', rot(eqp(200), Y, s.eps), 8, { italic: true, scale: 0.8 });
      F.labR('capri', 'Trópico de Capricornio', rot(eqp(200), Y, -s.eps), 8, { italic: true, scale: 0.8 });
    }
    if (o.estaciones) {
      for (const q of POINTS) {
        F.dot(ecl(q.l), F.pal.c3, 4.5);
        F.labR(q.id, q.l === 0 ? `γ  ${q.text}` : q.text, ecl(q.l), 12, { scale: 0.85 });
      }
    }

    F.step(4, 'El Sol en la fecha elegida');
    F.astro(S, ctx.astroType);
    F.labR('astro', `${ctx.astroName || 'Sol'} (${fDate(s.date)})`, S, 24, { bold: true });

    if (o.decl || o.ar) {
      F.step(5, 'Declinación y ascensión recta del Sol');
      F.curve(arc(eqp(s.ra), Y, -90, 90), 'ref2');
      if (o.decl) {
        F.curve(arc(eqp(s.ra), Y, 0, s.dec), 'c1', { arrow: 'trim' });
        F.labT('dec', F.val(N.dec, fLat(s.dec), 'Declinación'), rot(eqp(s.ra), Y, s.dec / 2), rot(eqp(s.ra + 12), Y, s.dec / 2), 12, { col: F.pal.c1 });
      }
      if (o.ar) {
        F.curve(arc(A, B, 0, s.ra), 'c2', { arrow: 'end' });
        F.labT('ar', F.val(N.ra, fHours(s.ra), 'Ascensión recta'), eqp(s.ra / 2), rot(eqp(s.ra / 2), Y, s.dec >= 0 ? -12 : 12), 12, { col: F.pal.c2 });
      }
    }
  },

  compute(p) {
    const s = sunForDay(Math.round(p.day));
    return [
      ['Fecha', fDate(s.date)],
      ['Declinación del Sol', fLat(s.dec)],
      ['Ascensión recta', `${fHours(s.ra)} (${dm(s.ra)})`],
      ['Longitud eclíptica', dm(s.lambda)],
      ['Oblicuidad de la eclíptica', dm(s.eps)],
    ];
  },
};

