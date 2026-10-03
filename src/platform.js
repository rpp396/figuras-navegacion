// Lo que depende de dónde se abre la app: guardar archivos y recordar ajustes.
// Dentro de claude.ai las descargas pasan por la capacidad `downloads`; en GitHub Pages
// o en un archivo local se usa un enlace de descarga normal.

let downloadsPromise;

function downloadsApi() {
  if (downloadsPromise === undefined) {
    const c = typeof window !== 'undefined' ? window.claude : undefined;
    downloadsPromise = c && typeof c.use === 'function' ? c.use('downloads').catch(() => null) : Promise.resolve(null);
  }
  return downloadsPromise;
}

/**
 * Ofrece un archivo al usuario.
 * @returns {Promise<{ok: boolean, code?: string}>}
 */
export async function saveFile(filename, data) {
  const api = await downloadsApi();
  if (api) {
    try {
      await api.save({ filename, data });
      return { ok: true };
    } catch (e) {
      return { ok: false, code: (e && e.code) || 'error' };
    }
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { ok: true };
  } catch {
    return { ok: false, code: 'unavailable' };
  }
}

/** Mensaje para el resultado de saveFile. */
export function saveMessage(res, okText) {
  if (res.ok) return okText;
  switch (res.code) {
    case 'declined': return 'Descarga cancelada';
    case 'rate_limited': return 'Espera un momento y vuelve a intentarlo';
    case 'rejected_extension':
    case 'extension_not_enabled': return 'Este tipo de archivo no se puede descargar aquí';
    case 'too_large': return 'El archivo es demasiado grande: prueba con menos resolución';
    default: return 'No se pudo descargar el archivo';
  }
}

/** Almacenamiento del navegador; si no está disponible, no hace nada. */
export const storage = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
  },
};
