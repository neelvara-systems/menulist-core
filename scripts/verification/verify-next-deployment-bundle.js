#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const routeEntry = '.next/server/app/(website)/page.js';
const tracePath = `${routeEntry}.nft.json`;
const absoluteTracePath = path.join(repoRoot, tracePath);

function fail(message) {
  throw new Error(`[Next deployment bundle] ${message}`);
}

if (!fs.existsSync(absoluteTracePath)) {
  fail(`Missing ${tracePath}. Run a production build before this verifier.`);
}

const trace = JSON.parse(fs.readFileSync(absoluteTracePath, 'utf8'));
const tracedFiles = Array.isArray(trace.files) ? trace.files : [];

if (!tracedFiles.some((file) => file.includes('node_modules/@swc/helpers/'))) {
  fail('The website route trace omits @swc/helpers, which Next 16 requires in the deployed Turbopack runtime.');
}

const routeDirectory = path.dirname(absoluteTracePath);
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'menulist-next-trace-'));

try {
  const sourceFiles = new Set([
    path.join(repoRoot, routeEntry),
    absoluteTracePath,
    ...tracedFiles.map((file) => path.resolve(routeDirectory, file)),
  ]);

  for (const sourcePath of sourceFiles) {
    if (!sourcePath.startsWith(`${repoRoot}${path.sep}`)) {
      fail(`Trace escaped the repository root: ${sourcePath}`);
    }
    let sourceStat;
    try {
      sourceStat = fs.lstatSync(sourcePath);
    } catch {
      fail(`Traced runtime file is missing: ${path.relative(repoRoot, sourcePath)}`);
    }

    const destinationPath = path.join(temporaryRoot, path.relative(repoRoot, sourcePath));
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    if (sourceStat.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath);
    } else if (sourceStat.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    } else {
      fail(`Unsupported traced runtime entry: ${path.relative(repoRoot, sourcePath)}`);
    }
  }

  const isolatedEntry = path.join(temporaryRoot, routeEntry);
  const probe = spawnSync(
    process.execPath,
    [
      '-e',
      [
        "globalThis.AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage;",
        `require(${JSON.stringify(isolatedEntry)});`,
        "process.stdout.write('website route loaded');",
      ].join(' '),
    ],
    {
      cwd: temporaryRoot,
      encoding: 'utf8',
      env: {
        HOME: process.env.HOME || temporaryRoot,
        NODE_ENV: 'production',
        NEXT_RUNTIME: 'nodejs',
        PATH: process.env.PATH || '',
      },
    },
  );

  if (probe.status !== 0) {
    const detail = String(probe.stderr || probe.stdout || 'unknown isolated-load failure').trim();
    fail(`The traced website route cannot load without the full repository node_modules:\n${detail}`);
  }

  console.log(
    `Next deployment bundle verified: ${tracedFiles.length} traced files; isolated website route loaded.`,
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
