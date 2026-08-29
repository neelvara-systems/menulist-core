#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ORIGIN = 'https://pwa-contract.test';

class ScopedRequest {
  constructor(input, init = {}) {
    this.url = new URL(typeof input === 'string' ? input : input.url, ORIGIN).href;
    this.mode = init.mode || input?.mode || 'same-origin';
    this.cache = init.cache;
  }
}

async function exerciseWorker({
  expectedOfflinePath,
  expectedText,
  scope,
  workerPath,
}) {
  const listeners = new Map();
  const cacheBuckets = new Map();

  const caches = {
    async delete(name) {
      return cacheBuckets.delete(name);
    },
    async keys() {
      return [...cacheBuckets.keys()];
    },
    async open(name) {
      if (!cacheBuckets.has(name)) cacheBuckets.set(name, new Map());
      const bucket = cacheBuckets.get(name);
      return {
        async add(request) {
          const normalized = request instanceof ScopedRequest ? request : new ScopedRequest(request);
          bucket.set(normalized.url, new Response(`cached:${normalized.url}`, { status: 200 }));
        },
        async match(request) {
          const normalized = request instanceof ScopedRequest ? request : new ScopedRequest(request);
          return bucket.get(normalized.url)?.clone();
        },
      };
    },
  };

  const self = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    clients: {
      async claim() {},
    },
    registration: { scope: new URL(scope, ORIGIN).href },
    async skipWaiting() {},
  };

  const source = await readFile(new URL(`../../${workerPath}`, import.meta.url), 'utf8');
  vm.runInNewContext(source, {
    AbortController,
    Request: ScopedRequest,
    Response,
    URL,
    caches,
    clearTimeout,
    fetch: async () => {
      throw new TypeError('synthetic_offline');
    },
    self,
    setTimeout,
  }, { filename: workerPath });

  assert.equal(typeof listeners.get('install'), 'function', `${workerPath} must register install`);
  assert.equal(typeof listeners.get('activate'), 'function', `${workerPath} must register activate`);
  assert.equal(typeof listeners.get('fetch'), 'function', `${workerPath} must register fetch`);

  let installPromise;
  listeners.get('install')({ waitUntil(value) { installPromise = value; } });
  await installPromise;

  let activatePromise;
  listeners.get('activate')({ waitUntil(value) { activatePromise = value; } });
  await activatePromise;

  let navigationResponse;
  listeners.get('fetch')({
    request: { mode: 'navigate', url: new URL('current', self.registration.scope).href },
    respondWith(value) { navigationResponse = value; },
  });
  const response = await navigationResponse;
  assert(response instanceof Response, `${workerPath} must return an offline response`);
  assert((await response.text()).includes(expectedText), `${workerPath} must return its branded offline shell`);

  let nonNavigationIntercepted = false;
  listeners.get('fetch')({
    request: { mode: 'cors', url: `${ORIGIN}/api/private` },
    respondWith() { nonNavigationIntercepted = true; },
  });
  assert.equal(nonNavigationIntercepted, false, `${workerPath} must not cache or intercept API requests`);

  const cachedUrls = [...cacheBuckets.values()].flatMap((bucket) => [...bucket.keys()]);
  assert(cachedUrls.includes(new URL(expectedOfflinePath, ORIGIN).href), `${workerPath} must cache the correct offline route`);
  assert(!cachedUrls.some((url) => url.includes('/api/')), `${workerPath} must not cache APIs`);
  assert(!cachedUrls.some((url) => url.includes('/operations') || url.includes('/support-board')), `${workerPath} must not cache product pages`);
}

await exerciseWorker({
  expectedOfflinePath: '/__mycodex/offline',
  expectedText: 'cached:https://pwa-contract.test/__mycodex/offline',
  scope: '/__mycodex/',
  workerPath: 'public/mycodex-sw.js',
});

await exerciseWorker({
  expectedOfflinePath: '/__answerlattice/offline',
  expectedText: 'cached:https://pwa-contract.test/__answerlattice/offline',
  scope: '/answerlattice/',
  workerPath: 'public/answerlattice-sw.js',
});

await exerciseWorker({
  expectedOfflinePath: '/offline',
  expectedText: 'cached:https://pwa-contract.test/offline',
  scope: '/',
  workerPath: 'public/answerlattice-sw.js',
});

console.log('MyCodex and Answerlattice service-worker offline contracts passed.');
