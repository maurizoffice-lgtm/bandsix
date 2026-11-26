import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/jetbrains-mono';
import './generated/prototype.css';
import './theme.css';
import './landing.css';
import { createRuntime } from './runtime';

declare global {
  interface Window {
    APP_NAME: string;
    claude?: { use: (name: string) => Promise<unknown> };
  }
}

window.APP_NAME = 'bandsix';
const BASE = import.meta.env.BASE_URL;
const ENTERED_KEY = 'bandsix.entered';

const landing = document.getElementById('landing')!;
const appRoot = document.getElementById('appRoot')!;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.body.append(s);
  });
}

/** The app uses the dark look by default; the viewer can switch to light under "Mehr". */
export function applyTheme() {
  let t = 'dark';
  try { t = localStorage.getItem('bandsix.theme') || 'dark'; } catch { /* ignore */ }
  document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
}
window.addEventListener('bandsix:theme', applyTheme);

let started = false;
async function startApp() {
  landing.hidden = true;
  appRoot.hidden = false;
  applyTheme();
  document.body.classList.add('in-app');
  try { localStorage.setItem(ENTERED_KEY, '1'); } catch { /* private mode */ }
  if (location.hash !== '#dashboard') history.replaceState(null, '', '#dashboard');
  window.scrollTo(0, 0);
  if (started) return;
  started = true;
  window.claude = createRuntime();
  const files = ['c1_reading.js', 'c2_listening.js', 'c3_ws.js', 'c4_train.js', 'c5_listen2.js', 'p3_engine.js'];
  // Cache-bust with the build id so a new deploy is picked up immediately.
  const v = `?v=${__BUILD_ID__}`;
  await Promise.all([
    ...files.map((f) => loadScript(`${BASE}legacy/${f}${v}`)),
    loadScript(`${BASE}ext/app-ext.js${v}`),
  ]);
  window.scrollTo(0, 0);
}

function showLanding() {
  appRoot.hidden = true;
  document.documentElement.removeAttribute('data-theme');
  landing.hidden = false;
  document.body.classList.remove('in-app');
}

document.querySelectorAll<HTMLElement>('[data-enter]').forEach((b) => b.addEventListener('click', () => void startApp()));
document.querySelectorAll<HTMLAnchorElement>('.logo').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    if (started) return; // inside the app the logo is handled by the app bar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }),
);
window.addEventListener('bandsix:landing', () => { history.replaceState(null, '', location.pathname); showLanding(); window.scrollTo(0, 0); });

/**
 * Browsers (Safari in particular) may keep serving an old index.html for a while after a deploy.
 * Compare with the live build id and, if it differs, load the page under a fresh URL once.
 */
async function ensureLatest() {
  if (import.meta.env.DEV) return;
  try {
    const r = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { id } = (await r.json()) as { id?: string };
    if (!id || id === __BUILD_ID__) return;
    const guard = `bandsix.reloaded.${id}`;
    if (sessionStorage.getItem(guard)) return;
    sessionStorage.setItem(guard, '1');
    location.replace(`${location.pathname}?v=${id}${location.hash}`);
  } catch { /* offline or storage blocked: keep the current version */ }
}
void ensureLatest();

let entered = false;
try { entered = localStorage.getItem(ENTERED_KEY) === '1'; } catch { /* ignore */ }
if (location.hash === '#dashboard' || location.hash === '#app' || (entered && location.hash !== '#start')) void startApp();
else showLanding();
