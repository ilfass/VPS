#!/usr/bin/env node
/**
 * Auditoría rápida del libro:
 * - Lista hojas /vivos y verifica que tengan modo en js/main.js + archivo en js/modes/
 * - Lista árbol /memoria
 * - Genera un reporte Markdown en anonuevo/AUDITORIA_LIBRO.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VIVOS_DIR = path.join(ROOT, 'vivos');
const MEMORIA_DIR = path.join(ROOT, 'memoria');
const MAIN_JS = path.join(ROOT, 'js', 'main.js');
const MODES_DIR = path.join(ROOT, 'js', 'modes');
const OUT_MD = path.join(ROOT, 'AUDITORIA_LIBRO.md');

function safeRead(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function listDirs(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
  } catch {
    return [];
  }
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function parseModes(mainJsText) {
  // extracción simple: 'nombre': './modes/nombre.js'
  const re = /'([a-z0-9_-]+)'\s*:\s*'\.\/modes\/([^']+)\.js'/gi;
  const modes = new Map();
  let m;
  while ((m = re.exec(mainJsText)) !== null) {
    modes.set(m[1], m[2]);
  }
  return modes;
}

function treeSummary(baseDir, maxDepth = 4) {
  const lines = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.'));
    const dirs = items.filter(d => d.isDirectory()).map(d => d.name).sort();
    dirs.forEach(name => {
      const rel = path.relative(baseDir, path.join(dir, name));
      lines.push(`${'  '.repeat(depth)}- ${rel}/`);
      walk(path.join(dir, name), depth + 1);
    });
  }
  try { walk(baseDir, 0); } catch { }
  return lines;
}

function main() {
  const mainJs = safeRead(MAIN_JS) || '';
  const modes = parseModes(mainJs);
  const vivos = listDirs(VIVOS_DIR);
  const memoria = exists(MEMORIA_DIR) ? treeSummary(MEMORIA_DIR, 5) : [];

  const vivosChecks = vivos.map((name) => {
    const htmlOk = exists(path.join(VIVOS_DIR, name, 'index.html'));
    const modeInMain = modes.has(name);
    const modeFile = path.join(MODES_DIR, `${name}.js`);
    const modeFileOk = exists(modeFile);
    const status = (htmlOk && modeInMain && modeFileOk) ? 'OK' : 'WARN';
    const problems = [
      !htmlOk ? 'no index.html' : null,
      !modeInMain ? 'no está en MODES (js/main.js)' : null,
      !modeFileOk ? 'falta js/modes/<modo>.js' : null
    ].filter(Boolean);
    return { name, status, problems };
  });

  const vivosOk = vivosChecks.filter(x => x.status === 'OK');
  const vivosWarn = vivosChecks.filter(x => x.status !== 'OK');

  const now = new Date().toISOString();
  const md = [];
  md.push(`# Auditoría del Libro — ${now}`);
  md.push('');
  md.push('## VIVOS (Streaming)');
  md.push('');
  md.push(`Total hojas /vivos: **${vivos.length}** — OK: **${vivosOk.length}** — WARN: **${vivosWarn.length}**`);
  md.push('');
  md.push('### Estado por hoja');
  md.push('');
  md.push('| Hoja | Estado | Observaciones |');
  md.push('|---|---|---|');
  vivosChecks.forEach(x => {
    md.push(`| \`${x.name}\` | **${x.status}** | ${x.problems.length ? x.problems.join(', ') : '—'} |`);
  });
  md.push('');
  md.push('## MEMORIA (Archivo / Libro)');
  md.push('');
  if (!memoria.length) {
    md.push('_No se encontró carpeta `memoria/` o está vacía._');
  } else {
    md.push('Estructura (resumen):');
    md.push('');
    md.push('```');
    md.push(...memoria);
    md.push('```');
  }
  md.push('');
  md.push('## Observación técnica');
  md.push('');
  md.push('- La continuidad narrativa hoy depende de prompts por hoja; conviene centralizar guion y memoria en el backend (control-server).');
  md.push('');

  fs.writeFileSync(OUT_MD, md.join('\n'), 'utf8');
  console.log(`✅ Auditoría generada: ${OUT_MD}`);
}

main();

