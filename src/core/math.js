// Geometría básica: ángulos en GRADOS en toda la API pública; vectores como [x, y, z].
// Ejes del mundo: Y hacia arriba (cénit o polo norte, según la figura).

export const DEG = Math.PI / 180;

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const mod360 = (x) => ((x % 360) + 360) % 360;
/** Lleva un ángulo al intervalo [-180, 180). */
export const wrap180 = (x) => mod360(x + 180) - 180;
export const lerp = (a, b, t) => a + (b - a) * t;
/** Suavizado de entrada y salida (para animaciones). */
export const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export const sind = (d) => Math.sin(d * DEG);
export const cosd = (d) => Math.cos(d * DEG);

export const Y = [0, 1, 0];
export const ORIGIN = [0, 0, 0];

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const nrm = (a) => mul(a, 1 / (len(a) || 1));

/** Combina dos ejes ortonormales: u·cos(t) + w·sin(t). */
export const rot = (u, w, t) => add(mul(u, cosd(t)), mul(w, sind(t)));

/** Arco de círculo máximo desde u (t0) hasta t1, con w perpendicular a u. */
export function arc(u, w, t0, t1, step = 2) {
  const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(rot(u, w, t0 + ((t1 - t0) * i) / n));
  return pts;
}

/** Arco de círculo máximo entre dos puntos de la esfera. */
export function gc(a, b) {
  const c = clamp(dot(a, b), -1, 1);
  const ang = Math.acos(c) / DEG;
  if (ang < 1e-4) return [a, b];
  const w = nrm(sub(b, mul(a, c)));
  return arc(a, w, 0, ang);
}

/** Círculo menor de radio angular `rad` alrededor del polo n. */
export function small(n, rad, step = 2) {
  const a = Math.abs(n[1]) < 0.9 ? Y : [1, 0, 0];
  const u = nrm(cross(n, a));
  const w = cross(n, u);
  const c = mul(n, cosd(rad));
  const s = sind(rad);
  return arc(u, w, 0, 360, step).map((p) => add(c, mul(p, s)));
}

/**
 * Arquito que marca el ángulo esférico en A entre los arcos AB y AC.
 * r = radio del arquito en grados. Devuelve {pts, mid} o null si el ángulo es casi nulo.
 */
export function angArc(A, B, C, r) {
  const t1 = nrm(sub(B, mul(A, dot(A, B))));
  const t2 = nrm(sub(C, mul(A, dot(A, C))));
  const c = clamp(dot(t1, t2), -1, 1);
  const ang = Math.acos(c);
  if (ang < 0.03) return null;
  let e2 = sub(t2, mul(t1, c));
  e2 = len(e2) < 1e-6 ? cross(A, t1) : nrm(e2);
  const f = (rr, th) => add(mul(A, cosd(rr)), mul(add(mul(t1, Math.cos(th)), mul(e2, Math.sin(th))), sind(rr)));
  const pts = [];
  for (let i = 0; i <= 30; i++) pts.push(f(r, (ang * i) / 30));
  return { pts, mid: f(r * 1.7, ang / 2), angle: ang / DEG };
}

/** Punto de la esfera terrestre (o ecuatorial) con latitud/declinación `la` y longitud `lo` (E positiva → +x). */
export const geo = (la, lo) => [cosd(la) * sind(lo), sind(la), cosd(la) * cosd(lo)];

/** Punto del horizonte con azimut A (N = -z, E = +x, S = +z, W = -x). */
export const hor = (A) => [sind(A), 0, -cosd(A)];

/** Punto de altura e sobre el vertical de azimut A. */
export const vert = (A, e) => rot(hor(A), Y, e);

/** Base local en un punto G de la esfera: norte y este tangentes. */
export function localFrame(G) {
  const north = nrm(sub(Y, mul(G, dot(G, Y))));
  const east = cross(north, G);
  return { north, east };
}

/** Punto a distancia angular rho de G, en la dirección del rumbo beta (desde el norte, hacia el este). */
export function offsetOnSphere(G, rho, beta) {
  const { north, east } = localFrame(G);
  return rot(G, rot(north, east, beta), rho);
}

/** Punto 2D a distancia r de c, con ángulo `deg` medido en sentido antihorario desde el eje +x (pantalla: y hacia abajo). */
export const polar2 = (c, r, deg) => [c[0] + r * cosd(deg), c[1] - r * sind(deg)];

/** Muestras de un arco 2D. */
export function arc2(c, r, d0, d1, step = 2) {
  const n = Math.max(2, Math.ceil(Math.abs(d1 - d0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(polar2(c, r, d0 + ((d1 - d0) * i) / n));
  return pts;
}
