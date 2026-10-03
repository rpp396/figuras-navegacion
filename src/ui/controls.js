// Controles del panel: ángulos en grados y minutos, números, fechas, botones de opción y casillas.
// Cada control llama a onChange(valor) mientras el usuario lo mueve.

import { clamp } from '../core/math.js';
import { MONTHS, dateFromIndex, dayIndex, fDate, fNum } from '../core/format.js';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** Ángulo en grados y minutos, con hemisferio opcional y deslizador. */
export function angleField(def, value, symbol, onChange) {
  const id = 'p-' + def.k;
  const mx = Math.max(Math.abs(def.min), Math.abs(def.max));
  const wrap = el('div', 'field');
  wrap.innerHTML = `
    <label class="flabel" for="${id}-d">${esc(def.label)}${symbol ? ` <span class="sym">(${esc(symbol)})</span>` : ''}</label>
    <div class="dmrow">
      <input type="number" id="${id}-d" inputmode="numeric" min="0" max="${mx}" step="1" aria-label="${esc(def.label)}: grados">
      <span class="unit" aria-hidden="true">°</span>
      <input type="number" id="${id}-m" inputmode="decimal" min="0" max="59.9" step="1" aria-label="${esc(def.label)}: minutos">
      <span class="unit" aria-hidden="true">′</span>
      ${def.hem
        ? `<select id="${id}-h" aria-label="${esc(def.label)}: hemisferio"><option value="1">${def.hem[0]}</option><option value="-1">${def.hem[1]}</option></select>`
        : def.suffix ? `<span class="suffix">${esc(def.suffix)}</span>` : ''}
    </div>
    <input type="range" id="${id}-r" min="${def.min}" max="${def.max}" step="${def.step || 0.5}" aria-label="${esc(def.label)}">
    ${def.help ? `<p class="help">${esc(def.help)}</p>` : ''}`;
  const deg = wrap.querySelector(`#${id}-d`), min = wrap.querySelector(`#${id}-m`);
  const hem = wrap.querySelector(`#${id}-h`), rng = wrap.querySelector(`#${id}-r`);
  let cur = value;
  const show = (v) => {
    const a = Math.abs(v);
    let d = Math.floor(a + 1e-9), m = Math.round((a - d) * 60 * 10) / 10;
    if (m >= 60) { d++; m = 0; }
    deg.value = d;
    min.value = m;
    if (hem) hem.value = v < 0 ? '-1' : '1';
    rng.value = v;
  };
  const fromInputs = () => {
    const d = parseFloat(deg.value) || 0;
    const m = clamp(parseFloat(min.value) || 0, 0, 59.99);
    cur = clamp((d + m / 60) * (hem ? +hem.value : 1), def.min, def.max);
    rng.value = cur;
    onChange(cur);
  };
  rng.addEventListener('input', () => { cur = parseFloat(rng.value); show(cur); onChange(cur); });
  deg.addEventListener('input', fromInputs);
  min.addEventListener('input', fromInputs);
  if (hem) hem.addEventListener('change', fromInputs);
  deg.addEventListener('change', () => show(cur));
  min.addEventListener('change', () => show(cur));
  show(value);
  return wrap;
}

/** Número con unidad (metros, minutos de arco…) y deslizador. */
export function numberField(def, value, symbol, onChange) {
  const id = 'p-' + def.k;
  const wrap = el('div', 'field');
  wrap.innerHTML = `
    <label class="flabel" for="${id}-n">${esc(def.label)}${symbol ? ` <span class="sym">(${esc(symbol)})</span>` : ''}</label>
    <div class="dmrow">
      <input type="number" id="${id}-n" class="wide" inputmode="decimal" min="${def.min}" max="${def.max}" step="${def.step || 1}">
      <span class="unit">${esc(def.unit || '')}</span>
    </div>
    <input type="range" id="${id}-r" min="${def.min}" max="${def.max}" step="${def.step || 1}" aria-label="${esc(def.label)}">
    ${def.help ? `<p class="help">${esc(def.help)}</p>` : ''}`;
  const inp = wrap.querySelector(`#${id}-n`), rng = wrap.querySelector(`#${id}-r`);
  let cur = value;
  const show = (v) => { inp.value = v; rng.value = v; };
  rng.addEventListener('input', () => { cur = parseFloat(rng.value); inp.value = cur; onChange(cur); });
  inp.addEventListener('input', () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (Number.isFinite(v)) { cur = clamp(v, def.min, def.max); rng.value = cur; onChange(cur); }
  });
  inp.addEventListener('change', () => show(cur));
  show(value);
  return wrap;
}

/** Fecha del año (día 0 = 1 de enero): mes, día y deslizador. */
export function dayField(def, value, onChange) {
  const id = 'p-' + def.k;
  const wrap = el('div', 'field');
  wrap.innerHTML = `
    <label class="flabel" for="${id}-day">${esc(def.label)}: <span class="dateout"></span></label>
    <div class="dmrow">
      <input type="number" id="${id}-day" inputmode="numeric" min="1" max="31" step="1" aria-label="Día del mes">
      <select id="${id}-mon" aria-label="Mes">${MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('')}</select>
    </div>
    <input type="range" id="${id}-r" min="${def.min}" max="${def.max}" step="1" aria-label="${esc(def.label)}">
    ${def.help ? `<p class="help">${esc(def.help)}</p>` : ''}`;
  const day = wrap.querySelector(`#${id}-day`), mon = wrap.querySelector(`#${id}-mon`);
  const rng = wrap.querySelector(`#${id}-r`), out = wrap.querySelector('.dateout');
  const show = (i) => {
    const d = dateFromIndex(i);
    day.value = d.getUTCDate();
    mon.value = d.getUTCMonth();
    rng.value = i;
    out.textContent = fDate(d);
  };
  rng.addEventListener('input', () => { const i = parseInt(rng.value, 10); show(i); onChange(i); });
  const fromInputs = () => {
    const m = parseInt(mon.value, 10);
    const maxDay = new Date(Date.UTC(2026, m + 1, 0)).getUTCDate();
    const d = clamp(parseInt(day.value, 10) || 1, 1, maxDay);
    const i = clamp(dayIndex(m, d), def.min, def.max);
    rng.value = i;
    out.textContent = fDate(dateFromIndex(i));
    onChange(i);
  };
  day.addEventListener('input', fromInputs);
  mon.addEventListener('change', fromInputs);
  show(value);
  return wrap;
}

/** Grupo de botones excluyentes. options: [[valor, texto], …] */
export function segGroup(label, options, current, onPick) {
  const f = el('div', 'field');
  f.appendChild(el('span', 'sublabel', esc(label)));
  const g = el('div', 'seg');
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  for (const [v, t, disabled] of options) {
    const b = el('button', null, esc(t));
    b.type = 'button';
    b.disabled = !!disabled;
    b.setAttribute('aria-pressed', String(v === current));
    b.addEventListener('click', () => {
      [...g.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onPick(v);
    });
    g.appendChild(b);
  }
  f.appendChild(g);
  return f;
}

export function checkRow(label, checked, onChange, id) {
  const l = el('label', 'check');
  l.innerHTML = `<input type="checkbox"${id ? ` id="${id}"` : ''}><span>${esc(label)}</span>`;
  const c = l.querySelector('input');
  c.checked = !!checked;
  c.addEventListener('change', () => onChange(c.checked));
  return l;
}

/** Deslizador simple con valor visible (vista, duración…). */
export function sliderRow(id, label, min, max, step, value, fmt, onChange) {
  const f = el('div', 'field');
  f.innerHTML = `<label class="flabel" for="${id}">${esc(label)}: <output for="${id}">${esc(fmt(value))}</output></label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}">`;
  const r = f.querySelector('input'), o = f.querySelector('output');
  r.value = value;
  r.addEventListener('input', () => { const v = parseFloat(r.value); o.textContent = fmt(v); onChange(v); });
  f.set = (v) => { r.value = v; o.textContent = fmt(v); };
  return f;
}

export const fmtDeg = (v) => `${fNum(v, 0)}°`;
