// Une una definición de figura con su estado y el estilo global, y devuelve el SVG.
// Es puro: lo usan la interfaz, las pruebas y el script de ejemplos.

import { Fig } from './draw.js';

/**
 * @param {object} fig   definición de la figura (src/figures/*.js)
 * @param {object} fs    estado de esa figura (params, opts, view, caption, astroType, astroName, offsets, texts)
 * @param {object} style estilo global
 * @param {object} [extra] {reveal, transparent, idPrefix, showLabels, noCaption, viewOverride, paramsOverride}
 */
export function renderFigure(fig, fs, style, extra = {}) {
  const view = fig.view ? { ...(extra.viewOverride || fs.view || fig.view) } : null;
  const params = extra.paramsOverride ? { ...fs.params, ...extra.paramsOverride } : fs.params;
  const F = new Fig({ style, view, reveal: extra.reveal || null, idPrefix: extra.idPrefix || 'f' });
  fig.draw(F, params, fs.opts, { astroType: fs.astroType, astroName: fs.astroName });
  let banner = '';
  if (extra.reveal && style.stepBanner && F.stepTitles[extra.reveal.upto]) {
    banner = `Paso ${extra.reveal.upto}. ${F.stepTitles[extra.reveal.upto]}`;
  }
  const out = F.toSVG({
    transparent: !!extra.transparent,
    caption: extra.noCaption ? '' : fs.caption,
    offsets: fs.offsets || {},
    texts: fs.texts || {},
    showLabels: extra.showLabels ?? style.labels !== false,
    banner,
  });
  const steps = [];
  for (let i = 1; i <= F.maxStep; i++) if (F.stepTitles[i]) steps.push({ n: i, title: F.stepTitles[i] });
  const seen = new Set();
  const labels = F.labelIndex.filter((l) => l.text && !seen.has(l.id) && seen.add(l.id));
  return { ...out, steps, labels };
}
