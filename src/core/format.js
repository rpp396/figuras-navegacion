// Formatos náuticos en español: grados y minutos, hemisferios, coma decimal.

import { mod360 } from './math.js';

const MINUS = '−';

/** 40.5 → "40° 30′" (sin signo). */
export function dm(x) {
  const a = Math.abs(x);
  let d = Math.floor(a + 1e-9);
  let m = Math.round((a - d) * 60);
  if (m === 60) { d++; m = 0; }
  return `${d}° ${String(m).padStart(2, '0')}′`;
}

/** Grados y minutos con un decimal en los minutos: 24.8983 → "24° 53,9′". */
export function dmd(x) {
  const neg = x < 0;
  const a = Math.abs(x);
  let d = Math.floor(a + 1e-9);
  let m = Math.round((a - d) * 600) / 10;
  if (m >= 60) { d++; m = 0; }
  return `${neg ? MINUS : ''}${d}° ${fNum(m, 1).padStart(4, '0')}′`;
}

/** Con signo: −3.5 → "−3° 30′". */
export const dmSigned = (x) => (x < 0 ? MINUS : '') + dm(x);

export const fLat = (x) => dm(x) + (Math.abs(x) < 1 / 120 ? '' : x > 0 ? ' N' : ' S');
export const fLon = (x) => dm(x) + (Math.abs(x) < 1 / 120 || Math.abs(x) > 179.99 ? '' : x > 0 ? ' E' : ' W');

/** Número con coma decimal y signo menos tipográfico. */
export const fNum = (x, d = 1) => x.toFixed(d).replace('.', ',').replace('-', MINUS);

/** Minutos de arco con signo explícito: 6 → "+6,0′". */
export const fMinSigned = (x) => (x >= 0 ? '+' : MINUS) + fNum(Math.abs(x), 1) + '′';

/** Azimut o rumbo náutico en tres cifras: 50 → "050°". */
export const fAz3 = (z) => String(Math.round(mod360(z)) % 360).padStart(3, '0') + '°';

/** Ángulo horario en horas y minutos de tiempo: 58 → "3 h 52 min". */
export function fHours(deg) {
  const totalMin = Math.round((mod360(deg) / 15) * 60);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS = MESES;

/** Fecha en español: "21 de mayo". */
export const fDate = (date) => `${date.getUTCDate()} de ${MESES[date.getUTCMonth()]}`;

/** Día del año (0 = 1 de enero) para un año no bisiesto de referencia. */
export function dayIndex(month, day, year = 2026) {
  const t = Date.UTC(year, month, day);
  return Math.round((t - Date.UTC(year, 0, 1)) / 86400000);
}
export const dateFromIndex = (i, year = 2026) => new Date(Date.UTC(year, 0, 1 + i));

/**
 * Símbolos de cada notación. "intl" usa letras griegas; "esp" la notación de los
 * textos náuticos españoles. Las claves son las que usan las figuras (F.N.lat, etc.).
 */
export const NOTATION = {
  intl: {
    lat: 'φ', lon: 'λ', dec: 'δ', ha: 't', haG: 'tG', haA: 'tγ', haGA: 'tGγ', sha: 'AS', ra: 'AR',
    alt: 'a', az: 'Z', zd: 'z', da: 'Δa', dip: 'dp', ai: 'ai', ap: 'ap', av: 'av', eps: 'ε',
  },
  esp: {
    lat: 'l', lon: 'L', dec: 'd', ha: 'hL', haG: 'hG', haA: 'hLγ', haGA: 'hGγ', sha: 'AS', ra: 'AR',
    alt: 'a', az: 'Z', zd: 'z', da: 'Δa', dip: 'dp', ai: 'ai', ap: 'ap', av: 'av', eps: 'ε',
  },
};
