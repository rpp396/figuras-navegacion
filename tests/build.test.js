import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundle } from '../scripts/build.mjs';
import { makeZip, crc32 } from '../src/ui/zip.js';

test('el empaquetador produce JavaScript válido', () => {
  const js = bundle('src/main.js');
  assert.doesNotThrow(() => new Function(js));
  assert.ok(!/^\s*(import|export)\s/m.test(js), 'no deben quedar import/export');
});

test('ZIP: CRC-32 y estructura', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const data = new TextEncoder().encode('hola');
  const zip = makeZip([{ name: 'paso-1.txt', data }, { name: 'paso-2.txt', data }]);
  const dv = new DataView(zip.buffer);
  assert.equal(dv.getUint32(0, true), 0x04034b50, 'cabecera local');
  assert.equal(dv.getUint32(zip.length - 22, true), 0x06054b50, 'fin del directorio central');
  assert.equal(dv.getUint16(zip.length - 22 + 10, true), 2, 'dos archivos');
});
