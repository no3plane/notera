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
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const publicFiles = (directory: string, prefix = ''): string[] =>
          readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
            const name = `${prefix}${entry.name}`;
            return entry.isDirectory()
              ? publicFiles(resolve(directory, entry.name), `${name}/`)
              : [name];
          });
        const files = publicFiles(resolve('public'));
        const index = bundle['index.html'];
        if (index?.type !== 'asset' || typeof index.source !== 'string') {
          this.error('The offline build requires a generated index.html.');
        }
        const assets = Object.keys(bundle).filter((file) => file !== 'index.html');
        const urls = [...new Set([...assets, ...files])].map((file) => `./${file}`);
        const source = `const URLS = ${JSON.stringify(urls)};
const OFFLINE_HTML = ${JSON.stringify(index.source)};
const ASSET_PATH = new URL('./assets/', self.registration.scope).pathname;
const NAVIGATION_TIMEOUT_MS = 1500;

const otherVersions = async () => (await caches.keys()).filter(
  key => key.startsWith('notera-') && key !== CACHE
);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const alreadyCached = await caches.has(CACHE);
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })));
    } catch (error) {
      if (!alreadyCached) await caches.delete(CACHE);
      throw error;
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Open tabs from the previous release can still request their lazy-loaded chunks.
    const olderVersions = (await otherVersions()).slice(0, -1);
    await Promise.all(olderVersions.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigate(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    const response = await fetch(request, { cache: 'no-cache', signal: controller.signal });
    if (response.status < 500) return response;
  } catch {
    // The request failed or exceeded the time budget.
  } finally {
    clearTimeout(timeout);
  }
  return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function loadResource(request, url) {
  const cached = await caches.match(request, { cacheName: CACHE });
  if (cached) return cached;
  if (url.pathname.startsWith(ASSET_PATH)) {
    const previous = (await otherVersions()).at(-1);
    if (previous) {
      const oldAsset = await caches.match(request, { cacheName: previous });
      if (oldAsset) return oldAsset;
    }
  }
  return fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(request.mode === 'navigate' ? navigate(request) : loadResource(request, new URL(request.url)));
});
`;
        const hash = createHash('sha256').update(source);
        for (const item of Object.values(bundle)) {
          hash.update(item.fileName);
          hash.update(item.type === 'chunk' ? item.code : item.source);
        }
        for (const file of files) hash.update(readFileSync(resolve('public', file)));
        const version = hash.digest('hex').slice(0, 16);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const CACHE = 'notera-${version}';\n${source}`,
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineApp()],
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173 },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], restoreMocks: true },
});
