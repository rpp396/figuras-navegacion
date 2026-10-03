import { Y, arc, small, gc, geo, offsetOnSphere, clamp } from '../core/math.js';
import { CX, CY, R, W, H } from '../core/draw.js';
import { subastral } from '../core/astro.js';
import { dm, fLat, fLon, fDist } from '../core/format.js';

export default {
  id: 'subastral',
  group: 'tierra',
  name: 'Punto subastral y círculo de altura',
  desc: 'Todos los que miden la misma altura están en un círculo',
  view: { yaw: 55, pitch: 20 },
  params: [
    { k: 'dec', kind: 'angle', sym: 'dec', label: 'Declinación del astro', min: -89, max: 89, def: 20, hem: ['N', 'S'],
      help: 'Es la latitud del punto subastral.' },
    { k: 'gha', kind: 'angle', sym: 'haG', label: 'Horario en Greenwich del astro', min: 0, max: 360, def: 60, suffix: 'hacia el W',
      help: 'Da la longitud del punto subastral: hasta 180° es longitud W; de 180° a 360°, longitud E.' },
    { k: 'alt', kind: 'angle', sym: 'alt', label: 'Altura observada', min: 1, max: 89, def: 50,
      help: 'El radio del círculo es la distancia cenital, 90° menos la altura.' },
    { k: 'bear', kind: 'angle', label: 'Posición del observador en el círculo', min: 0, max: 360, def: 200, suffix: 'desde el N',
      help: 'Solo mueve el observador de ejemplo: cualquier punto del círculo mide la misma altura.' },
  ],
  opts: [
    ['rayo', 'El astro en la vertical del punto subastral', true],
    ['coords', 'Coordenadas del punto subastral', true],
    ['observador', 'Un observador sobre el círculo', true],
    ['radio', 'Radio del círculo (distancia cenital)', true],
    ['grid', 'Red de meridianos y paralelos', true],
    ['plano', 'Sombrear el plano del ecuador', false],
  ],
  astro: { type: 'sol', name: 'Sol' },
  caption: 'Punto subastral y círculo de alturas iguales.',
  animations: [
    { label: 'El observador recorre el círculo', param: 'bear', from: 0, to: 360 },
    { label: 'El astro avanza hacia el oeste', param: 'gha', from: 0, to: 120 },
    { label: 'Cambiar la altura observada', param: 'alt', from: 15, to: 80 },
  ],

  draw(F, p, o, ctx) {
    F.sphere = true;
    const N = F.N, { dec, gha, alt, bear } = p;
    const g = subastral(dec, gha);
    const G = geo(g.lat, g.lon);
    const E0 = geo(0, 0), E90 = geo(0, 90);
    const z = 90 - alt;
    const O = offsetOnSphere(G, z, bear);
    const oLon = Math.atan2(O[0], O[2]) * 57.29577951308232;

    F.step(1, 'La Tierra');
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
    F.labR('greenwich', 'Greenwich', geo(55, 0), 10, { italic: true, scale: 0.85 });
    const ea = F.pickAngle((a) => geo(0, a), [0, g.lon, oLon]);
    F.labT('ecuador', 'Ecuador', geo(0, ea), geo(-10, ea), 10, { italic: true, scale: 0.9 });

    F.step(2, 'El astro y su punto subastral');
    const s = F.P(G);
    if (o.rayo) {
      // El astro se dibuja fuera del globo, en la dirección del punto subastral
      // (o arriba a la derecha si el punto queda en el centro del disco).
      const l = Math.hypot(s[0] - CX, s[1] - CY);
      const k = clamp(l / (0.45 * R), 0, 1);
      let dx = 0.45 * (1 - k) + (l > 0 ? ((s[0] - CX) / l) * k : 0);
      let dy = -1 * (1 - k) + (l > 0 ? ((s[1] - CY) / l) * k : 0);
      const m = Math.hypot(dx, dy) || 1;
      dx /= m; dy /= m;
      const st = [clamp(CX + dx * R * 1.28, 70, W - 70), clamp(CY + dy * R * 1.28, 60, H - 70)];
      F.path([st, [s[0], s[1]]], 'ref2', { kind: s[2] < 0 ? 'back' : 'dash', arrow: s[2] >= 0 });
      F.astroAt(st, ctx.astroType, false);
      F.place('astro', ctx.astroName || '', st, dx, dy, 24, { bold: true });
    }
    F.dot(G, F.pal.dot, 6);
    F.place('gp', 'Punto subastral', [s[0], s[1]], 0.75, 0.66, 12, { bold: true, scale: 0.9 });
    if (o.coords) {
      F.curve(arc(geo(0, g.lon), Y, -90, 90), 'ref2');
      F.curve(arc(geo(0, g.lon), Y, 0, g.lat), 'c2', { arrow: 'trim' });
      F.labT('gplat', F.val(N.dec, fLat(dec), 'Declinación'), geo(g.lat / 2, g.lon), geo(g.lat / 2, g.lon - 10), 12, { col: F.pal.c2 });
      F.curve(arc(E0, E90, 0, g.lon), 'c3', { arrow: 'end' });
      F.labT('gplon', F.val(N.haG, dm(gha), 'Horario en Greenwich'), geo(0, g.lon / 2), geo(g.lat >= 0 ? -10 : 10, g.lon / 2), 12, { col: F.pal.c3 });
    }

    F.step(3, 'Círculo de alturas iguales');
    F.curve(small(G, z), 'c1');
    const lp = offsetOnSphere(G, z, bear + 110);
    F.labR('circulo', 'Círculo de alturas iguales', lp, 14, { col: F.pal.c1, scale: 0.9, italic: true });

    if (o.observador) {
      F.step(4, 'Un observador sobre el círculo');
      if (o.radio) {
        F.curve(gc(G, O), 't1', { dash: true });
        const txt = F.vals ? `${N.zd} = ${dm(z)} = ${fDist(z * 60, F.dist, 0)}` : `${N.zd} = 90° − ${N.alt}`;
        // Rótulo a un lado del radio, por la parte de fuera de las coordenadas.
        const a = F.P(G), b = F.P(O), mid = F.P(offsetOnSphere(G, z / 2, bear));
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (nx < 0) { nx = -nx; ny = -ny; }
        F.place('radio', F.words ? `Distancia cenital ${dm(z)} (${fDist(z * 60, F.dist, 0)})` : txt, mid, nx, ny, 10, { col: F.pal.c1, scale: 0.85 });
      }
      F.dot(O, F.pal.ink, 5.5);
      F.labR('obs', F.vals ? `Observador: ${N.alt} = ${dm(alt)}` : 'Observador', O, 14, { scale: 0.9 });
    }
  },

  compute(p, o, ctx = {}) {
    const g = subastral(p.dec, p.gha);
    const z = 90 - p.alt;
    return [
      ['Latitud del punto subastral', fLat(g.lat)],
      ['Longitud del punto subastral', fLon(g.lon)],
      ['Distancia cenital (radio)', dm(z)],
      ctx.dist === 'km'
        ? ['Radio en kilómetros (1′ = 1 milla = 1,852 km)', fDist(z * 60, 'km', 0)]
        : ['Radio en millas (1′ = 1 milla)', fDist(z * 60, 'mi', 0)],
      ['Altura medida en todo el círculo', dm(p.alt)],
    ];
  },
};
