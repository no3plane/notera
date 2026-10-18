import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

function offlineApp(): Plugin {
  return {
    name: 'notera-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const publicFiles = (directory: string, prefix = ''): string[] =>
        readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
          const name = `${prefix}${entry.name}`;
          return entry.isDirectory()
            ? publicFiles(resolve(directory, entry.name), `${name}/`)
            : [name];
        });
      const files = publicFiles(resolve('public'));
      const hash = createHash('sha256');
      hash.update(readFileSync(resolve('index.html')));
      for (const item of Object.values(bundle)) {
        hash.update(item.fileName);
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const file of files) hash.update(readFileSync(resolve('public', file)));
      const version = hash.digest('hex').slice(0, 16);
      const urls = [...new Set(['index.html', ...Object.keys(bundle), ...files])].map(
        (file) => `./${file}`,
      );
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE = 'notera-${version}';
const URLS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('notera-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') {
      return (await cache.match('./index.html')) || fetch(event.request);
    }
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineApp()],
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173 },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], restoreMocks: true },
});
