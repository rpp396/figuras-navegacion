import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dm, dmd, fLat, fLon, fAz3, fHours, fDate, dayIndex, dateFromIndex, fMinSigned, fDist } from '../src/core/format.js';

test('grados y minutos', () => {
  assert.equal(dm(40.5), '40° 30′');
  assert.equal(dm(-3.25), '3° 15′');
  assert.equal(dm(59.9999), '60° 00′', 'redondea 60′ al grado siguiente');
  assert.equal(dmd(24.8983), '24° 53,9′');
});

test('hemisferios', () => {
  assert.equal(fLat(40.5), '40° 30′ N');
  assert.equal(fLat(-12), '12° 00′ S');
  assert.equal(fLat(0), '0° 00′');
  assert.equal(fLon(-30), '30° 00′ W');
  assert.equal(fLon(180), '180° 00′');
});

test('azimut en tres cifras y signos', () => {
  assert.equal(fAz3(50), '050°');
  assert.equal(fAz3(359.7), '000°');
  assert.equal(fMinSigned(6), '+6,0′');
  assert.equal(fMinSigned(-4), '−4,0′');
});

test('horas y fechas', () => {
  assert.equal(fHours(58), '3 h 52 min');
  assert.equal(fDate(dateFromIndex(140)), '21 de mayo');
  assert.equal(dayIndex(4, 21), 140);
});

test('distancias en millas o kilómetros', () => {
  assert.equal(fDist(12.3), '12,3 millas');
  assert.equal(fDist(12.3, 'km'), '22,8 km');
  assert.equal(fDist(1, 'mi', 0), '1 milla');
  assert.equal(fDist(600, 'km', 0), '1111 km');
});
