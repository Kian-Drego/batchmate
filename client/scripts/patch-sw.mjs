/**
 * Post-build step (runs after `vite build`, which writes `dist/sw.js`).
 *
 * `registerType: 'autoUpdate'` activates a new service worker and claims open
 * tabs, but a tab that is still running an older bundle cannot reload itself:
 * its code predates any reload listener. The service worker, however, always
 * runs the newest deployed code, so we append handlers that force every open
 * tab to reload when an update lands.
 *
 * We never reload on a first-ever install: the new worker only flags a reload
 * when it is replacing an already-active worker, which is exactly the "you are
 * running a stale build" case.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MARKER = '/* batchmate:reload-clients */';
const SNIPPET = `
${MARKER}
self.addEventListener('install', (event) => {
  // An active worker already exists => this install replaces it (an update),
  // so open tabs are running an older build and should be reloaded.
  if (self.registration && self.registration.active) {
    event.waitUntil(caches.open('batchmate-sw-update').catch(() => {}));
  }
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (!(await caches.has('batchmate-sw-update'))) return; // first install — nothing to replace
    try { await self.clients.claim(); } catch {}
    const clients = await self.clients.matchAll({ type: 'window' });
    // Fire-and-forget: never block activation on the navigations themselves,
    // otherwise the worker stays "activating" and cannot serve the reload.
    clients.forEach((client) => client.navigate(client.url).catch(() => {}));
  })());
});
`;

const swPath = fileURLToPath(new URL('../dist/sw.js', import.meta.url));

let code;
try {
  code = readFileSync(swPath, 'utf8');
} catch {
  console.warn('[patch-sw] dist/sw.js not found — skipping (PWA disabled?)');
  process.exit(0);
}

if (code.includes(MARKER)) {
  console.log('[patch-sw] reload-clients handler already present');
} else {
  writeFileSync(swPath, code + SNIPPET);
  console.log('[patch-sw] appended reload-clients handler to dist/sw.js');
}
