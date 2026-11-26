// Copies the prototype (prototype/src) into the web app without changing its content.
// - strips the <script> wrappers so the files can be loaded as classic scripts
// - extracts the CSS from the shell
// - applies a few small, listed text patches (product name, provider names)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'prototype/src';
const OUT = 'public/legacy';
mkdirSync(OUT, { recursive: true });
mkdirSync('src/generated', { recursive: true });

const strip = (s) => s.replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '\n');

const content = ['c1_reading.js', 'c2_listening.js', 'c3_ws.js', 'c4_train.js', 'c5_listen2.js'];
for (const f of content) writeFileSync(`${OUT}/${f}`, strip(readFileSync(`${SRC}/${f}`, 'utf8')));

// Engine patches: each must match exactly once, otherwise the build fails.
const PATCHES = [
  [`h('span',{class:'mk'},'T'), 'TOEFL Trainer')`, `h('span',{class:'mk'},(window.APP_NAME||'T')[0]), window.APP_NAME||'Trainer')`],
  [`'Automatisch (Claude-Stimmen, sonst Browser)'`, `'Automatisch (Premium-Stimmen, sonst Browser)'`],
  [`eng==='claude'?'Claude-Stimmen (vier Stimmen)'`, `eng==='claude'?'Premium-Stimmen (vier Stimmen)'`],
  [`'Analyse von Claude'`, `'KI-Analyse'`],
];
let engine = strip(readFileSync(`${SRC}/p3_engine.js`, 'utf8'));
for (const [from, to] of PATCHES) {
  const n = engine.split(from).length - 1;
  if (n !== 1) throw new Error(`engine patch matched ${n} times: ${from}`);
  engine = engine.replace(from, to);
}
writeFileSync(`${OUT}/p3_engine.js`, engine);

const shell = readFileSync(`${SRC}/p1_shell.html`, 'utf8');
const css = shell.match(/<style>([\s\S]*?)<\/style>/)[1];
writeFileSync('src/generated/prototype.css', css);
console.log('prototype imported');
