import { DEG, mod360, wrap180 } from '../core/math.js';
import { CX, CY, W } from '../core/draw.js';
import { lhaFrom } from '../core/astro.js';
import { dm, fLon, fHours } from '../core/format.js';

// Diagrama de horarios en el plano del ecuador, visto desde el polo.
// Greenwich arriba. Visto desde el polo norte, el oeste va en el sentido de las agujas del reloj.

const RR = 250;

export default {
  id: 'horarios',
  group: 'plano',
  name: 'Horarios vistos desde el polo',
  desc: 'Horario en Greenwich, longitud, horario del lugar y Aries',
  view: null,
  params: [
    { k: 'lon', kind: 'angle', sym: 'lon', label: 'Longitud del observador', min: -180, max: 180, def: -30, hem: ['E', 'W'] },
    { k: 'gha', kind: 'angle', sym: 'haG', label: 'Horario en Greenwich del astro', min: 0, max: 360, def: 85, suffix: 'hacia el W' },
    { k: 'ghaA', kind: 'angle', sym: 'haGA', label: 'Horario en Greenwich de Aries', min: 0, max: 360, def: 25, suffix: 'hacia el W',
      help: 'Solo se usa si activas Aries.' },
  ],
  opts: [
    ['lugar', 'Meridiano del lugar, longitud y horario del lugar', true],
    ['aries', 'Aries y ángulo sidéreo', false],
    ['inferior', 'Meridianos inferiores (g y m)', true],
    ['sentido', 'Flecha del sentido W', true],
    ['formula', 'Fórmulas al pie', true],
    ['sur', 'Ver desde el polo sur', false],
  ],
  astro: { type: 'sol', name: 'Sol' },
  caption: 'Relación entre horarios y longitud, en el plano del ecuador.',
  animations: [
    { label: 'Pasa una hora tras otra', param: 'gha', from: 0, to: 360 },
    { label: 'Navegar hacia el oeste', param: 'lon', from: 30, to: -90 },
  ],

  draw(F, p, o, ctx) {
    const N = F.N, { lon, gha, ghaA } = p;
    const sgn = o.sur ? -1 : 1;
    const C = [CX, CY];
    // h: ángulo hacia el W desde Greenwich, en grados.
    const pt = (h, r) => { const th = sgn * h * DEG; return [CX + r * Math.sin(th), CY - r * Math.cos(th)]; };
    const arcP = (h0, h1, r) => {
      const n = Math.max(2, Math.ceil(Math.abs(h1 - h0) / 2));
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(pt(h0 + ((h1 - h0) * i) / n, r));
      return pts;
    };
    const arcLabel = (id, text, h0, h1, r, col) => {
      const hm = (h0 + h1) / 2;
      const s = pt(hm, r);
      // Rótulo hacia dentro del arco (hacia el polo).
      F.labAway2(id, text, s, [2 * s[0] - CX, 2 * s[1] - CY], 14, { col, scale: 0.9 });
    };
    const hM = -lon; // el meridiano del lugar está λW hacia el oeste de Greenwich
    const hL = lhaFrom(gha, lon);

    F.step(1, o.sur ? 'El ecuador visto desde el polo sur' : 'El ecuador visto desde el polo norte');
    F.poly(arcP(0, 360, RR), F.pal.sphere);
    F.path(arcP(0, 360, RR), 'sphere');
    F.dotS(CX, CY, F.pal.ink, 4);
    F.lab('polo', o.sur ? 'Ps' : 'Pn', CX - 12, CY + 26, { anchor: 'end', bold: true });
    F.path([C, pt(0, RR + 18)], 'ref');
    if (o.inferior) F.path([C, pt(180, RR)], 'ref', { kind: 'in' });
    F.place('G', 'G', pt(0, RR + 18), 0, -1, 12, { bold: true, scale: 1.1 });
    if (o.inferior) F.place('g', 'g', pt(180, RR), 0, 1, 14, { bold: true, scale: 1.05 });
    if (o.sentido) {
      F.path(arcP(214, 250, RR + 30), 'ink', { arrow: true });
      F.labAway2('sentido', 'Hacia el W', pt(232, RR + 30), C, 16, { italic: true, scale: 0.85 });
    }

    let s = 1;
    if (o.lugar) {
      F.step(++s, 'Meridiano del lugar y longitud');
      F.path([C, pt(hM, RR + 18)], 'ref');
      if (o.inferior) F.path([C, pt(hM + 180, RR)], 'ref', { kind: 'in' });
      F.labAway2('M', 'M', pt(hM, RR + 18), C, 14, { bold: true, scale: 1.1 });
      if (o.inferior) F.labAway2('m', 'm', pt(hM + 180, RR), C, 14, { bold: true, scale: 1.05 });
      F.path(arcP(0, hM, RR + 50), 'ang', { arrow: true });
      F.labAway2('lon', F.val(N.lon, fLon(lon), 'Longitud'), pt(hM / 2, RR + 50), C, 12, { scale: 0.9 });
    }

    F.step(++s, 'El astro y su horario en Greenwich');
    F.path([C, pt(gha, RR)], 'ref2');
    F.astroAt(pt(gha, RR), ctx.astroType, false);
    F.labAway2('astro', ctx.astroName || '', pt(gha, RR), C, 30, { bold: true });
    F.path(arcP(0, gha, RR * 0.88), 'c2', { arrow: true });
    arcLabel('hG', F.val(N.haG, dm(gha), 'Horario en Greenwich'), 0, gha, RR * 0.88, F.pal.c2);

    if (o.lugar) {
      F.step(++s, 'Horario del lugar');
      F.path(arcP(hM, hM + hL, RR * 0.66), 'c1', { arrow: true });
      arcLabel('hL', F.val(N.ha, dm(hL), 'Horario del lugar'), hM, hM + hL, RR * 0.66, F.pal.c1);
    }

    if (o.aries) {
      F.step(++s, 'Aries y ángulo sidéreo');
      const AS = mod360(gha - ghaA);
      F.path([C, pt(ghaA, RR)], 'ref2', { kind: 'dash' });
      F.labAway2('aries', 'γ', pt(ghaA, RR), C, 16, { bold: true, scale: 1.2, col: F.pal.c3 });
      F.path(arcP(ghaA, ghaA + AS, RR * 0.44), 'c3', { arrow: true });
      arcLabel('as', F.val(N.sha, dm(AS), 'Ángulo sidéreo'), ghaA, ghaA + AS, RR * 0.44, F.pal.c3);
      F.path(arcP(0, ghaA, RR + 84), 't3', { arrow: true });
      F.labAway2('hGA', F.val(N.haGA, dm(ghaA), 'Horario de Aries'), pt(ghaA / 2, RR + 84), C, 12, { scale: 0.9, col: F.pal.c3 });
    }

    if (o.formula) {
      const lines = [];
      if (o.lugar) {
        const lonTxt = lon >= 0 ? `+ ${N.lon}E` : `− ${N.lon}W`;
        lines.push(`${N.ha} = ${N.haG} ${lonTxt} = ${dm(gha)} ${lon >= 0 ? '+' : '−'} ${dm(Math.abs(lon))} = ${dm(hL)}`);
      }
      if (o.aries) lines.push(`${N.haG} = ${N.haGA} + ${N.sha} = ${dm(ghaA)} + ${dm(mod360(gha - ghaA))} = ${dm(gha)}`);
      lines.forEach((t, i) => F.lab('formula' + i, t, W / 2, 752 - (lines.length - 1 - i) * 30, { scale: 0.9 }));
    }
  },

  compute(p) {
    const hL = lhaFrom(p.gha, p.lon);
    const AS = mod360(p.gha - p.ghaA);
    return [
      ['Horario en Greenwich', `${dm(p.gha)} (${fHours(p.gha)})`],
      ['Longitud', fLon(wrap180(p.lon))],
      ['Horario del lugar', `${dm(hL)} (${fHours(hL)})`],
      ['Ángulo en el polo', hL <= 180 ? `${dm(hL)} W` : `${dm(360 - hL)} E`],
      ['Ángulo sidéreo (con Aries)', dm(AS)],
    ];
  },
};
