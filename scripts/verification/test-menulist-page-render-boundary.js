#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = process.cwd();
const INVENTORY_PATH = path.join(
  ROOT,
  '__docs__/audits/menulist-rc-certification-inventory.csv',
);
const BASE_URL = process.env.MENULIST_RC_BASE_URL || 'http://127.0.0.1:3000';
const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (character !== '\r') cell += character;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function loadRoutes() {
  const parsed = parseCsv(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const headers = parsed[0];
  const objects = parsed.slice(1).map((cells) => Object.fromEntries(
    headers.map((header, index) => [header, cells[index] ?? '']),
  ));
  return [...new Set(objects
    .filter((row) => (
      row.item_type === 'page'
      && row.product_area === 'MenuList'
      && !row.route_or_component.includes('[')
    ))
    .map((row) => row.route_or_component))]
    .sort();
}

async function probe(route) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(new URL(route, BASE_URL), {
      headers: {
        accept: 'text/html',
        'user-agent': 'MenuList-RC-Local-Route-Smoke/1.0',
      },
      redirect: 'manual',
      signal: controller.signal,
    });
    await response.body?.cancel();
    return {
      route,
      status: response.status,
      location: response.headers.get('location'),
    };
  } catch (error) {
    return {
      route,
      error: error instanceof Error ? error.name : 'UnknownError',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  const routes = loadRoutes();
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, routes.length) }, async () => {
    while (cursor < routes.length) {
      const route = routes[cursor];
      cursor += 1;
      results.push(await probe(route));
    }
  });
  await Promise.all(workers);
  results.sort((left, right) => left.route.localeCompare(right.route));

  const failures = results.filter((result) => (
    result.error
    || result.status >= 500
    || result.status === 0
    || (result.status === 404 && result.route !== '/404')
  ));
  const statusCounts = {};
  for (const result of results) {
    if (result.status === undefined) continue;
    statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
  }
  const evidence = {
    baseUrl: BASE_URL,
    routeCount: routes.length,
    routeManifestSha256: createHash('sha256').update(routes.join('\n')).digest('hex'),
    routes,
    statusCounts,
    failures,
    result: failures.length === 0 ? 'PASS_RENDER_BOUNDARY' : 'FAIL',
  };
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (failures.length > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
