import { Y, arc, small, mul, geo } from '../core/math.js';
import { dm, fLat, fLon, fDist } from '../core/format.js';

export default {
  id: 'terrestre',
  group: 'tierra',
  name: 'Coordenadas terrestres',
  desc: 'Latitud y longitud de un lugar en la Tierra',
  view: { yaw: 25, pitch: 18 },
  params: [
    { k: 'lat', kind: 'angle', sym: 'lat', label: 'Latitud del lugar', min: -90, max: 90, def: 40.5, hem: ['N', 'S'],
      help: 'Arco de meridiano desde el ecuador hasta el lugar.' },
    { k: 'lon', kind: 'angle', sym: 'lon', label: 'Longitud del lugar', min: -180, max: 180, def: -30, hem: ['E', 'W'],
      help: 'Arco de ecuador desde Greenwich hasta el meridiano del lugar.' },
  ],
  opts: [
    ['grid', 'Red de meridianos y paralelos', true],
    ['paralelo', 'Paralelo del lugar', true],
    ['merlugar', 'Meridiano del lugar', true],
    ['centro', 'Radios y ángulos en el centro de la Tierra', false],
    ['plano', 'Sombrear el plano del ecuador', false],
  ],
  caption: 'Coordenadas terrestres: latitud y longitud de un lugar.',
  animations: [
    { label: 'Recorrer las longitudes', param: 'lon', from: -180, to: 180 },
    { label: 'Del ecuador al polo', param: 'lat', from: 0, to: 85 },
  ],

  draw(F, p, o) {
    F.sphere = true;
    const N = F.N, { lat, lon } = p;
    const E0 = geo(0, 0), E90 = geo(0, 90), P = geo(lat, lon);

    F.step(1, 'La Tierra, el ecuador y Greenwich');
    if (o.plano) F.fillPlane(arc(E0, E90, 0, 360, 4), F.pal.plane);
    if (o.grid) {
      for (const la of [-60, -30, 30, 60]) F.curve(small(Y, 90 - la), 'grid');
      for (let lo = -150; lo <= 180; lo += 30) if (lo !== 0) F.curve(arc(geo(0, lo), Y, -90, 90), 'grid');
    }
    F.curve(arc(E0, E90, 0, 360), 'ref');
    F.seg([0, -1.2, 0], [0, 1.2, 0], 'ref2');
    F.curve(arc(E0, Y, -90, 90), 'ref');
    F.labR('pn', 'Pn', [0, 1.2, 0], 10);
    F.labR('ps', 'Ps', [0, -1.2, 0], 10);
    const ea = F.pickAngle((a) => geo(0, a), [0, lon], F.curved ? 0 : 0.5);
    F.labCurve('ecuador', 'Ecuador', arc(E0, E90, ea - 30, ea + 30), 'out',
      () => F.labT('ecuador', 'Ecuador', geo(0, ea), geo(-10, ea), 10, { italic: true }), { italic: true });
    F.labR('greenwich', 'Meridiano de Greenwich', geo(62, 0), 10, { italic: true, scale: 0.85 });

    F.step(2, 'El lugar, su meridiano y su paralelo');
    if (o.merlugar) {
      F.curve(arc(geo(0, lon), Y, -90, 90), 'ref2');
      F.labR('merlugar', 'Meridiano del lugar', geo(-48, lon), 10, { italic: true, scale: 0.85 });
    }
    if (o.paralelo && Math.abs(lat) < 89.5) {
      F.curve(small(Y, 90 - lat), 'ref2');
      if (Math.abs(lat) < 80) F.labT('paralelo', 'Paralelo del lugar', geo(lat, lon + 70), geo(lat + 10, lon + 70), 8, { italic: true, scale: 0.85 });
    }
    F.dot(P, F.pal.dot, 6);
    F.labR('P', 'P', P, 14, { bold: true, scale: 1.1 });

    F.step(3, 'Latitud');
    F.curve(arc(geo(0, lon), Y, 0, lat), 'c1', { arrow: 'trim' });
    const side = lon >= 0 ? 1 : -1;
    F.labT('lat', F.val(N.lat, fLat(lat), 'Latitud'), geo(lat / 2, lon), geo(lat / 2, lon + side * 10), 12, { col: F.pal.c1 });

    F.step(4, 'Longitud');
    F.curve(arc(E0, E90, 0, lon), 'c2', { arrow: 'end' });
    F.labT('lon', F.val(N.lon, fLon(lon), 'Longitud'), geo(0, lon / 2), geo(lat >= 0 ? -10 : 10, lon / 2), 12, { col: F.pal.c2 });

    if (o.centro) {
      F.step(5, 'Ángulos en el centro de la Tierra');
      const O = [0, 0, 0];
      F.seg(O, P, 'inner');
      F.seg(O, geo(0, lon), 'inner');
      F.seg(O, E0, 'inner');
      F.flat(arc(geo(0, lon), Y, 0, lat).map((q) => mul(q, 0.22)), 't1');
      F.flat(arc(E0, E90, 0, lon).map((q) => mul(q, 0.16)), 't2');
      const s = F.P(O);
      F.dotS(s[0], s[1], F.pal.ink, 3.5);
      F.labAt('O', F.words ? 'Centro' : 'O', [0, -0.08, 0]);
      F.labAt('phiC', N.lat, mul(geo(lat / 2, lon), 0.3), { col: F.pal.c1, scale: 0.85 });
      F.labAt('lamC', N.lon, mul(geo(-4, lon / 2), 0.27), { col: F.pal.c2, scale: 0.85 });
    }
  },

  compute(p, o, ctx = {}) {
    return [
      ['Latitud', fLat(p.lat)],
      ['Longitud', fLon(p.lon)],
      ['Colatitud (90° − latitud)', dm(90 - Math.abs(p.lat))],
      ['Distancia al ecuador', fDist(Math.abs(p.lat) * 60, ctx.dist, 0)],
    ];
  },
};
