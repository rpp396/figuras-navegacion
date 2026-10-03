import { DEG, polar2 } from '../core/math.js';
import { CX, CY, R, W } from '../core/draw.js';
import { dm, fLat } from '../core/format.js';

// Vista lateral del plano del meridiano: N a la izquierda, S a la derecha, cénit arriba.
// Los ángulos de pantalla se miden desde el S (derecha) en sentido antihorario.

export default {
  id: 'meridiana',
  group: 'plano',
  name: 'Altura meridiana del Sol',
  desc: 'Latitud por la meridiana, en el plano del meridiano',
  view: null,
  params: [
    { k: 'lat', kind: 'angle', sym: 'lat', label: 'Latitud del observador', min: -89, max: 89, def: 40, hem: ['N', 'S'] },
    { k: 'dec', kind: 'angle', sym: 'dec', label: 'Declinación del Sol', min: -89, max: 89, def: 15, hem: ['N', 'S'],
      help: 'Entre 23° 26′ N y 23° 26′ S a lo largo del año.' },
  ],
  opts: [
    ['altura', 'Altura meridiana', true],
    ['zd', 'Distancia cenital', true],
    ['decl', 'Declinación', true],
    ['latz', 'Latitud (del ecuador al cénit)', true],
    ['polo', 'Altura del polo', false],
    ['formula', 'Fórmula al pie', true],
  ],
  astro: { type: 'sol', name: 'Sol' },
  caption: 'Latitud por la altura meridiana del Sol.',
  animations: [
    { label: 'El Sol a lo largo del año', param: 'dec', from: -23.44, to: 23.44 },
    { label: 'Navegar hacia el sur', param: 'lat', from: 50, to: -20 },
  ],

  draw(F, p, o, ctx) {
    const N = F.N, { lat, dec } = p;
    const C = [CX, CY];
    const pt = (th, r = 1) => polar2(C, R * r, th);
    const arcP = (t0, t1, r) => {
      const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / 2));
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(pt(t0 + ((t1 - t0) * i) / n, r));
      return pts;
    };
    const measure = (t0, t1, r, cat) => {
      F.path(arcP(t0, t1, r), cat, { arrow: true });
      F.path([pt(t0, r - 0.025), pt(t0, r + 0.025)], cat);
    };
    const L = (id, text, th, r, o2 = {}) => F.place(id, text, pt(th, 1), Math.cos(th * DEG), -Math.sin(th * DEG), (r - 1) * R, o2);
    const ts = 90 - lat + dec;
    const Q = 90 - lat;
    const tsn = (((ts + 90) % 360) + 360) % 360 - 90;
    const h0 = tsn > 90 && tsn < 270 ? 180 : 0;
    const aval = h0 === 0 ? tsn : 180 - tsn;
    const zv = 90 - tsn;

    F.sphere = true;
    F.step(1, 'Horizonte, cénit y meridiano');
    F.poly(arcP(180, 360, 1), F.pal.plane);
    F.path([pt(180), pt(0)], 'ref');
    F.path([pt(90), pt(270)], 'inner', { kind: 'in' });
    L('N', 'N', 180, 1.05, { bold: true, scale: 1.1 });
    L('S', 'S', 0, 1.05, { bold: true, scale: 1.1 });
    L('cenit', F.words ? 'Cénit' : 'Cenit', 90, 1.04, { bold: true });
    L('nadir', 'Nadir', 270, 1.04);
    F.lab('horizonte', 'Horizonte', CX - R * 0.5, CY + F.fs * 1.3, { italic: true });
    F.dotS(CX, CY, F.pal.ink, 3.5);
    F.lab('O', F.words ? 'Observador' : 'O', CX + 10, CY + F.fs * 1.25, { anchor: 'start' });

    F.step(2, 'Eje del mundo y ecuador');
    F.path([pt(180 - lat, 1.2), pt(-lat, 1.2)], 'ref2');
    F.path([pt(Q), pt(Q + 180)], 'eq');
    L('pn', 'Pn', 180 - lat, 1.24, { bold: true });
    L('ps', 'Ps', -lat, 1.24);
    L('ecuador', 'Ecuador', Q + 180, 1.05, { italic: true, col: F.pal.eqc });
    if (o.polo) {
      measure(lat >= 0 ? 180 : 0, lat >= 0 ? 180 - lat : -lat, 1.07, 't2');
      const th = lat >= 0 ? 180 - lat / 2 : -lat / 2;
      F.place('polo', F.vals ? `altura del polo = ${dm(Math.abs(lat))}` : 'altura del polo', pt(th, 1), -Math.cos(th * DEG), Math.sin(th * DEG), 26, { col: F.pal.c2, scale: 0.85 });
    }

    F.step(3, 'El Sol al pasar por el meridiano');
    F.path([C, pt(ts)], 'inner', { kind: 'in' });
    F.astroAt(pt(ts), ctx.astroType, false);
    L('astro', ctx.astroName || '', ts, 1.11, { bold: true });

    F.step(4, 'Altura meridiana y distancia cenital');
    if (o.altura) {
      measure(h0, tsn, 1.07, 'c1');
      L('alt', F.val(N.alt, (aval < 0 ? '−' : '') + dm(aval), 'Altura'), (h0 + tsn) / 2, 1.13, { col: F.pal.c1 });
    }
    if (o.zd) {
      measure(90, tsn, h0 === 0 ? 1.07 : 1.14, 'c3');
      L('zd', F.val(N.zd, dm(Math.abs(zv)) + (zv > 0 ? ' N' : zv < 0 ? ' S' : ''), 'Distancia cenital'), (90 + tsn) / 2, h0 === 0 ? 1.13 : 1.2, { col: F.pal.c3 });
    }

    F.step(5, 'Declinación y latitud');
    if (o.decl) {
      measure(Q, tsn, 0.86, 'c2');
      const th = (Q + tsn) / 2;
      F.place('dec', F.val(N.dec, fLat(dec), 'Declinación'), pt(th, 0.86), -Math.cos(th * DEG), Math.sin(th * DEG), 16, { col: F.pal.c2 });
    }
    if (o.latz) {
      measure(Q, 90, 0.58, 'ang');
      const th = (Q + 90) / 2;
      F.place('latz', F.val(N.lat, fLat(lat), 'Latitud'), pt(th, 0.58), -Math.cos(th * DEG), Math.sin(th * DEG), 16);
    }
    if (o.formula) {
      const zs = Math.abs(zv) < 1 / 120 ? '0° 00′' : dm(Math.abs(zv)) + (zv > 0 ? ' N' : ' S');
      F.lab('formula', `${N.lat} = ${N.zd} + ${N.dec} = ${zs} + ${fLat(dec)} = ${fLat(zv + dec)}`, W / 2, 756, { scale: 0.9 });
    }
  },

  compute(p) {
    const ts = 90 - p.lat + p.dec;
    const tsn = (((ts + 90) % 360) + 360) % 360 - 90;
    const h0 = tsn > 90 && tsn < 270 ? 180 : 0;
    const a = h0 === 0 ? tsn : 180 - tsn;
    const z = 90 - Math.abs(a);
    return [
      ['Altura meridiana', `${a < 0 ? '−' : ''}${dm(a)} sobre el horizonte ${h0 === 0 ? 'S' : 'N'}`],
      ['Distancia cenital', dm(z)],
      ['Declinación', fLat(p.dec)],
      ['Latitud = z + d', fLat(p.lat)],
    ];
  },
};
