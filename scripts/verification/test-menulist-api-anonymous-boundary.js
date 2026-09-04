#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const INVENTORY_PATH = path.join(
  ROOT,
  '__docs__/audits/menulist-rc-certification-inventory.csv',
);
const BASE_URL = String(process.env.MENULIST_RC_BASE_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/$/, '');
const INITIAL_TIMEOUT_MS = 8_000;
const RETRY_TIMEOUT_MS = 30_000;
const CONCURRENCY = 4;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }

  return rows;
}

function concreteRoute(route) {
  const concrete = route
    .replaceAll('[...nextauth]', 'session')
    .replaceAll('[...path]', 'rc-invalid')
    .replace(/\[[^/]+\]/g, 'rc-invalid');
  return concrete === '/serwist/rc-invalid' ? '/serwist/sw.js' : concrete;
}

function requiresAnonymousDenial(spec) {
  if (spec.method === 'OPTIONS') return false;
  return [
    'AUTHENTICATED',
    'PLATFORM_ADMIN',
    'SERVER_SECRET_OR_SIGNATURE',
    'PROVIDER_WEBHOOK_BOUNDARY',
  ].some((signal) => spec.role.includes(signal));
}

async function probe(spec, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(spec.method);
    const response = await fetch(`${BASE_URL}${spec.route}`, {
      method: spec.method,
      redirect: 'manual',
      headers: hasBody ? { 'content-type': 'application/json' } : undefined,
      body: hasBody ? '{}' : undefined,
      signal: controller.signal,
    });
    return {
      ...spec,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ...spec,
      status: null,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.name : 'Error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function run() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error('MenuList RC inventory is missing; run verify:menulist-rc-inventory first.');
  }

  const parsed = parseCsv(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const headers = parsed.shift();
  const handlers = parsed
    .map((cells) => Object.fromEntries(
      headers.map((header, index) => [header, cells[index] || '']),
    ))
    .filter((row) => row.product_area === 'MenuList' && row.item_type === 'api-route');

  if (handlers.length !== 141) {
    throw new Error(`Expected 141 MenuList route handlers, found ${handlers.length}.`);
  }

  const specs = handlers.flatMap((row) => row.control_or_action.split('|').map((method) => ({
    method,
    role: row.role,
    route: concreteRoute(row.route_or_component),
    source: row.screen_or_tab,
  })));
  const routeManifestSha256 = createHash('sha256')
    .update(handlers.map((row) => [
      row.route_or_component,
      row.control_or_action,
      row.role,
      row.screen_or_tab,
    ].join('|')).join('\n'))
    .digest('hex');
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < specs.length) {
      const spec = specs[cursor];
      cursor += 1;
      results.push(await probe(spec, INITIAL_TIMEOUT_MS));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  for (let index = 0; index < results.length; index += 1) {
    if (results[index].status !== null) continue;
    results[index] = await probe(results[index], RETRY_TIMEOUT_MS);
  }

  const failures = results.filter((result) => (
    result.status === null
    || result.status >= 500
    || (requiresAnonymousDenial(result) && result.status < 300)
  ));
  const statuses = Object.fromEntries(
    [...new Set(results.map((result) => String(result.status ?? result.error)))]
      .sort()
      .map((status) => [
        status,
        results.filter((result) => String(result.status ?? result.error) === status).length,
      ]),
  );

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    handlers: handlers.length,
    methodProbes: results.length,
    routeManifestSha256,
    statuses,
    failures,
  }, null, 2));

  if (failures.length > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
