#!/usr/bin/env node

/**
 * Local customer-PWA service-worker contract smoke.
 *
 * Development intentionally unregisters service workers, so this harness
 * manually registers sw-customer.js after page startup. It proves only the
 * worker's offline-fallback and no-menu-cache contract on a loopback-mapped
 * tenant origin. It does not certify production registration or PWA install.
 */

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const debugPort = readPositiveIntegerEnv('CUSTOMER_PWA_QA_DEBUG_PORT', 9365);
const proxyPort = readPositiveIntegerEnv('CUSTOMER_PWA_QA_PROXY_PORT', 3310);
const timeoutMs = readPositiveIntegerEnv('CUSTOMER_PWA_QA_TIMEOUT_MS', 45000);
const outputDir = process.env.CUSTOMER_PWA_QA_OUTPUT_DIR || '/tmp/menulist-customer-pwa-qa';
const screenshotPath = path.join(outputDir, 'customer-pwa-offline-fallback.png');
const tenantHostname = process.env.CUSTOMER_PWA_QA_TENANT_HOST || 'habibis.menulist.ai';
const upstreamUrl = new URL(process.env.CUSTOMER_PWA_QA_UPSTREAM_URL || 'http://127.0.0.1:3000');
const baseUrl = new URL(`http://${tenantHostname}:${proxyPort}`);

if (baseUrl.protocol !== 'http:') {
  throw new Error('The harness origin must use local HTTP; production HTTPS origins are refused.');
}
if (!baseUrl.port || baseUrl.port === '80' || baseUrl.port === '443') {
  throw new Error('CUSTOMER_PWA_QA_PROXY_PORT must be an explicit non-production port.');
}
if (!/^[a-z0-9-]+\.menulist\.ai$/i.test(baseUrl.hostname)) {
  throw new Error('CUSTOMER_PWA_QA_TENANT_HOST must be a MenuList tenant hostname.');
}
if (['app.menulist.ai', 'www.menulist.ai'].includes(baseUrl.hostname.toLowerCase())) {
  throw new Error('CUSTOMER_PWA_QA_TENANT_HOST must not use a platform or website hostname.');
}
if (
  upstreamUrl.protocol !== 'http:'
  || !upstreamUrl.port
  || !['127.0.0.1', 'localhost', '::1'].includes(upstreamUrl.hostname)
) {
  throw new Error('CUSTOMER_PWA_QA_UPSTREAM_URL must use loopback HTTP with an explicit port.');
}

baseUrl.pathname = '/';
baseUrl.search = '';
baseUrl.hash = '';

function fetchJson(url) {
  return fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
    return response.json();
  });
}

async function waitForChromeEndpoint() {
  const endpoint = `http://127.0.0.1:${debugPort}/json/version`;
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      return await fetchJson(endpoint);
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw lastError || new Error('Chrome DevTools endpoint did not become ready.');
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(timer);
    if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
    else resolve(message.result);
  });

  function send(method, params = {}, sessionId) {
    const nextId = ++id;
    const payload = { id: nextId, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending.has(nextId)) return;
        pending.delete(nextId);
        reject(new Error(`CDP command timed out: ${method}`));
      }, timeoutMs);
      pending.set(nextId, { resolve, reject, timer });
    });
  }

  return { ready, send, close: () => ws.close() };
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed.');
  }
  return result.result?.value;
}

async function waitForExpression(client, sessionId, expression, label) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeoutMs) {
    lastValue = await evaluate(client, sessionId, expression);
    if (lastValue) return lastValue;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}`);
}

async function captureScreenshot(client, sessionId) {
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  }, sessionId);
  await writeFile(screenshotPath, Buffer.from(result.data, 'base64'));
}

function createLoopbackTenantProxy() {
  let offline = false;
  const server = http.createServer((request, response) => {
    if (offline) {
      request.socket.destroy();
      return;
    }

    const headers = {
      ...request.headers,
      host: baseUrl.host,
      'x-forwarded-host': baseUrl.host,
      'x-forwarded-proto': 'http',
    };
    delete headers.connection;

    const upstreamRequest = http.request({
      hostname: upstreamUrl.hostname,
      port: Number(upstreamUrl.port),
      method: request.method,
      path: request.url,
      headers,
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });

    upstreamRequest.on('error', () => {
      if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Local tenant upstream unavailable.');
    });
    request.pipe(upstreamRequest);
  });

  return {
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(proxyPort, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    }),
    setOffline: (value) => {
      offline = value;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function inspectWorkerState(client, sessionId) {
  return evaluate(client, sessionId, `(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheNames = await caches.keys();
    const cacheEntries = {};
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      cacheEntries[cacheName] = (await cache.keys()).map((request) => request.url);
    }
    return {
      controller: navigator.serviceWorker.controller?.scriptURL || '',
      registrations: registrations.map((registration) => ({
        active: registration.active?.scriptURL || '',
        installing: registration.installing?.scriptURL || '',
        scope: registration.scope,
        waiting: registration.waiting?.scriptURL || '',
      })),
      cacheNames,
      cacheEntries,
    };
  })()`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'menulist-customer-pwa-qa-'));
  const tenantProxy = createLoopbackTenantProxy();
  await tenantProxy.listen();
  let client = null;
  let sessionId = null;
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--proxy-server=direct://',
    '--proxy-bypass-list=*',
    `--host-resolver-rules=MAP ${baseUrl.hostname} 127.0.0.1`,
    `--unsafely-treat-insecure-origin-as-secure=${baseUrl.origin}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  chrome.stderr.on('data', (chunk) => {
    if (process.env.CUSTOMER_PWA_QA_VERBOSE === '1') process.stderr.write(String(chunk));
  });

  try {
    const version = await waitForChromeEndpoint();
    client = createCdpClient(version.webSocketDebuggerUrl);
    await client.ready;

    const target = await client.send('Target.createTarget', { url: 'about:blank' });
    const attached = await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    sessionId = attached.sessionId;

    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Network.enable', {}, sessionId);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    }, sessionId);

    await client.send('Page.navigate', { url: baseUrl.href }, sessionId);
    const onlineState = await waitForExpression(
      client,
      sessionId,
      `(() => {
        const text = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
        if (document.readyState !== 'complete' || text.length < 40) return null;
        return {
          title: document.title,
          url: location.href,
          hasRuntimeError: /application error|internal server error|this page could not be found/i.test(text),
          text: text.slice(0, 800),
        };
      })()`,
      'the online tenant page',
    );
    if (onlineState.hasRuntimeError) throw new Error('The online tenant page rendered a runtime error.');

    // Let the development-only app cleanup finish before manual registration.
    await delay(1500);
    await evaluate(client, sessionId, `(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await navigator.serviceWorker.register('/sw-customer.js', { scope: '/' });
      return true;
    })()`);

    await waitForExpression(
      client,
      sessionId,
      `navigator.serviceWorker.getRegistrations().then((registrations) => registrations.some((registration) => registration.active?.scriptURL.endsWith('/sw-customer.js')))`,
      'the active customer service worker',
    );
    await waitForExpression(
      client,
      sessionId,
      `caches.open('customer-app-offline-v1').then((cache) => cache.match('/offline')).then(Boolean)`,
      'the offline fallback cache entry',
    );
    await waitForExpression(
      client,
      sessionId,
      `Boolean(navigator.serviceWorker.controller?.scriptURL.endsWith('/sw-customer.js'))`,
      'the customer service worker controller',
    );

    const onlineWorkerState = await inspectWorkerState(client, sessionId);
    const onlineCacheUrls = Object.values(onlineWorkerState.cacheEntries).flat();
    const offlineUrl = new URL('/offline', baseUrl).href;
    const onlineCacheIsOfflineOnly = onlineCacheUrls.length === 1 && onlineCacheUrls[0] === offlineUrl;

    tenantProxy.setOffline(true);
    const offlineNavigationUrl = new URL('/?customer-pwa-offline-smoke=1', baseUrl).href;
    await client.send('Page.navigate', { url: offlineNavigationUrl }, sessionId).catch(() => undefined);

    let offlineState;
    try {
      offlineState = await waitForExpression(
        client,
        sessionId,
        `(() => {
          const text = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
          if (!text.includes("You're offline") || !text.includes('Reconnect to see the latest live menu.')) return null;
          return {
            title: document.title,
            url: location.href,
            hasOfflineHeading: text.includes("You're offline"),
            hasLatestMenuReconnectCopy: text.includes('Reconnect to see the latest live menu.'),
            hasOnlineMenuText: ${JSON.stringify(onlineState.title)} ? text.includes(${JSON.stringify(onlineState.title)}) : false,
            text: text.slice(0, 800),
          };
        })()`,
        'the customer offline fallback',
      );
    } catch (error) {
      const failureState = await evaluate(client, sessionId, `(async () => ({
        url: location.href,
        title: document.title,
        readyState: document.readyState,
        text: (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 800),
        controller: navigator.serviceWorker.controller?.scriptURL || '',
        registrations: (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.active?.scriptURL || ''),
        cacheNames: await caches.keys(),
      }))()`);
      throw new Error(`${error.message} Failure state: ${JSON.stringify(failureState)}`);
    }
    await captureScreenshot(client, sessionId);

    const offlineWorkerState = await inspectWorkerState(client, sessionId);
    const offlineCacheUrls = Object.values(offlineWorkerState.cacheEntries).flat();
    const offlineCacheIsOfflineOnly = offlineCacheUrls.length === 1 && offlineCacheUrls[0] === offlineUrl;

    const failures = [];
    if (!onlineWorkerState.registrations.some((registration) => registration.active.endsWith('/sw-customer.js'))) {
      failures.push('The active registration is not sw-customer.js.');
    }
    if (!onlineWorkerState.controller.endsWith('/sw-customer.js')) {
      failures.push('The online tenant page was not controlled by sw-customer.js.');
    }
    if (!onlineCacheIsOfflineOnly) failures.push('Cache Storage contained entries other than the single /offline fallback.');
    if (!offlineState.hasOfflineHeading || !offlineState.hasLatestMenuReconnectCopy) {
      failures.push('The offline navigation did not render the maintained reconnect screen.');
    }
    if (offlineState.hasOnlineMenuText) failures.push('The offline page contained the online tenant title.');
    if (!offlineCacheIsOfflineOnly) failures.push('Offline navigation added menu or runtime content to Cache Storage.');

    const result = {
      ok: failures.length === 0,
      boundary: 'local_loopback_customer_worker_contract_only',
      productionRegistrationCertified: false,
      pwaInstallCertified: false,
      realDeviceCertified: false,
      menuContentCached: !offlineCacheIsOfflineOnly,
      failures,
      baseUrl: baseUrl.href,
      onlineState,
      offlineState,
      onlineWorkerState,
      offlineWorkerState,
      screenshot: screenshotPath,
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    tenantProxy.setOffline(false);
    client?.close();
    chrome.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 1500);
      chrome.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await tenantProxy.close();
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
