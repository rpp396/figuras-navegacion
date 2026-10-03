// Convertir el SVG en imagen PNG y grabar animaciones como vídeo.

export async function svgToCanvas(svg, width, height, scale = 2, transparent = false) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('No se pudo convertir la figura en imagen'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const c = document.createElement('canvas');
  c.width = Math.round(width * scale);
  c.height = Math.round(height * scale);
  const g = c.getContext('2d');
  if (!transparent) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export const canvasToBlob = (c, type = 'image/png') =>
  new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), type));

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

/** Formato de vídeo que este navegador sabe grabar, o null. */
export function videoMime() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') return null;
  if (!HTMLCanvasElement.prototype.captureStream) return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/**
 * Graba en tiempo real: dibuja cada fotograma con frameAt(t) (que devuelve un SVG)
 * durante `duration` segundos y mantiene el último `hold` segundos.
 */
export async function recordVideo({ duration, hold = 0.8, width, height, scale = 1.5, frameAt, onProgress, signal }) {
  const mime = videoMime();
  if (!mime) throw new Error('sin-video');
  const even = (x) => Math.round(x / 2) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = even(width * scale);
  canvas.height = even(height * scale);
  const g = canvas.getContext('2d');
  const draw = async (t) => {
    const svg = frameAt(t);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  await draw(0);
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start(250);
  const t0 = performance.now();
  for (;;) {
    if (signal && signal.aborted) break;
    const t = (performance.now() - t0) / 1000;
    await draw(Math.min(t, duration));
    if (onProgress) onProgress(Math.min(1, t / (duration + hold)));
    if (t >= duration + hold) break;
    await nextFrame();
  }
  rec.stop();
  await stopped;
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' };
}
