// Motor de dibujo: la clase Fig recoge primitivas (curvas, puntos, rótulos) y
// produce un SVG. No toca el DOM, así que funciona igual en el navegador y en Node.
//
// Construcción paso a paso: cada figura llama a F.step(n, 'Título') antes de dibujar
// cada grupo de elementos. Con `reveal = {upto, frac}` solo se ven los pasos ≤ upto,
// y el paso `upto` aparece parcialmente (las curvas crecen, los rótulos aparecen al final).

import { DEG, clamp, add, sub, mul, len } from './math.js';
import { NOTATION } from './format.js';

export const W = 820;
export const H = 780;
export const CX = 410;
export const CY = 392;
export const R = 290;

export const FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'DejaVu Sans', Verdana, Arial, sans-serif",
};

export function palette(mode) {
  if (mode === 'bn') {
    return {
      ink: '#111111', ref: '#222222', grid: '#8f8f8f', eqc: '#333333',
      c1: '#000000', c2: '#000000', c3: '#000000',
      sphere: '#ffffff', plane: 'rgba(0,0,0,0.06)', bowl1: '#b4b4b4', bowl2: '#f6f6f6',
      tri: 'rgba(0,0,0,0.13)', sun: '#ffffff', star: '#111111', dot: '#000000', sea: '#ececec', paper: '#ffffff',
    };
  }
  return {
    ink: '#1C2733', ref: '#3A4A5C', grid: '#A6B2BE', eqc: '#4F7DB3',
    c1: '#B0306A', c2: '#1F5FA8', c3: '#2E7D4F',
    sphere: '#F3F7FA', plane: 'rgba(31,95,168,0.09)', bowl1: '#b3c6d9', bowl2: '#f2f6fa',
    tri: 'rgba(176,48,106,0.14)', sun: '#F0B429', star: '#E8A817', dot: '#B0306A', sea: '#DCE7F0', paper: '#ffffff',
  };
}

// Categorías de trazo: [color de la paleta, grosor base].
const CATS = {
  sphere: ['ink', 1.8], ref: ['ref', 1.5], ref2: ['ref', 1.05], eq: ['eqc', 1.5], grid: ['grid', 0.7],
  inner: ['grid', 1.1], c1: ['c1', 2.8], c2: ['c2', 2.8], c3: ['c3', 2.8],
  t1: ['c1', 1.4], t2: ['c2', 1.4], t3: ['c3', 1.4], ang: ['ink', 1.4], ink: ['ink', 1.2],
};

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (x) => x.toFixed(1);
export const pathD = (pts) => 'M' + pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join('L');

/** Recorta una polilínea a la fracción v de sus puntos (interpolando el último). */
export function partial(pts, v) {
  if (v >= 1 || pts.length < 2) return pts;
  const x = Math.max(0, v) * (pts.length - 1);
  const i = Math.floor(x), f = x - i;
  const out = pts.slice(0, i + 1);
  if (i + 1 < pts.length && f > 0) {
    const a = pts[i], b = pts[i + 1];
    out.push(a.map((c, j) => c + (b[j] - c) * f));
  }
  if (out.length < 2) out.push(out[0]);
  return out;
}

export function wrapText(t, max) {
  const words = t.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export class Fig {
  /**
   * @param {object} o
   * @param {object} o.style   estilo global (ver state.js DEFAULT_STYLE)
   * @param {object} [o.view]  {yaw, pitch} en grados para figuras 3D
   * @param {object} [o.reveal] {upto, frac} para la construcción paso a paso
   * @param {string} [o.idPrefix] prefijo de ids SVG (evita choques entre varios SVG en la misma página)
   */
  constructor({ style, view = null, reveal = null, idPrefix = 'f' }) {
    this.style = style;
    this.pal = palette(style.mode);
    this.bw = style.mode === 'bn';
    this.lw = { f: 0.75, n: 1, g: 1.4 }[style.weight] ?? 1;
    this.fs = { s: 16, m: 20, l: 25 }[style.size] ?? 20;
    this.font = FONTS[style.font] || FONTS.serif;
    this.hidden = style.hidden !== false;
    this.vals = style.values !== false;
    this.words = !!style.words;
    this.arrows = style.arrows !== false;
    this.curved = !!style.curved;
    this.N = NOTATION[style.notation] || NOTATION.intl;
    this.reveal = reveal;
    this.idp = idPrefix;
    this.cur = 0;
    this.stepTitles = {};
    this.maxStep = 0;
    this.layers = { fills: [], back: [], front: [], marks: [], defs: [] };
    this.labels = [];
    this.labelIndex = [];
    this.sphere = false;
    this.setView(view || { yaw: 0, pitch: 0 });
  }

  setView(v) {
    this.view = v;
    this._cy = Math.cos(v.yaw * DEG); this._sy = Math.sin(v.yaw * DEG);
    this._cp = Math.cos(v.pitch * DEG); this._sp = Math.sin(v.pitch * DEG);
  }

  /** Coordenadas de cámara: [x, y, profundidad]; profundidad > 0 = cara visible. */
  V(p) {
    const x1 = p[0] * this._cy + p[2] * this._sy;
    const z1 = -p[0] * this._sy + p[2] * this._cy;
    return [x1, p[1] * this._cp - z1 * this._sp, p[1] * this._sp + z1 * this._cp];
  }

  /** Proyección a pantalla: [x, y, profundidad]. */
  P(p) {
    const q = this.V(p);
    return [CX + R * q[0], CY - R * q[1], q[2]];
  }

  // ---------- pasos ----------
  step(n, title) {
    this.cur = n;
    if (title) this.stepTitles[n] = title;
    this.maxStep = Math.max(this.maxStep, n);
  }

  /** Fracción visible del elemento que se dibuja ahora (0 = oculto, 1 = completo). */
  vis() {
    const r = this.reveal;
    if (!r) return 1;
    if (this.cur < r.upto) return 1;
    if (this.cur > r.upto) return 0;
    return clamp(r.frac, 0, 1);
  }

  _push(layer, svg, v = 1) {
    this.layers[layer].push(v >= 0.999 ? svg : `<g opacity="${v.toFixed(3)}">${svg}</g>`);
  }

  stroke(cat, kind = 'front') {
    const [ck, w] = CATS[cat] || CATS.ref;
    let width = w * this.lw;
    let extra = '';
    if (kind === 'back') { width *= 0.8; extra = ` stroke-dasharray="${f1(6 * this.lw)} ${f1(5 * this.lw)}" opacity="0.6"`; }
    else if (kind === 'dot') { width *= 0.9; extra = ` stroke-dasharray="0.1 ${f1(4.5 * this.lw)}"`; }
    else if (kind === 'in') { width *= 0.85; extra = ` stroke-dasharray="${f1(3.5 * this.lw)} ${f1(3.5 * this.lw)}"`; }
    else if (kind === 'dash') { extra = ` stroke-dasharray="${f1(9 * this.lw)} ${f1(6 * this.lw)}"`; }
    return `fill="none" stroke="${this.pal[ck]}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${extra}`;
  }

  // ---------- primitivas 3D ----------
  /** Curva sobre la esfera; las partes ocultas van a trazos. o.arrow: 'end' | 'trim'; o.dash: trazo discontinuo. */
  curve(pts, cat, o = {}) {
    const v = this.vis();
    if (v <= 0 || !pts || pts.length < 2) return;
    if (v < 1) pts = partial(pts, v);
    const pr = pts.map((p) => this.P(p));
    const runs = [];
    let cur = { vis: pr[0][2] >= 0, pts: [pr[0]] };
    for (let i = 1; i < pr.length; i++) {
      const a = pr[i - 1], b = pr[i], vb = b[2] >= 0;
      if (vb === cur.vis) cur.pts.push(b);
      else {
        const t = a[2] / (a[2] - b[2]);
        const m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0];
        cur.pts.push(m); runs.push(cur); cur = { vis: vb, pts: [m, b] };
      }
    }
    runs.push(cur);
    const fk = o.dash ? 'dash' : 'front';
    for (const r of runs) {
      if (r.pts.length < 2) continue;
      if (r.vis) this.layers.front.push(`<path d="${pathD(r.pts)}" ${this.stroke(cat, fk)}/>`);
      else if (this.hidden) this.layers.back.push(`<path d="${pathD(r.pts)}" ${this.stroke(cat, 'back')}/>`);
    }
    if (o.arrow && this.arrows) this._arrow3(pts, cat, o.arrow === 'trim');
  }

  /** Solo la punta de flecha al final de pts (3D). */
  arrowHead(pts, cat) {
    if (!this.arrows || this.vis() < 0.999) return;
    this._arrow3(pts, cat, false);
  }

  _chev(P, Q, cat) {
    const ux = P[0] - Q[0], uy = P[1] - Q[1], l = Math.hypot(ux, uy);
    if (l < 1e-3) return;
    const u = [ux / l, uy / l], n = [-u[1], u[0]], L = 12 * Math.max(1, Math.sqrt(this.lw));
    const w1 = [P[0] - u[0] * L + n[0] * L * 0.42, P[1] - u[1] * L + n[1] * L * 0.42];
    const w2 = [P[0] - u[0] * L - n[0] * L * 0.42, P[1] - u[1] * L - n[1] * L * 0.42];
    this.layers.front.push(`<path d="${pathD([w1, P, w2])}" ${this.stroke(cat, 'front')}/>`);
  }

  _arrow3(pts, cat, trim) {
    if (pts.length < 3) return;
    let i = pts.length - 1;
    if (trim) i = Math.max(2, i - 3);
    const P = this.P(pts[i]);
    if (P[2] < -0.001) return;
    let j = i - 1, Q = this.P(pts[j]);
    while (j > 0 && Math.hypot(P[0] - Q[0], P[1] - Q[1]) < 8) { j--; Q = this.P(pts[j]); }
    this._chev(P, Q, cat);
  }

  _arrow2(pts, cat) {
    if (pts.length < 2) return;
    const P = pts[pts.length - 1];
    let j = pts.length - 2, Q = pts[j];
    while (j > 0 && Math.hypot(P[0] - Q[0], P[1] - Q[1]) < 8) { j--; Q = pts[j]; }
    this._chev(P, Q, cat);
  }

  /** Segmento recto en el espacio: punteado dentro de la esfera, a trazos detrás. */
  seg(a, b, cat) {
    const v = this.vis();
    if (v <= 0) return;
    if (v < 1) b = add(a, mul(sub(b, a), v));
    const n = 80;
    const cls = (p) => {
      const q = this.V(p);
      if (len(p) <= 1.0001) return 'in';
      if (q[0] * q[0] + q[1] * q[1] < 1 && q[2] < 0) return 'back';
      return 'front';
    };
    const runs = [];
    let cur = null;
    for (let i = 0; i <= n; i++) {
      const p = add(a, mul(sub(b, a), i / n));
      const c = cls(p), s = this.P(p);
      if (!cur || cur.c !== c) { if (cur) { cur.pts.push(s); runs.push(cur); } cur = { c, pts: [s] }; } else cur.pts.push(s);
    }
    runs.push(cur);
    for (const r of runs) {
      if (r.pts.length < 2) continue;
      if (r.c === 'front') this.layers.front.push(`<path d="${pathD(r.pts)}" ${this.stroke(cat, 'front')}/>`);
      else if (r.c === 'in') this.layers.back.push(`<path d="${pathD(r.pts)}" ${this.stroke(cat, 'in')}/>`);
      else if (this.hidden) this.layers.back.push(`<path d="${pathD(r.pts)}" ${this.stroke(cat, 'back')}/>`);
    }
  }

  /** Línea recta proyectada (por ejemplo, del observador a la estrella), en la capa de fondo. */
  line(a, b, cat, kind = 'front') {
    const v = this.vis();
    if (v <= 0) return;
    if (v < 1) b = add(a, mul(sub(b, a), v));
    this.layers.back.push(`<path d="${pathD([this.P(a), this.P(b)])}" ${this.stroke(cat, kind)}/>`);
  }

  /** Polilínea 3D sin distinguir caras (arquitos interiores). */
  flat(pts, cat) {
    const v = this.vis();
    if (v <= 0) return;
    this.layers.front.push(`<path d="${pathD(partial(pts, v).map((p) => this.P(p)))}" ${this.stroke(cat, 'front')}/>`);
  }

  fillPlane(pts, fill) {
    const v = this.vis();
    if (v <= 0) return;
    this._push('fills', `<path d="${pathD(pts.map((p) => this.P(p)))}Z" fill="${fill}" stroke="none"/>`, v);
  }

  /** Media esfera bajo el horizonte, sombreada en degradado. */
  bowl() {
    const v = this.vis();
    if (v <= 0) return;
    const ry = R * Math.abs(Math.sin(this.view.pitch * DEG));
    const L = `${CX - R},${CY}`, Rt = `${CX + R},${CY}`;
    const gid = this.idp + 'bowl';
    this.layers.defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${this.pal.bowl1}"/><stop offset="1" stop-color="${this.pal.bowl2}"/></linearGradient>`);
    this._push('fills', `<path d="M${L} A${R},${f1(ry)} 0 0 ${this.view.pitch >= 0 ? 0 : 1} ${Rt} A${R},${R} 0 0 1 ${L}Z" fill="url(#${gid})"/>`, v);
  }

  dot(p, col, r = 5) {
    const s = this.P(p);
    this.dotS(s[0], s[1], col, r, s[2] < -0.001);
  }

  dotS(x, y, col, r = 5, back = false) {
    const v = this.vis();
    if (v <= 0) return;
    const rr = r * Math.sqrt(this.lw);
    this._push('marks', `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr.toFixed(2)}" fill="${back ? this.pal.paper : col}" stroke="${col}" stroke-width="1.5"${back ? ' opacity="0.6"' : ''}/>`, v);
  }

  /** Astro en un punto de la esfera. type: 'sol' | 'estrella' | 'punto'. */
  astro(p, type) {
    const s = this.P(p);
    this.astroAt(s, type, s[2] < 0);
  }

  astroAt(s, type, back = false, o = {}) {
    const v = this.vis();
    if (v <= 0) return;
    const x = s[0], y = s[1], k = Math.max(0.9, Math.sqrt(this.lw)) * (o.scale || 1);
    let g = '';
    if (type === 'punto') {
      g = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(7 * k)}" fill="${o.hollow ? this.pal.paper : this.pal.ink}" stroke="${this.pal.ink}" stroke-width="1.5"/>`;
    } else if (type === 'sol') {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g += `<line x1="${f1(x + Math.cos(a) * 12 * k)}" y1="${f1(y + Math.sin(a) * 12 * k)}" x2="${f1(x + Math.cos(a) * 18 * k)}" y2="${f1(y + Math.sin(a) * 18 * k)}" stroke="${this.pal.ink}" stroke-width="1.6" stroke-linecap="round"/>`;
      }
      g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(9 * k)}" fill="${o.hollow ? this.pal.paper : this.pal.sun}" stroke="${this.pal.ink}" stroke-width="1.5"/>`;
      if (this.bw && !o.hollow) g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.2" fill="#000000"/>`;
    } else {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? 5.5 : 13.5) * k;
        pts.push(f1(x + Math.cos(a) * r) + ',' + f1(y + Math.sin(a) * r));
      }
      g = `<polygon points="${pts.join(' ')}" fill="${o.hollow ? this.pal.paper : this.pal.star}" stroke="${this.pal.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
    }
    this._push('marks', back ? `<g opacity="0.55">${g}</g>` : g, v);
  }

  // ---------- primitivas 2D (coordenadas de pantalla) ----------
  /** Polilínea en pantalla. o: {kind, arrow, layer} */
  path(pts, cat, o = {}) {
    const v = this.vis();
    if (v <= 0 || pts.length < 2) return;
    const p = partial(pts, v);
    this.layers[o.layer || 'front'].push(`<path d="${pathD(p)}" ${this.stroke(cat, o.kind || 'front')}/>`);
    if (o.arrow && this.arrows) this._arrow2(p, cat);
  }

  poly(pts, fill, o = {}) {
    const v = this.vis();
    if (v <= 0) return;
    const stroke = o.stroke ? ` stroke="${this.pal[CATS[o.stroke][0]]}" stroke-width="${(CATS[o.stroke][1] * this.lw).toFixed(2)}" stroke-linejoin="round"` : ' stroke="none"';
    this._push(o.layer || 'fills', `<path d="${pathD(pts)}Z" fill="${fill}"${stroke}/>`, v);
  }

  /** SVG en bruto (ya construido con las coordenadas finales). */
  raw(svg, layer = 'marks') {
    const v = this.vis();
    if (v <= 0) return;
    this._push(layer, svg, v);
  }

  // ---------- rótulos ----------
  lab(id, text, x, y, o = {}) {
    this.labelIndex.push({ id, text });
    const v = this.vis();
    const op = v >= 1 ? 1 : clamp((v - 0.45) / 0.55, 0, 1);
    if (op <= 0) return;
    // Mantiene el texto dentro del lienzo (anchura aproximada a partir del número de letras).
    const size = (o.scale || 1) * this.fs;
    const wEst = String(text).length * size * 0.52;
    const anchor = o.anchor || 'middle';
    const left = anchor === 'start' ? x : anchor === 'end' ? x - wEst : x - wEst / 2;
    if (left < 6) x += 6 - left;
    else if (left + wEst > W - 6) x -= left + wEst - (W - 6);
    y = clamp(y, size + 2, H - 6);
    this.labels.push({
      id, text, x, y, anchor, col: o.col || this.pal.ink,
      size, bold: !!o.bold, italic: !!o.italic, faint: !!o.faint, op,
    });
  }

  /** Rótulo desplazado px píxeles desde s en la dirección (dx, dy) unitaria. */
  place(id, text, s, dx, dy, px, o = {}) {
    const size = (o.scale || 1) * this.fs;
    const x = s[0] + dx * px, y = s[1] + dy * px;
    const anchor = o.anchor || (dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle');
    const yb = y + size * 0.35 + (Math.abs(dx) <= 0.35 ? dy * size * 0.5 : 0);
    this.lab(id, text, x, yb, { ...o, anchor });
  }

  /** Rótulo hacia fuera desde el centro de la figura. */
  labR(id, text, p3, px, o = {}) {
    const s = this.P(p3);
    let dx = s[0] - CX, dy = s[1] - CY;
    const l = Math.hypot(dx, dy);
    if (l < 1) { dx = 0; dy = -1; } else { dx /= l; dy /= l; }
    this.place(id, text, s, dx, dy, px, { faint: s[2] < -0.01, ...o });
  }

  /** Rótulo junto a p3, desplazado hacia p3dir. */
  labT(id, text, p3, p3dir, px, o = {}) {
    const s = this.P(p3), t = this.P(p3dir);
    const dx = t[0] - s[0], dy = t[1] - s[1], l = Math.hypot(dx, dy) || 1;
    this.place(id, text, s, dx / l, dy / l, px, { faint: s[2] < -0.01, ...o });
  }

  /** Rótulo junto a p3, alejándose del punto de pantalla `from`. */
  labAway(id, text, p3, from, px, o = {}) {
    const s = this.P(p3);
    const dx = s[0] - from[0], dy = s[1] - from[1], l = Math.hypot(dx, dy) || 1;
    this.place(id, text, s, dx / l, dy / l, px, { faint: s[2] < -0.01, ...o });
  }

  labAt(id, text, p3, o = {}) {
    const s = this.P(p3);
    this.lab(id, text, s[0], s[1] + this.fs * 0.35 * (o.scale || 1), { faint: s[2] < -0.01, ...o });
  }

  /** Rótulo 2D alejándose de un centro de pantalla. */
  labAway2(id, text, s, from, px, o = {}) {
    const dx = s[0] - from[0], dy = s[1] - from[1], l = Math.hypot(dx, dy) || 1;
    this.place(id, text, s, dx / l, dy / l, px, o);
  }

  /** Rótulo que sigue una curva 3D. Si no cabe o la curva se dobla, usa `fallback`. */
  labCurve(id, text, pts3, side, fallback, o = {}) {
    if (!this.curved) { fallback(); return; }
    let pts = pts3.map((p) => this.P(p)).filter((q) => q[2] >= -0.001);
    if (pts.length < 4) { fallback(); return; }
    const dx = pts[pts.length - 1][0] - pts[0][0], dy = pts[pts.length - 1][1] - pts[0][1];
    const vertical = Math.abs(dx) < Math.abs(dy) * 0.35;
    if (vertical) { if (dy < 0) pts = [...pts].reverse(); } else if (dx < 0) pts = [...pts].reverse();
    for (let i = 1; i < pts.length; i++) {
      const st = vertical ? pts[i][1] - pts[i - 1][1] : pts[i][0] - pts[i - 1][0];
      if (st < -0.5) { fallback(); return; }
    }
    let plen = 0;
    for (let i = 1; i < pts.length; i++) plen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (plen < text.length * ((o.scale || 1) * this.fs) * 0.55) { fallback(); return; }
    const k = Math.floor(pts.length / 2), m = pts[k], m1 = pts[Math.max(0, k - 1)], m2 = pts[Math.min(pts.length - 1, k + 1)];
    const d = [m2[0] - m1[0], m2[1] - m1[1]], n = [-d[1], d[0]];
    const nOut = (m[0] - CX) * n[0] + (m[1] - CY) * n[1] > 0;
    const wantN = side === 'out' ? nOut : !nOut;
    const size = (o.scale || 1) * this.fs;
    const pid = `${this.idp}cp-${id}`;
    this.layers.defs.push(`<path id="${pid}" d="${pathD(pts)}" fill="none"/>`);
    this.labelIndex.push({ id, text });
    const v = this.vis();
    const op = v >= 1 ? 1 : clamp((v - 0.45) / 0.55, 0, 1);
    if (op <= 0) return;
    this.labels.push({
      id, text, curve: { pid, dy: wantN ? 9 + size * 0.75 : -9 }, anchor: 'middle', col: o.col || this.pal.ink,
      size, bold: !!o.bold, italic: !!o.italic, faint: false, x: 0, y: 0, op,
    });
  }

  /** Elige un ángulo libre (lejos de `avoid`) y bien visible para colocar un rótulo. */
  pickAngle(fn, avoid, prefLeft = 0.5) {
    let best = 0, bs = -1e9;
    for (let a = 0; a < 360; a += 5) {
      if (avoid.some((v) => Math.abs(((a - v + 540) % 360) - 180) < 28)) continue;
      const q = this.V(fn(a));
      const sc = q[2] - prefLeft * q[0] - 0.3 * q[1];
      if (sc > bs) { bs = sc; best = a; }
    }
    return best;
  }

  /** Texto de un arco: símbolo o palabra, con o sin valor. */
  val(sym, text, word) {
    const w = this.words && word;
    const name = w ? word : sym;
    if (!this.vals) return name;
    return w ? `${name} ${text}` : `${name} = ${text}`;
  }

  // ---------- salida ----------
  toSVG({ transparent = false, caption = '', offsets = {}, texts = {}, showLabels = true, banner = '' } = {}) {
    const cap = (caption || '').trim();
    const lines = cap ? wrapText(cap, 62) : [];
    const capH = lines.length ? lines.length * this.fs * 1.35 + 30 : 0;
    const h = Math.round(H + capH);
    const id = this.idp;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" font-family="${this.font}">`;
    s += `<defs><clipPath id="${id}clip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>${this.layers.defs.join('')}</defs>`;
    if (!transparent) s += `<rect x="0" y="0" width="${W}" height="${h}" fill="${this.pal.paper}"/>`;
    s += `<g clip-path="url(#${id}clip)">`;
    if (this.sphere) s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="${this.pal.sphere}"/>`;
    s += this.layers.fills.join('') + this.layers.back.join('');
    if (this.sphere) s += `<circle cx="${CX}" cy="${CY}" r="${R}" ${this.stroke('sphere', 'front')}/>`;
    s += this.layers.front.join('') + this.layers.marks.join('');
    if (showLabels) {
      for (const L of this.labels) {
        const txt = String(texts[L.id] || '').trim() || L.text;
        if (!txt) continue;
        const o = offsets[L.id] || { dx: 0, dy: 0 };
        const op = (L.faint ? 0.6 : 1) * L.op;
        const common = `font-size="${L.size.toFixed(1)}" fill="${L.col}"${L.bold ? ' font-weight="bold"' : ''}${L.italic ? ' font-style="italic"' : ''}${op < 0.999 ? ` opacity="${op.toFixed(3)}"` : ''} stroke="${this.pal.paper}" stroke-width="${(L.size * 0.26).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"`;
        if (L.curve) {
          s += `<g data-lid="${esc(L.id)}" transform="translate(${f1(o.dx)},${f1(o.dy)})"><text ${common} dy="${L.curve.dy.toFixed(1)}"><textPath href="#${L.curve.pid}" xlink:href="#${L.curve.pid}" startOffset="50%" text-anchor="middle">${esc(txt)}</textPath></text></g>`;
        } else {
          s += `<text data-lid="${esc(L.id)}" x="${f1(L.x + o.dx)}" y="${f1(L.y + o.dy)}" text-anchor="${L.anchor}" ${common}>${esc(txt)}</text>`;
        }
      }
    }
    s += '</g>';
    if (banner) {
      s += `<text x="24" y="${f1(16 + this.fs * 1.1)}" font-size="${f1(this.fs * 1.1)}" font-weight="bold" fill="${this.pal.ink}" stroke="${this.pal.paper}" stroke-width="${f1(this.fs * 0.3)}" stroke-linejoin="round" paint-order="stroke">${esc(banner)}</text>`;
    }
    lines.forEach((ln, i) => {
      s += `<text x="${W / 2}" y="${f1(H + 22 + this.fs + i * this.fs * 1.35)}" text-anchor="middle" font-size="${this.fs}" font-style="italic" fill="${this.pal.ink}">${esc(ln)}</text>`;
    });
    return { svg: s + '</svg>', width: W, height: h };
  }
}
