// Fórmulas de navegación astronómica. Todo en grados salvo que se diga otra cosa.
// Convenciones: latitud y declinación positivas al N; longitud positiva al E;
// horarios (t, hL, hG) contados hacia el W de 0° a 360°; azimut desde el N hacia el E.

import { DEG, clamp, mod360, wrap180 } from './math.js';

/** Altura y azimut a partir de latitud, declinación y horario del lugar (triángulo de posición). */
export function altAz(lat, dec, lha) {
  const f = lat * DEG, d = dec * DEG, t = lha * DEG;
  const sa = Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(t);
  const alt = Math.asin(clamp(sa, -1, 1)) / DEG;
  const az = mod360(
    Math.atan2(-Math.sin(t) * Math.cos(d), Math.cos(f) * Math.sin(d) - Math.sin(f) * Math.cos(d) * Math.cos(t)) / DEG,
  );
  return { alt, az };
}

/**
 * Movimiento diurno de un astro: tipo, arco semidiurno t0 y azimutes de orto y ocaso.
 * kind: 'circumpolar' (nunca se pone), 'nunca' (nunca sale) u 'orto' (sale y se pone).
 */
export function diurnal(lat, dec) {
  const x = -Math.tan(lat * DEG) * Math.tan(dec * DEG);
  if (!Number.isFinite(x) || x <= -1) return { kind: 'circumpolar', t0: 180 };
  if (x >= 1) return { kind: 'nunca', t0: 0 };
  const t0 = Math.acos(x) / DEG;
  const zOrto = Math.acos(clamp(Math.sin(dec * DEG) / Math.cos(lat * DEG), -1, 1)) / DEG;
  return { kind: 'orto', t0, zOrto, zOcaso: 360 - zOrto };
}

/** Altura en la culminación superior (paso por el meridiano superior). */
export const upperCulmination = (lat, dec) => 90 - Math.abs(lat - dec);
/** Altura en la culminación inferior (negativa si ocurre bajo el horizonte). */
export const lowerCulmination = (lat, dec) => Math.abs(lat + dec) - 90;

/** Día juliano a las 0 h TU. */
export function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/**
 * Posición aproximada del Sol a mediodía TU del día `dayIndex` (0 = 1 de enero).
 * Precisión de unas centésimas de grado: suficiente para ilustrar, no para navegar.
 */
export function sunForDay(dayIndex, year = 2026) {
  const n = julianDay(year, 1, 1) + dayIndex + 0.5 - 2451545.0;
  const L = mod360(280.46 + 0.9856474 * n);
  const g = mod360(357.528 + 0.9856003 * n) * DEG;
  const lambda = mod360(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const eps = 23.439 - 0.0000004 * n;
  const l = lambda * DEG, e = eps * DEG;
  const dec = Math.asin(Math.sin(e) * Math.sin(l)) / DEG;
  const ra = mod360(Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) / DEG);
  return { lambda, dec, ra, eps, date: new Date(Date.UTC(year, 0, 1 + dayIndex)) };
}

/** Punto subastral: latitud = declinación; longitud = −horario en Greenwich (llevado a ±180°). */
export const subastral = (dec, gha) => ({ lat: dec, lon: wrap180(-gha) });

/** Horario del lugar a partir del horario en Greenwich y la longitud (E positiva). */
export const lhaFrom = (gha, lonE) => mod360(gha + lonE);

/** Depresión del horizonte en minutos de arco para una altura del ojo h en metros. */
export const dip = (h) => 1.76 * Math.sqrt(Math.max(0, h));

/** Distancia aproximada al horizonte de la mar, en millas, para h en metros. */
export const horizonDistance = (h) => 2.08 * Math.sqrt(Math.max(0, h));

/** Refracción astronómica media en minutos de arco (fórmula de Bennett). */
export function refraction(alt) {
  const h = Math.max(alt, -1);
  return 1 / Math.tan((h + 7.31 / (h + 4.4)) * DEG);
}

/** Punto determinante: desplazamiento (millas) desde la situación de estima. */
export const interceptPoint = (Z, da) => ({ e: da * Math.sin(Z * DEG), n: da * Math.cos(Z * DEG) });

/**
 * Corte de dos rectas de altura (método de Marcq Saint-Hilaire).
 * Devuelve el desplazamiento {e, n} en millas desde la estima, o null si son paralelas.
 */
export function fixFromTwoLines(Z1, d1, Z2, d2) {
  const a1 = Math.sin(Z1 * DEG), b1 = Math.cos(Z1 * DEG);
  const a2 = Math.sin(Z2 * DEG), b2 = Math.cos(Z2 * DEG);
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-6) return null;
  return { e: (d1 * b2 - d2 * b1) / det, n: (a1 * d2 - a2 * d1) / det };
}
