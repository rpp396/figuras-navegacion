// Estado de la aplicación: valores por defecto, validación al importar y serialización.
// El estado es un objeto JSON simple; se guarda en el navegador y se exporta como .json.

export const STATE_VERSION = 2;
export const STORAGE_KEY = 'figuras-navegacion:v2';

export const DEFAULT_STYLE = {
  mode: 'color', // 'color' | 'bn'
  size: 'm', // 's' | 'm' | 'l'
  weight: 'n', // 'f' | 'n' | 'g'
  font: 'serif', // 'serif' | 'sans'
  notation: 'intl', // 'intl' | 'esp'
  dist: 'mi', // 'mi' (millas náuticas) | 'km'
  labels: true,
  values: true,
  words: false,
  curved: false,
  arrows: true,
  hidden: true,
  stepBanner: true,
};

const STYLE_CHOICES = {
  mode: ['color', 'bn'], size: ['s', 'm', 'l'], weight: ['f', 'n', 'g'], font: ['serif', 'sans'], notation: ['intl', 'esp'],
  dist: ['mi', 'km'],
};

export const ASTRO_TYPES = ['sol', 'estrella', 'punto'];

export function defaultFigureState(fig) {
  const params = {};
  for (const p of fig.params) params[p.k] = p.def;
  const opts = {};
  for (const [k, , d] of fig.opts) opts[k] = d;
  return {
    params,
    opts,
    view: fig.view ? { ...fig.view } : null,
    caption: '',
    astroType: fig.astro?.type || 'estrella',
    astroName: fig.astro?.name ?? '',
    offsets: {},
    texts: {},
    reveal: 0, // 0 = figura completa; n = mostrar hasta el paso n
  };
}

export function defaultState(figs) {
  const figures = {};
  for (const f of figs) figures[f.id] = defaultFigureState(f);
  return {
    version: STATE_VERSION,
    figure: figs.some((f) => f.id === 'horizontales') ? 'horizontales' : figs[0].id,
    figures,
    style: { ...DEFAULT_STYLE },
    export: { scale: 3, transparent: false },
    anim: { mode: 'pasos', param: '', from: 0, to: 360, duration: 10 },
  };
}

const num = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const clampNum = (x, a, b, d) => Math.max(a, Math.min(b, num(x, d)));

/** Mezcla un estado leído (localStorage o archivo) sobre los valores por defecto, validando todo. */
export function sanitizeState(raw, figs) {
  const s = defaultState(figs);
  if (!raw || typeof raw !== 'object' || raw.version !== STATE_VERSION) return s;
  if (figs.some((f) => f.id === raw.figure)) s.figure = raw.figure;
  if (raw.style && typeof raw.style === 'object') {
    for (const k of Object.keys(DEFAULT_STYLE)) {
      const v = raw.style[k];
      if (STYLE_CHOICES[k]) { if (STYLE_CHOICES[k].includes(v)) s.style[k] = v; } else if (typeof v === 'boolean') s.style[k] = v;
    }
  }
  if (raw.export) {
    if ([2, 3, 5].includes(raw.export.scale)) s.export.scale = raw.export.scale;
    s.export.transparent = !!raw.export.transparent;
  }
  if (raw.anim) {
    if (['pasos', 'girar', 'valor'].includes(raw.anim.mode)) s.anim.mode = raw.anim.mode;
    if (typeof raw.anim.param === 'string') s.anim.param = raw.anim.param;
    s.anim.from = clampNum(raw.anim.from, -360, 360, s.anim.from);
    s.anim.to = clampNum(raw.anim.to, -360, 360, s.anim.to);
    s.anim.duration = clampNum(raw.anim.duration, 3, 30, s.anim.duration);
  }
  for (const f of figs) {
    const src = raw.figures?.[f.id];
    if (!src || typeof src !== 'object') continue;
    const dst = s.figures[f.id];
    for (const p of f.params) dst.params[p.k] = clampNum(src.params?.[p.k], p.min, p.max, p.def);
    for (const [k] of f.opts) if (typeof src.opts?.[k] === 'boolean') dst.opts[k] = src.opts[k];
    if (f.view && src.view) {
      dst.view = { yaw: clampNum(src.view.yaw, -180, 180, f.view.yaw), pitch: clampNum(src.view.pitch, -60, 89, f.view.pitch) };
    }
    if (typeof src.caption === 'string') dst.caption = src.caption.slice(0, 300);
    if (ASTRO_TYPES.includes(src.astroType)) dst.astroType = src.astroType;
    if (typeof src.astroName === 'string') dst.astroName = src.astroName.slice(0, 40);
    if (src.offsets && typeof src.offsets === 'object') {
      for (const [id, o] of Object.entries(src.offsets)) {
        if (o && typeof o === 'object') dst.offsets[id] = { dx: clampNum(o.dx, -800, 800, 0), dy: clampNum(o.dy, -800, 800, 0) };
      }
    }
    if (src.texts && typeof src.texts === 'object') {
      for (const [id, t] of Object.entries(src.texts)) if (typeof t === 'string' && t) dst.texts[id] = t.slice(0, 80);
    }
    dst.reveal = Math.round(clampNum(src.reveal, 0, 20, 0));
  }
  return s;
}
