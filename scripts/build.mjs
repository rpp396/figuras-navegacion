#!/usr/bin/env node
// Construye la aplicación en un solo archivo HTML, sin dependencias.
//
//   dist/index.html     documento completo (GitHub Pages, abrir con doble clic)
//   dist/artifact.html  solo el contenido de la página, para publicarla como artifact en claude.ai
//
// El empaquetador es mínimo a propósito: entiende `import { a, b as c } from './x.js'`,
// `import x from './x.js'`, `import * as x from './x.js'`, `export function|const|let|class`,
// `export default` y `export { a, b as c }`. Los módulos deben estar libres de ciclos.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function bundle(entry) {
  const ids = new Map();
  const visiting = new Set();
  const out = [];

  function visit(file) {
    if (ids.has(file)) return ids.get(file);
    if (visiting.has(file)) throw new Error(`Importación circular en ${relative(root, file)}`);
    visiting.add(file);
    let code = readFileSync(file, 'utf8');
    const deps = [];
    const dep = (spec) => {
      if (!spec.startsWith('.')) throw new Error(`Solo se admiten rutas relativas: "${spec}" en ${relative(root, file)}`);
      const id = visit(resolve(dirname(file), spec));
      deps.push(id);
      return id;
    };
    code = code.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm, (_, names, spec) => {
      const list = names.split(',').map((s) => s.trim()).filter(Boolean)
        .map((s) => { const m = s.match(/^(\w+)\s+as\s+(\w+)$/); return m ? `${m[1]}: ${m[2]}` : s; });
      return `const { ${list.join(', ')} } = ${dep(spec)};`;
    });
    code = code.replace(/^import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"];?[ \t]*$/gm, (_, name, spec) => `const ${name} = ${dep(spec)};`);
    code = code.replace(/^import\s+(\w+)\s+from\s*['"]([^'"]+)['"];?[ \t]*$/gm, (_, name, spec) => `const ${name} = ${dep(spec)}.default;`);
    if (/^import\s/m.test(code)) throw new Error(`Importación no admitida en ${relative(root, file)}`);

    const exported = [];
    code = code.replace(/^export\s+((?:async\s+)?function\*?\s+(\w+))/gm, (_, decl, name) => { exported.push(name); return decl; });
    code = code.replace(/^export\s+((?:const|let|var|class)\s+(\w+))/gm, (_, decl, name) => { exported.push(name); return decl; });
    code = code.replace(/^export\s+default\s+/gm, () => { exported.push('default: __default'); return 'const __default = '; });
    code = code.replace(/^export\s*\{([^}]*)\};?[ \t]*$/gm, (_, names) => {
      for (const s of names.split(',').map((x) => x.trim()).filter(Boolean)) {
        const m = s.match(/^(\w+)\s+as\s+(\w+)$/);
        exported.push(m ? `${m[2]}: ${m[1]}` : s);
      }
      return '';
    });
    if (/^export\s/m.test(code)) throw new Error(`Exportación no admitida en ${relative(root, file)}`);

    const id = `__m${ids.size}`;
    ids.set(file, id);
    visiting.delete(file);
    out.push(`// ${relative(root, file)}\nconst ${id} = (function () {\n${code}\nreturn { ${exported.join(', ')} };\n})();`);
    return id;
  }

  visit(resolve(root, entry));
  return `(function () {\n'use strict';\n${out.join('\n\n')}\n})();\n`;
}

function build() {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
  const js = bundle('src/main.js');
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
  const app = html.slice(html.indexOf('<!--APP-->') + '<!--APP-->'.length, html.indexOf('<!--/APP-->')).trim();

  const full = html
    .replace('<link rel="stylesheet" href="src/styles.css">', () => `<style>\n${css}</style>`)
    .replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${safeJs}</script>`)
    .replace('<!--APP-->\n', '')
    .replace('<!--/APP-->\n', '');

  // Para claude.ai: sin <!doctype>, <html>, <head> ni <body> (el visor los añade).
  const artifact = `${title}\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n${fonts}\n<style>\n${css}</style>\n${app}\n<script>\n${safeJs}</script>\n`;

  mkdirSync(resolve(root, 'dist'), { recursive: true });
  writeFileSync(resolve(root, 'dist/index.html'), full);
  writeFileSync(resolve(root, 'dist/artifact.html'), artifact);
  const kb = (s) => `${Math.round(Buffer.byteLength(s) / 1024)} KB`;
  console.log(`dist/index.html     ${kb(full)}`);
  console.log(`dist/artifact.html  ${kb(artifact)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
