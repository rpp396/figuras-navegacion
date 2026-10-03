// Interfaz de la aplicación. Todo el estado vive en `state` (ver core/state.js);
// cada cambio llama a render() y a commit() (historial para deshacer + autoguardado).

import { FIGURES, GROUPS, byId } from './figures/index.js';
import { renderFigure } from './core/render.js';
import { sanitizeState, defaultFigureState, STORAGE_KEY, STATE_VERSION } from './core/state.js';
import { NOTATION } from './core/format.js';
import { clamp, ease } from './core/math.js';
import { saveFile, saveMessage, storage } from './platform.js';
import { svgToCanvas, canvasToBlob, recordVideo, videoMime } from './ui/exporter.js';
import { makeZip } from './ui/zip.js';
import { el, esc, angleField, numberField, dayField, segGroup, checkRow, sliderRow, fmtDeg } from './ui/controls.js';

const $ = (id) => document.getElementById(id);

// ---------- estado e historial ----------
let state = loadState();
let last = null; // último resultado de renderFigure
let anim = null; // animación o grabación en curso
const hist = { past: [], future: [], last: JSON.stringify(state), timer: 0 };

function loadState() {
  let raw = null;
  try { raw = JSON.parse(storage.get(STORAGE_KEY) || 'null'); } catch { raw = null; }
  return sanitizeState(raw, FIGURES);
}
const fig = () => byId(state.figure);
const fst = () => state.figures[state.figure];

function commit(now = false) {
  clearTimeout(hist.timer);
  const run = () => {
    const s = JSON.stringify(state);
    if (s === hist.last) return;
    hist.past.push(hist.last);
    if (hist.past.length > 120) hist.past.shift();
    hist.future.length = 0;
    hist.last = s;
    storage.set(STORAGE_KEY, s);
    updateUndo();
  };
  if (now) run(); else hist.timer = setTimeout(run, 350);
}

function restore(json) {
  state = JSON.parse(json);
  hist.last = json;
  storage.set(STORAGE_KEY, json);
  rebuild();
}
function undo() {
  commit(true);
  if (!hist.past.length) return;
  hist.future.push(hist.last);
  restore(hist.past.pop());
  toast('Cambio deshecho');
}
function redo() {
  commit(true);
  if (!hist.future.length) return;
  hist.past.push(hist.last);
  restore(hist.future.pop());
  toast('Cambio rehecho');
}
function updateUndo() {
  $('bUndo').disabled = !hist.past.length && JSON.stringify(state) === hist.last;
  $('bRedo').disabled = !hist.future.length;
}

// ---------- dibujo ----------
function renderMain(extra = {}) {
  const s = fst();
  const reveal = s.reveal ? { upto: s.reveal, frac: 1 } : null;
  return renderFigure(fig(), s, state.style, { reveal, idPrefix: 'm', ...extra });
}

function render() {
  last = renderMain();
  if (fst().reveal > last.steps.length) { fst().reveal = 0; last = renderMain(); }
  if (!anim) $('sheet').innerHTML = last.svg;
  updateDatos();
  updatePasos();
  updateHint();
  if ($('txtbox').open) buildTextList();
  updateUndo();
}

function change(mutator, { panel = false } = {}) {
  mutator();
  if (panel) buildPanel();
  render();
  commit();
}

// ---------- mensajes ----------
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- panel izquierdo ----------
function buildPicker() {
  const box = $('picker');
  box.innerHTML = '';
  const style = { ...state.style, labels: false, weight: 'g', mode: 'color' };
  for (const g of GROUPS) {
    const figs = FIGURES.filter((f) => f.group === g.id);
    if (!figs.length) continue;
    box.appendChild(el('h3', 'group', esc(g.name)));
    const grid = el('div', 'tpls');
    for (const f of figs) {
      const b = el('button', 'tpl');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(f.id === state.figure));
      b.title = f.desc;
      const thumb = renderFigure(f, defaultFigureState(f), style, { idPrefix: 't' + f.id, noCaption: true }).svg;
      b.innerHTML = `<span class="thumb" aria-hidden="true">${thumb}</span><span class="tname">${esc(f.name)}</span>`;
      b.addEventListener('click', () => {
        if (state.figure === f.id) return;
        stopAnim(false);
        state.figure = f.id;
        [...box.querySelectorAll('.tpl')].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        buildPanel();
        buildPanes();
        render();
        commit();
      });
      grid.appendChild(b);
    }
    box.appendChild(grid);
  }
}

function buildPanel() {
  const f = fig(), s = fst(), N = NOTATION[state.style.notation];
  $('figdesc').textContent = f.desc;

  const P = $('params');
  P.innerHTML = '';
  for (const def of f.params) {
    const sym = def.sym ? N[def.sym] : '';
    const onChange = (v) => { s.params[def.k] = v; render(); commit(); };
    const node = def.kind === 'number' ? numberField(def, s.params[def.k], sym, onChange)
      : def.kind === 'day' ? dayField(def, s.params[def.k], onChange)
      : angleField(def, s.params[def.k], sym, onChange);
    P.appendChild(node);
  }
  if (f.astro) {
    P.appendChild(segGroup('Cómo se dibuja el astro', [['sol', 'Sol'], ['estrella', 'Estrella'], ['punto', 'Punto']], s.astroType, (v) => {
      change(() => {
        const generic = ['Sol', 'Astro', 'Estrella', ''];
        s.astroType = v;
        if (generic.includes(s.astroName)) s.astroName = v === 'sol' ? 'Sol' : f.astro.name === 'Sol' ? 'Astro' : f.astro.name;
        $('astroName').value = s.astroName;
      });
    }));
    const nf = el('div', 'field');
    nf.innerHTML = `<label class="flabel" for="astroName">Nombre junto al astro</label><input type="text" id="astroName" placeholder="Por ejemplo: Sirio">`;
    const inp = nf.querySelector('input');
    inp.value = s.astroName;
    inp.addEventListener('input', () => { s.astroName = inp.value; render(); commit(); });
    P.appendChild(nf);
  }
  if (f.view) {
    P.appendChild(sliderRow('viewYaw', 'Girar la esfera', -180, 180, 1, s.view.yaw, fmtDeg, (v) => { s.view.yaw = v; render(); commit(); }));
    P.appendChild(sliderRow('viewPitch', 'Inclinar la vista', -60, 89, 1, s.view.pitch, fmtDeg, (v) => { s.view.pitch = v; render(); commit(); }));
  }

  const O = $('opts');
  O.innerHTML = '';
  for (const [k, label] of f.opts) O.appendChild(checkRow(label, s.opts[k], (c) => change(() => { s.opts[k] = c; })));

  const cap = $('caption');
  cap.value = s.caption;
  cap.placeholder = 'Por ejemplo: Figura 1. ' + f.caption;
}

function buildTextList() {
  const box = $('txtlist'), s = fst();
  box.innerHTML = '';
  for (const L of last.labels) {
    const f = el('div', 'field tight');
    const inp = el('input');
    inp.type = 'text';
    inp.id = 'txt-' + L.id;
    inp.placeholder = L.text;
    inp.value = s.texts[L.id] || '';
    inp.setAttribute('aria-label', 'Texto del rótulo ' + L.text);
    inp.addEventListener('input', () => {
      if (inp.value) s.texts[L.id] = inp.value; else delete s.texts[L.id];
      last = renderMain();
      $('sheet').innerHTML = last.svg;
      commit();
    });
    f.appendChild(inp);
    box.appendChild(f);
  }
  const b = el('button', 'btn quiet', 'Volver a los textos automáticos');
  b.type = 'button';
  b.addEventListener('click', () => change(() => { s.texts = {}; }, { panel: false }) || buildTextList());
  box.appendChild(b);
}

const PRESETS = {
  ejemplo: { mode: 'bn', font: 'sans', words: true, values: false, arrows: true, curved: true, hidden: false, labels: true },
  tecnico: { mode: 'color', font: 'serif', words: false, values: true, arrows: true, curved: false, hidden: true, labels: true },
  imprenta: { mode: 'bn', font: 'serif', words: false, values: true, arrows: true, curved: false, hidden: true, labels: true, weight: 'g' },
};

function buildAspect() {
  const A = $('aspect'), st = state.style;
  A.innerHTML = '';
  const pr = el('div', 'field');
  pr.appendChild(el('span', 'sublabel', 'Estilos rápidos'));
  const pg = el('div', 'seg');
  for (const [k, t] of [['ejemplo', 'Rótulos con palabras, en blanco y negro'], ['tecnico', 'Técnico, en color'], ['imprenta', 'Imprenta en blanco y negro']]) {
    const b = el('button', null, esc(t));
    b.type = 'button';
    b.addEventListener('click', () => {
      change(() => {
        Object.assign(state.style, PRESETS[k]);
        if (k === 'ejemplo') state.figures.horizontales.astroType = 'punto';
      }, { panel: true });
      buildAspect();
      toast('Estilo aplicado');
    });
    pg.appendChild(b);
  }
  pr.appendChild(pg);
  A.appendChild(pr);
  const seg = (label, key, opts, panel = false) => A.appendChild(segGroup(label, opts, st[key], (v) => change(() => { st[key] = v; }, { panel })));
  seg('Impresión', 'mode', [['color', 'En color'], ['bn', 'Blanco y negro']]);
  seg('Tamaño de letra', 'size', [['s', 'Pequeña'], ['m', 'Mediana'], ['l', 'Grande']]);
  seg('Grosor de las líneas', 'weight', [['f', 'Fino'], ['n', 'Normal'], ['g', 'Grueso']]);
  seg('Tipo de letra', 'font', [['serif', 'Clásica, de libro'], ['sans', 'Sin remates']]);
  seg('Rótulos de los arcos', 'words', [[false, 'Símbolos (a, Z, φ…)'], [true, 'Palabras (Altura, Azimut…)']]);
  seg('Notación de los símbolos', 'notation', [['intl', 'φ λ δ t'], ['esp', 'l L d hL (española)']], true);
  for (const [key, label] of [['labels', 'Mostrar rótulos'], ['values', 'Mostrar valores en grados'], ['curved', 'Rótulos que siguen las curvas'], ['arrows', 'Flechas en los arcos'], ['hidden', 'Líneas ocultas a trazos']]) {
    A.appendChild(checkRow(label, st[key], (c) => change(() => { st[key] = c; })));
  }
}

// ---------- pestañas de la derecha ----------
function buildPanes() {
  buildAnimPane();
  $('pane-pasos').dataset.sig = '';
  $('pane-datos').dataset.sig = '';
}

function updateDatos() {
  const pane = $('pane-datos'), f = fig(), s = fst();
  const rows = f.compute ? f.compute(s.params, s.opts) : [];
  const html = `<table class="datos"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    <div class="row-actions"><button type="button" class="btn quiet" id="bCopy">Copiar los datos</button></div>
    <p class="help">Cálculos hechos con los valores de la figura, útiles para comprobar el texto del libro. No sustituyen al almanaque ni a las tablas.</p>`;
  if (pane.dataset.sig === html) return;
  pane.dataset.sig = html;
  pane.innerHTML = html;
  $('bCopy').addEventListener('click', () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    try {
      navigator.clipboard.writeText(text).then(() => toast('Datos copiados'), () => toast('No se pudo copiar: selecciona la tabla y cópiala'));
    } catch { toast('No se pudo copiar: selecciona la tabla y cópiala'); }
  });
}

function updatePasos() {
  const pane = $('pane-pasos'), s = fst(), steps = last.steps;
  const sig = JSON.stringify([state.figure, steps, s.reveal, state.style.stepBanner]);
  if (pane.dataset.sig === sig) return;
  pane.dataset.sig = sig;
  pane.innerHTML = `
    <p class="lead">Esta figura se construye en ${steps.length} pasos. Elige hasta qué paso quieres verla: las descargas guardan lo que ves.</p>
    <ol class="steps">${steps.map((st) => `<li><button type="button" data-step="${st.n}" aria-pressed="${s.reveal === st.n}">${esc(st.title)}</button></li>`).join('')}</ol>
    <div class="row-actions">
      <button type="button" class="btn quiet" id="bPrev">Paso anterior</button>
      <button type="button" class="btn quiet" id="bNext">Paso siguiente</button>
      <button type="button" class="btn quiet" id="bFull" aria-pressed="${!s.reveal}">Figura completa</button>
    </div>
    <div id="bannerRow"></div>
    <div class="row-actions"><button type="button" class="btn" id="bZip">Descargar todos los pasos (ZIP con un PNG por paso)</button></div>`;
  const setReveal = (n) => change(() => { s.reveal = n; });
  pane.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => setReveal(+b.dataset.step)));
  $('bPrev').addEventListener('click', () => setReveal(s.reveal === 0 ? Math.max(1, steps.length - 1) : Math.max(1, s.reveal - 1)));
  $('bNext').addEventListener('click', () => setReveal(s.reveal === 0 ? 1 : s.reveal >= steps.length ? 0 : s.reveal + 1));
  $('bFull').addEventListener('click', () => setReveal(0));
  $('bannerRow').appendChild(checkRow('Escribir el título del paso en la imagen', state.style.stepBanner, (c) => change(() => { state.style.stepBanner = c; })));
  $('bZip').addEventListener('click', exportSteps);
}

function updateHint() {
  const f = fig(), s = fst();
  let h = f.view ? 'Arrastra la esfera para girarla. Arrastra un rótulo para moverlo.' : 'Arrastra un rótulo para moverlo.';
  if (s.reveal) h += ` Ahora ves hasta el paso ${s.reveal} de ${last.steps.length}.`;
  $('hint').textContent = h;
}

function buildAnimPane() {
  const pane = $('pane-anim'), f = fig(), a = state.anim;
  if (a.mode === 'girar' && !f.view) a.mode = 'pasos';
  if (!f.params.some((p) => p.k === a.param)) {
    const pre = f.animations?.[0];
    a.param = pre ? pre.param : f.params[0].k;
    if (pre) { a.from = pre.from; a.to = pre.to; } else { a.from = f.params[0].min; a.to = f.params[0].max; }
  }
  pane.innerHTML = '';
  pane.appendChild(segGroup('Qué se anima', [['pasos', 'Construir la figura paso a paso'], ['girar', 'Girar la esfera', !f.view], ['valor', 'Cambiar un valor']], a.mode, (v) => {
    state.anim.mode = v; commit(); buildAnimPane();
  }));
  if (a.mode === 'valor') {
    const box = el('div', 'field');
    const opts = f.params.map((p) => `<option value="${p.k}"${p.k === a.param ? ' selected' : ''}>${esc(p.label)}</option>`).join('');
    const def = f.params.find((p) => p.k === a.param);
    const unit = def.kind === 'number' ? def.unit || '' : def.kind === 'day' ? 'días' : '°';
    box.innerHTML = `
      <label class="flabel" for="animParam">Valor que cambia</label>
      <select id="animParam">${opts}</select>
      <div class="dmrow spaced">
        <label for="animFrom">Desde</label><input type="number" id="animFrom" step="0.5" class="wide">
        <label for="animTo">hasta</label><input type="number" id="animTo" step="0.5" class="wide"><span class="unit">${esc(unit)}</span>
      </div>`;
    pane.appendChild(box);
    const sel = box.querySelector('#animParam'), fr = box.querySelector('#animFrom'), to = box.querySelector('#animTo');
    fr.value = a.from; to.value = a.to;
    sel.addEventListener('change', () => {
      const d = f.params.find((p) => p.k === sel.value);
      a.param = d.k; a.from = d.min; a.to = d.max; commit(); buildAnimPane();
    });
    const num = (inp, key) => inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (Number.isFinite(v)) { a[key] = v; commit(); } });
    num(fr, 'from'); num(to, 'to');
    if (f.animations?.length) {
      const pres = el('div', 'seg');
      pres.setAttribute('aria-label', 'Animaciones sugeridas');
      for (const pa of f.animations) {
        const b = el('button', null, esc(pa.label));
        b.type = 'button';
        b.addEventListener('click', () => { Object.assign(a, { param: pa.param, from: pa.from, to: pa.to }); commit(); buildAnimPane(); });
        pres.appendChild(b);
      }
      const wrap = el('div', 'field');
      wrap.appendChild(el('span', 'sublabel', 'Sugerencias'));
      wrap.appendChild(pres);
      pane.appendChild(wrap);
    }
  }
  pane.appendChild(sliderRow('animDur', 'Duración', 3, 30, 1, a.duration, (v) => `${v} s`, (v) => { a.duration = v; commit(); }));
  const mime = videoMime();
  const row = el('div', 'row-actions');
  row.innerHTML = `
    <button type="button" class="btn primary" id="bPlay">Reproducir</button>
    <button type="button" class="btn" id="bStop" disabled>Detener</button>
    <button type="button" class="btn" id="bRec"${mime ? '' : ' disabled'}>Grabar vídeo</button>`;
  pane.appendChild(row);
  const prog = el('progress');
  prog.id = 'animProg'; prog.max = 1; prog.value = 0;
  prog.setAttribute('aria-label', 'Progreso de la animación');
  pane.appendChild(prog);
  pane.appendChild(el('p', 'help', mime
    ? `El vídeo (${mime.startsWith('video/mp4') ? 'MP4' : 'WebM'}) se graba mientras se reproduce, así que tarda lo mismo que la animación. Incluye el pie de figura y, en el modo paso a paso, el título de cada paso si lo tienes activado.`
    : 'Este navegador no permite grabar vídeo. Puedes reproducir la animación o descargar los pasos como imágenes.'));
  $('bPlay').addEventListener('click', play);
  $('bStop').addEventListener('click', () => stopAnim(true));
  $('bRec').addEventListener('click', record);
}

// ---------- animación ----------
function frameExtra(t) {
  const a = state.anim, f = fig(), s = fst();
  const u = clamp(t / a.duration, 0, 1);
  if (a.mode === 'pasos') {
    const n = Math.max(1, last.steps.length);
    const uu = Math.min(1, u / 0.9);
    let k = Math.min(n, Math.floor(uu * n) + 1);
    let fr = uu * n - (k - 1);
    if (uu >= 1) { k = n; fr = 1; }
    return { reveal: { upto: k, frac: ease(clamp(fr / 0.8, 0, 1)) } };
  }
  if (a.mode === 'girar' && f.view) {
    let yaw = s.view.yaw + 360 * u;
    yaw = ((yaw + 180) % 360 + 360) % 360 - 180;
    return { viewOverride: { yaw, pitch: s.view.pitch } };
  }
  const def = f.params.find((p) => p.k === a.param) || f.params[0];
  return { paramsOverride: { [def.k]: clamp(a.from + (a.to - a.from) * u, def.min, def.max) } };
}

function setAnimUi(running) {
  if (!$('bPlay')) return;
  $('bPlay').disabled = running;
  $('bRec').disabled = running || !videoMime();
  $('bStop').disabled = !running;
}

function play() {
  stopAnim(false);
  const t0 = performance.now();
  anim = { raf: 0 };
  setAnimUi(true);
  const D = state.anim.duration;
  const tick = () => {
    if (!anim) return;
    const t = (performance.now() - t0) / 1000;
    $('sheet').innerHTML = renderMain(frameExtra(Math.min(t, D))).svg;
    const p = $('animProg');
    if (p) p.value = Math.min(1, t / D);
    if (t >= D + 0.8) { stopAnim(true); return; }
    anim.raf = requestAnimationFrame(tick);
  };
  anim.raf = requestAnimationFrame(tick);
}

function stopAnim(redraw = true) {
  if (!anim) return;
  cancelAnimationFrame(anim.raf);
  if (anim.ctrl) anim.ctrl.abort();
  anim = null;
  setAnimUi(false);
  if (redraw) render();
}

async function record() {
  stopAnim(false);
  const ctrl = new AbortController();
  anim = { raf: 0, ctrl };
  setAnimUi(true);
  toast('Grabando el vídeo…');
  const first = renderMain(frameExtra(0));
  try {
    const { blob, ext } = await recordVideo({
      duration: state.anim.duration,
      width: first.width,
      height: first.height,
      scale: 1.5,
      signal: ctrl.signal,
      frameAt: (t) => { const svg = renderMain(frameExtra(t)).svg; $('sheet').innerHTML = svg; return svg; },
      onProgress: (p) => { const el2 = $('animProg'); if (el2) el2.value = p; },
    });
    if (ctrl.signal.aborted) toast('Grabación detenida');
    else toast(saveMessage(await saveFile(`animacion-${fig().id}.${ext}`, blob), 'Vídeo guardado'));
  } catch {
    toast('No se pudo grabar el vídeo en este navegador');
  } finally {
    anim = null;
    setAnimUi(false);
    render();
  }
}

// ---------- exportar ----------
const fileBase = () => `figura-${fig().id}${fst().reveal ? '-paso-' + fst().reveal : ''}`;

async function exportPng() {
  const btn = $('bPng');
  btn.disabled = true;
  try {
    const r = renderMain({ transparent: state.export.transparent });
    const c = await svgToCanvas(r.svg, r.width, r.height, state.export.scale, state.export.transparent);
    const blob = await canvasToBlob(c);
    toast(saveMessage(await saveFile(fileBase() + '.png', blob), 'Imagen guardada'));
  } catch {
    toast('No se pudo crear la imagen');
  } finally { btn.disabled = false; }
}

async function exportSvg() {
  const r = renderMain({ transparent: state.export.transparent });
  toast(saveMessage(await saveFile(fileBase() + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + r.svg), 'SVG guardado'));
}

async function exportSteps() {
  const btn = $('bZip');
  if (btn) btn.disabled = true;
  toast('Preparando las imágenes de cada paso…');
  try {
    const files = [];
    for (const st of last.steps) {
      const r = renderMain({ reveal: { upto: st.n, frac: 1 }, transparent: state.export.transparent });
      const c = await svgToCanvas(r.svg, r.width, r.height, state.export.scale, state.export.transparent);
      const b = await canvasToBlob(c);
      files.push({ name: `figura-${fig().id}-paso-${st.n}.png`, data: new Uint8Array(await b.arrayBuffer()) });
    }
    toast(saveMessage(await saveFile(`figura-${fig().id}-pasos.zip`, makeZip(files)), 'Pasos guardados'));
  } catch {
    toast('No se pudieron preparar los pasos');
  } finally { if (btn) btn.disabled = false; }
}

async function exportJson() {
  commit(true);
  const json = JSON.stringify({ ...state, version: STATE_VERSION }, null, 2);
  toast(saveMessage(await saveFile('figuras-navegacion-ajustes.json', json), 'Ajustes guardados'));
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(String(reader.result));
      if (!raw || raw.version !== STATE_VERSION) { toast('Ese archivo no contiene ajustes de esta aplicación'); return; }
      commit(true);
      state = sanitizeState(raw, FIGURES);
      rebuild();
      commit(true);
      toast('Ajustes cargados');
    } catch { toast('No se pudo leer el archivo: debe ser un .json guardado desde aquí'); }
  };
  reader.readAsText(file);
}

// ---------- arrastrar: girar la esfera o mover rótulos ----------
function setupDrag() {
  const sheet = $('sheet');
  let drag = null;
  sheet.addEventListener('pointerdown', (e) => {
    if (anim) return;
    const svg = sheet.querySelector('svg');
    if (!svg) return;
    const scale = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
    const t = e.target.closest && e.target.closest('[data-lid]');
    const s = fst();
    if (t && state.style.labels) {
      const id = t.getAttribute('data-lid');
      const o = s.offsets[id] || { dx: 0, dy: 0 };
      drag = { mode: 'label', id, x0: e.clientX, y0: e.clientY, o0: { ...o }, scale };
    } else if (s.view) {
      drag = { mode: 'rot', x0: e.clientX, y0: e.clientY, yaw0: s.view.yaw, pitch0: s.view.pitch };
    } else return;
    sheet.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const s = fst();
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (drag.mode === 'label') {
      s.offsets[drag.id] = { dx: drag.o0.dx + dx * drag.scale, dy: drag.o0.dy + dy * drag.scale };
    } else {
      let y = drag.yaw0 - dx * 0.45;
      y = ((y + 180) % 360 + 360) % 360 - 180;
      s.view.yaw = Math.round(y);
      s.view.pitch = Math.round(clamp(drag.pitch0 + dy * 0.35, -60, 89));
      $('viewYaw')?.closest('.field')?.set?.(s.view.yaw);
      $('viewPitch')?.closest('.field')?.set?.(s.view.pitch);
    }
    last = renderMain();
    sheet.innerHTML = last.svg;
  });
  const end = () => { if (drag) { drag = null; render(); commit(); } };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}

// ---------- pestañas ----------
function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(n);
      n.focus();
    });
  });
  select(tabs[0]);
}

// ---------- arranque ----------
function rebuild() {
  stopAnim(false);
  buildPicker();
  buildPanel();
  buildAspect();
  buildPanes();
  $('pngRes').value = String(state.export.scale);
  $('pngTr').checked = state.export.transparent;
  render();
}

function init() {
  $('caption').addEventListener('input', (e) => { fst().caption = e.target.value; render(); commit(); });
  $('txtbox').addEventListener('toggle', () => { if ($('txtbox').open) buildTextList(); });
  $('bPng').addEventListener('click', exportPng);
  $('bSvg').addEventListener('click', exportSvg);
  $('pngRes').addEventListener('change', (e) => { state.export.scale = +e.target.value; commit(); });
  $('pngTr').addEventListener('change', (e) => { state.export.transparent = e.target.checked; commit(); });
  $('bUndo').addEventListener('click', undo);
  $('bRedo').addEventListener('click', redo);
  $('bSaveJson').addEventListener('click', () => { $('more').open = false; exportJson(); });
  $('bLoadJson').addEventListener('click', () => { $('more').open = false; $('fileJson').click(); });
  $('fileJson').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ''; });
  $('bLabels').addEventListener('click', () => { $('more').open = false; change(() => { fst().offsets = {}; }); toast('Rótulos en su sitio original'); });
  $('bReset').addEventListener('click', () => {
    $('more').open = false;
    change(() => { const cap = fst().caption; state.figures[state.figure] = defaultFigureState(fig()); fst().caption = cap; }, { panel: true });
    toast('Valores iniciales de esta figura');
  });
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'Escape' && anim) stopAnim(true);
  });
  document.addEventListener('click', (e) => { const m = $('more'); if (m.open && !m.contains(e.target)) m.open = false; });
  setupDrag();
  setupTabs();
  rebuild();
  hist.last = JSON.stringify(state);
  updateUndo();
}

init();
