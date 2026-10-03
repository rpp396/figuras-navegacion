// Registro de figuras. Para añadir una figura nueva: crea su archivo en esta carpeta,
// impórtalo aquí y añádelo a FIGURES en el grupo que le corresponda (ver CLAUDE.md).

import terrestre from './terrestre.js';
import subastral from './subastral.js';
import ecuatoriales from './ecuatoriales.js';
import horizontales from './horizontales.js';
import triangulo from './triangulo.js';
import diurno from './diurno.js';
import ecliptica from './ecliptica.js';
import meridiana from './meridiana.js';
import horarios from './horarios.js';
import recta from './recta.js';
import depresion from './depresion.js';

export const GROUPS = [
  { id: 'tierra', name: 'La Tierra' },
  { id: 'celeste', name: 'La esfera celeste' },
  { id: 'plano', name: 'Vistas planas y carta' },
];

export const FIGURES = [
  terrestre, subastral,
  horizontales, ecuatoriales, triangulo, diurno, ecliptica,
  meridiana, horarios, recta, depresion,
];

export const byId = (id) => FIGURES.find((f) => f.id === id);
