import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  altAz, diurnal, upperCulmination, lowerCulmination, julianDay, sunForDay, subastral,
  lhaFrom, dip, refraction, fixFromTwoLines, interceptPoint,
} from '../src/core/astro.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} ≉ ${b} (±${tol})`);

test('altura y azimut: astro en el meridiano superior', () => {
  const { alt, az } = altAz(40, 15, 0);
  near(alt, 65, 1e-9, 'altura meridiana = 90 − (φ − δ)');
  near(az, 180, 1e-9, 'el astro culmina al sur');
});

test('altura y azimut: astro al oeste del meridiano tiene azimut W', () => {
  const { alt, az } = altAz(40, 20, 50);
  near(alt, 43.05, 0.01);
  assert.ok(az > 180 && az < 360);
  near(az, 260.05, 0.05);
});

test('altura y azimut: el polo está a la altura de la latitud', () => {
  near(altAz(37, 89.9999, 123).alt, 37, 1e-3);
});

test('movimiento diurno: tipos de astro', () => {
  assert.equal(diurnal(40, 60).kind, 'circumpolar');
  assert.equal(diurnal(40, -60).kind, 'nunca');
  const d = diurnal(40, 0);
  assert.equal(d.kind, 'orto');
  near(d.t0, 90, 1e-9, 'astro en el ecuador: arco semidiurno de 90°');
  near(d.zOrto, 90, 1e-9, 'sale por el E');
  near(d.zOcaso, 270, 1e-9, 'se pone por el W');
});

test('culminaciones', () => {
  near(upperCulmination(40, 20), 70, 1e-12);
  near(lowerCulmination(40, 60), 10, 1e-12);
});

test('día juliano', () => {
  near(julianDay(2000, 1, 1.5), 2451545.0, 1e-9);
  near(julianDay(2026, 1, 1), 2461041.5, 1e-9);
});

test('Sol: declinación en solsticios y equinoccios de 2026', () => {
  near(sunForDay(78).dec, 0, 0.5, '20 de marzo');
  near(sunForDay(171).dec, 23.44, 0.05, '21 de junio');
  near(sunForDay(354).dec, -23.44, 0.05, '21 de diciembre');
  near(sunForDay(171).eps, 23.436, 0.01);
});

test('punto subastral', () => {
  assert.deepEqual(subastral(20, 60), { lat: 20, lon: -60 });
  assert.equal(subastral(-5, 300).lon, 60);
});

test('horario del lugar = horario en Greenwich + longitud E', () => {
  assert.equal(lhaFrom(85, -30), 55);
  assert.equal(lhaFrom(350, 20), 10);
});

test('depresión del horizonte y refracción', () => {
  near(dip(12), 6.1, 0.05);
  near(refraction(0), 34.5, 0.5, 'en el horizonte');
  near(refraction(45), 1.0, 0.05, 'a 45°');
});

test('rectas de altura: corte de dos rectas perpendiculares', () => {
  const fx = fixFromTwoLines(0, 5, 90, 3);
  near(fx.n, 5, 1e-9);
  near(fx.e, 3, 1e-9);
  assert.equal(fixFromTwoLines(40, 1, 220, 2), null, 'paralelas');
  const p = interceptPoint(90, -4);
  near(p.e, -4, 1e-9);
  near(p.n, 0, 1e-9);
});
