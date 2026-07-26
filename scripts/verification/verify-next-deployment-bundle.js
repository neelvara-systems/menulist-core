#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const routeContracts = [
  {
    label: 'website',
    routeEntry: '.next/server/app/(website)/page.js',
    requireSwcHelpers: true,
  },
  {
    label: 'sign-in',
    routeEntry: '.next/server/app/(global-pages)/signin/page.js',
    rejectFirebaseAdminExternal: true,
  },
  {
    label: 'auth API',
    routeEntry: '.next/server/app/api/auth/[...nextauth]/route.js',
    rejectFirebaseAdminExternal: true,
  },
];

function fail(message) {
  throw new Error(`[Next deployment bundle] ${message}`);
}

function verifyRoute(contract) {
  const tracePath = `${contract.routeEntry}.nft.json`;
  const absoluteTracePath = path.join(repoRoot, tracePath);
  if (!fs.existsSync(absoluteTracePath)) {
    fail(`Missing ${tracePath}. Run a production build before this verifier.`);
  }

  const trace = JSON.parse(fs.readFileSync(absoluteTracePath, 'utf8'));
  const tracedFiles = Array.isArray(trace.files) ? trace.files : [];
  if (
    contract.requireSwcHelpers
    && !tracedFiles.some((file) => file.includes('node_modules/@swc/helpers/'))
  ) {
    fail('The website route trace omits @swc/helpers, which Next 16 requires in the deployed Turbopack runtime.');
  }

  const routeDirectory = path.dirname(absoluteTracePath);
  const sourceFiles = new Set([
    path.join(repoRoot, contract.routeEntry),
    absoluteTracePath,
    ...tracedFiles.map((file) => path.resolve(routeDirectory, file)),
  ]);

  if (contract.rejectFirebaseAdminExternal) {
    const externalFirebaseAdminPattern = /firebase-admin-[a-f0-9]+\/(?:app|auth|firestore|storage)/;
    const offendingChunk = Array.from(sourceFiles).find((sourcePath) => (
      sourcePath.endsWith('.js')
      && fs.existsSync(sourcePath)
      && externalFirebaseAdminPattern.test(fs.readFileSync(sourcePath, 'utf8'))
    ));
    if (offendingChunk) {
      fail(
        `The ${contract.label} route still native-externalizes Firebase Admin in ${
          path.relative(repoRoot, offendingChunk)
        }; Vercel would load jwks-rsa CommonJS against ESM-only jose.`,
      );
    }
  }

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'menulist-next-trace-'));
  try {
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

    const isolatedEntry = path.join(temporaryRoot, contract.routeEntry);
    const probe = spawnSync(
      process.execPath,
      [
        '-e',
        [
          "globalThis.AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage;",
          `require(${JSON.stringify(isolatedEntry)});`,
          `process.stdout.write(${JSON.stringify(`${contract.label} route loaded`)});`,
        ].join(' '),
      ],
      {
        cwd: temporaryRoot,
        encoding: 'utf8',
        env: {
          HOME: process.env.HOME || temporaryRoot,
          NODE_ENV: 'production',
          NEXTAUTH_SECRET: 'deployment-bundle-verifier-secret',
          NEXT_RUNTIME: 'nodejs',
          PATH: process.env.PATH || '',
        },
      },
    );

    if (probe.status !== 0) {
      const detail = String(probe.stderr || probe.stdout || 'unknown isolated-load failure').trim();
      fail(
        `The traced ${contract.label} route cannot load without the full repository node_modules:\n${detail}`,
      );
    }

    return `${contract.label}: ${tracedFiles.length} traced files`;
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

const results = routeContracts.map(verifyRoute);
console.log(`Next deployment bundle verified: ${results.join('; ')}; isolated routes loaded.`);
