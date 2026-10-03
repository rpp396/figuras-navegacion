import { Y, arc, gc, angArc, clamp, dot, mul, rot, mod360, hor, vert } from '../core/math.js';
import { altAz } from '../core/astro.js';
import { dm, fLat, fAz3 } from '../core/format.js';

function zNautical(Az, lat) {
  if (lat >= 0) return Az <= 180 ? `N ${dm(Az)} E` : `N ${dm(360 - Az)} W`;
  return Az <= 180 ? `S ${dm(180 - Az)} E` : `S ${dm(Az - 180)} W`;
}

export default {
  id: 'triangulo',
  group: 'celeste',
  name: 'Triángulo de posición',
  desc: 'Polo, cénit y astro en la esfera celeste',
  view: { yaw: 125, pitch: 32 },
  params: [
    { k: 'lat', kind: 'angle', sym: 'lat', label: 'Latitud del observador', min: -89, max: 89, def: 40, hem: ['N', 'S'] },
    { k: 'dec', kind: 'angle', sym: 'dec', label: 'Declinación del astro', min: -89, max: 89, def: 20, hem: ['N', 'S'] },
    { k: 't', kind: 'angle', sym: 'ha', label: 'Horario del lugar', min: 0, max: 360, def: 50, suffix: 'hacia el W' },
  ],
  opts: [
    ['ext', 'Prolongar hasta el ecuador y el horizonte', false],
    ['angulos', 'Ángulos en el polo y en el cénit', true],
    ['relleno', 'Sombrear el triángulo', true],
    ['resultado', 'Altura y azimut calculados al pie', true],
    ['plano', 'Sombrear el plano del horizonte', true],
  ],
  astro: { type: 'estrella', name: 'Astro' },
  caption: 'El triángulo de posición.',
  animations: [
    { label: 'El astro avanza hacia el oeste', param: 't', from: 300, to: 60 },
    { label: 'Cambiar la latitud', param: 'lat', from: 10, to: 70 },
  ],

  draw(F, p, o, ctx) {
    F.sphere = true;
    const N = F.N, { lat, dec, t } = p;
    const sg = lat >= 0 ? 1 : -1;
    if (lat < 0) F.setView({ yaw: F.view.yaw + 180, pitch: F.view.pitch });
    const H0 = hor(0), H90 = hor(90);
    const PN = vert(0, lat), PS = mul(PN, -1), Pe = sg > 0 ? PN : PS;
    const M = vert(180, 90 - lat), w = [-1, 0, 0];
    const eq = (th) => rot(M, w, th);
    const X = rot(eq(t), PN, dec);
    const { alt: a, az: Az } = altAz(lat, dec, t);

    F.step(1, 'Horizonte, ecuador y polos');
    if (o.plano) F.fillPlane(arc(H0, H90, 0, 360, 4), F.pal.plane);
    F.curve(arc(H0, H90, 0, 360), 'ref');
    F.curve(arc(H0, Y, 0, 360), 'ref2');
    F.curve(arc(M, w, 0, 360), 'eq');
    F.seg(mul(PS, 1.2), mul(PN, 1.2), 'ref2');
    F.labR('pn', sg > 0 ? 'Pn' : 'Ps', mul(Pe, 1.2), 10, { bold: true });
    F.labR('ps', sg > 0 ? 'Ps' : 'Pn', mul(Pe, -1.2), 10);
    for (const [k, an] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
      if (F.V(hor(an))[2] > -0.35) F.labR('c' + k, k, hor(an), 14, { bold: true });
    }
    const ea = F.pickAngle(eq, [0, t, t / 2, 90, 270]);
    F.labT('ecuador', 'Ecuador celeste', eq(ea), rot(eq(ea), PN, -10), 10, { italic: true, scale: 0.85, col: F.pal.eqc });
    const ha = F.pickAngle(hor, [0, 90, 180, 270, Az]);
    F.labT('horizonte', 'Horizonte', hor(ha), rot(hor(ha), Y, -10), 10, { italic: true, scale: 0.85 });

    F.step(2, 'Polo elevado, cénit y astro');
    F.dot(Y, F.pal.ink, 4);
    F.dot(Pe, F.pal.ink, 4);
    F.labR('cenit', F.words ? 'Cénit' : 'Cenit', Y, 12, { bold: true });
    F.astro(X, ctx.astroType);
    F.labR('astro', ctx.astroName || '', X, 22, { bold: true });

    const s1 = gc(Pe, Y), s2 = gc(Y, X), s3 = gc(X, Pe);
    const cen = [Pe, Y, X].map((q) => F.P(q)).reduce((s, q) => [s[0] + q[0] / 3, s[1] + q[1] / 3], [0, 0]);
    const mid = (pts) => pts[Math.floor(pts.length / 2)];
    const dp = 90 - sg * dec, cl = 90 - Math.abs(lat), zd = 90 - a;

    F.step(3, 'Colatitud: del polo al cénit');
    F.curve(s1, 'c2');
    F.labAway('colat', F.words ? F.val('', dm(cl), 'Colatitud') : F.vals ? `90° − ${N.lat} = ${dm(cl)}` : `90° − ${N.lat}`, mid(s1), cen, 12, { col: F.pal.c2 });

    F.step(4, 'Distancia polar: del polo al astro');
    F.curve(s3, 'c1');
    F.labAway('codec', F.words ? F.val('', dm(dp), 'Distancia polar') : F.vals ? `90° − ${N.dec} = ${dm(dp)}` : `90° − ${N.dec}`, mid(s3), cen, 12, { col: F.pal.c1 });

    F.step(5, 'Distancia cenital: del cénit al astro');
    F.curve(s2, 'c3');
    F.labAway('zd', F.words ? F.val('', dm(zd), 'Distancia cenital') : F.vals ? `${N.zd} = 90° − ${N.alt} = ${dm(zd)}` : `${N.zd} = 90° − ${N.alt}`, mid(s2), cen, 12, { col: F.pal.c3 });

    if (o.relleno || o.angulos || o.ext || o.resultado) {
      F.step(6, 'Ángulos y resultado');
      if (o.relleno) F.fillPlane([...s1, ...s2, ...s3], F.pal.tri);
      if (o.angulos) {
        const rr = clamp((Math.min(Math.acos(clamp(dot(Pe, Y), -1, 1)), Math.acos(clamp(dot(Pe, X), -1, 1)), Math.acos(clamp(dot(Y, X), -1, 1))) / (Math.PI / 180)) * 0.28, 6, 16);
        const A1 = angArc(Pe, Y, X, rr), A2 = angArc(Y, Pe, X, rr);
        if (A1) { F.curve(A1.pts, 'ang'); F.labAt('angP', 'P', A1.mid, { bold: true }); }
        if (A2) { F.curve(A2.pts, 'ang'); F.labAt('angZ', N.az, A2.mid, { bold: true }); }
      }
      if (o.ext) {
        F.curve(arc(eq(t), PN, 0, dec), 't1');
        F.curve(arc(hor(Az), Y, 0, a), 't2');
        F.labAway('extdec', F.words ? 'Declinación' : N.dec, rot(eq(t), PN, dec / 2), cen, 10, { col: F.pal.c1, scale: 0.85 });
        F.labAway('extalt', F.words ? 'Altura' : N.alt, vert(Az, a / 2), cen, 10, { col: F.pal.c2, scale: 0.85 });
      }
      if (o.resultado) {
        const tt = mod360(t);
        const Pv = tt <= 180 ? `${dm(tt)} W` : `${dm(360 - tt)} E`;
        F.lab('res1', `Ángulo en el polo: P = ${Pv}\u2003\u2003Azimut: ${N.az} = ${zNautical(Az, lat)} = ${fAz3(Az)}`, 40, 722, { anchor: 'start', scale: 0.85 });
        F.lab('res', `Altura: ${N.alt} = ${a < 0 ? '−' : ''}${dm(a)}\u2003\u2003Distancia cenital: ${N.zd} = ${dm(zd)}`, 40, 752, { anchor: 'start', scale: 0.85 });
      }
    }
  },

  compute(p) {
    const { alt, az } = altAz(p.lat, p.dec, p.t);
    return [
      ['Latitud', fLat(p.lat)],
      ['Declinación', fLat(p.dec)],
      ['Colatitud', dm(90 - Math.abs(p.lat))],
      ['Distancia polar', dm(90 - Math.sign(p.lat || 1) * p.dec)],
      ['Altura calculada', `${alt < 0 ? '−' : ''}${dm(alt)}`],
      ['Azimut calculado', `${dm(az)} (${fAz3(az)})`],
      ['Distancia cenital', dm(90 - alt)],
    ];
  },
};
