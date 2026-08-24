#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_VERSIONS = {
  next: '16.3.0',
  react: '19.2.8',
  'react-dom': '19.2.8',
  'next-intl': '4.13.4',
  'next-auth': '4.24.15',
  '@ant-design/nextjs-registry': '1.3.0',
  '@reduxjs/toolkit': '2.12.0',
  'react-redux': '9.3.0',
  'framer-motion': '12.42.2',
  '@serwist/turbopack': '9.5.12',
  serwist: '9.5.12',
};

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walkSourceFiles(relDir, result = []) {
  const absDir = path.join(ROOT, relDir);
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const relPath = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(relPath, result);
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      result.push(relPath);
    }
  }
  return result;
}

function verifyPackageContract() {
  const packageJson = JSON.parse(read('package.json'));
  const declared = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  for (const [name, expectedVersion] of Object.entries(EXPECTED_VERSIONS)) {
    assert(
      declared[name] === expectedVersion,
      `${name} must be pinned at ${expectedVersion}; found ${declared[name] || 'missing'}`,
    );
  }
  for (const retired of ['next-pwa', '@emoji-mart/react']) {
    assert(!declared[retired], `${retired} must remain removed`);
  }
  assert(
    packageJson.scripts?.dev === 'node scripts/dev/prepare-next-dev-ports.mjs && next dev',
    'the dev command must use listener-scoped port preparation before starting Next',
  );
  const portPreparation = read('scripts/dev/prepare-next-dev-ports.mjs');
  assert(
    portPreparation.includes("'-sTCP:LISTEN'"),
    'dev port preparation must inspect listeners without targeting browser client connections',
  );
  assert(
    portPreparation.includes('isThisRepository') && portPreparation.includes('isNextDev'),
    'dev port preparation must refuse to terminate unrelated listeners',
  );
  assert(
    !packageJson.scripts.dev.includes('kill -9') && !packageJson.scripts.dev.includes('$(lsof'),
    'the dev command must not force-kill every process connected to a port',
  );
}

function verifyFrameworkConfiguration() {
  const nextConfig = read('next.config.js');
  assert(!nextConfig.includes('next/dist/'), 'next.config.js must not use private Next imports');
  assert(
    !nextConfig.includes('MenuListServerChunkCompatPlugin'),
    'the Next 14 compatibility plugin must remain removed',
  );
  assert(nextConfig.includes('turbopack: {'), 'top-level Turbopack config is required');
  assert(
    nextConfig.includes("withSerwist(nextConfig)"),
    'Serwist must wrap the migrated Next config',
  );
  assert(exists('src/proxy.ts'), 'src/proxy.ts is required');
  assert(!exists('src/middleware.ts'), 'deprecated src/middleware.ts must remain removed');
  assert(
    read('src/proxy.ts').includes('export async function proxy('),
    'src/proxy.ts must export the Next 16 proxy entry point',
  );
  for (const retiredPage of [
    'src/pages/_app.tsx',
    'src/pages/_document.tsx',
    'src/pages/_error.tsx',
  ]) {
    assert(!exists(retiredPage), `${retiredPage} must remain removed from the App Router app`);
  }
}

function verifyFrameworkApiCalls() {
  const errors = [];
  for (const relPath of walkSourceFiles('src')) {
    const sourceText = read(relPath);
    const sourceFile = ts.createSourceFile(
      relPath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const asyncRequestBindings = new Set();
    const revalidateBindings = new Set();

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const moduleName = statement.moduleSpecifier.text;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text || element.name.text;
        if (moduleName === 'next/headers' && ['headers', 'cookies'].includes(importedName)) {
          asyncRequestBindings.add(element.name.text);
        }
        if (moduleName === 'next/cache' && importedName === 'revalidateTag') {
          revalidateBindings.add(element.name.text);
        }
      }
    }

    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const callName = node.expression.text;
        if (asyncRequestBindings.has(callName)) {
          const parent = node.parent;
          const isAwaited = ts.isAwaitExpression(parent);
          const isReactUse = ts.isCallExpression(parent)
            && ts.isIdentifier(parent.expression)
            && parent.expression.text === 'use';
          if (!isAwaited && !isReactUse) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            errors.push(`${relPath}:${line} ${callName}() must be awaited or unwrapped with React.use()`);
          }
        }
        if (revalidateBindings.has(callName) && node.arguments.length < 2) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          errors.push(`${relPath}:${line} revalidateTag() requires an explicit cache-life profile`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  assert(errors.length === 0, errors.join('\n'));
}

function verifyRouteHandlerContextBoundary() {
  const authMiddleware = read('src/middleware/auth.ts');
  assert(
    authMiddleware.includes('params: Promise<Record<string, string | string[] | undefined>>;'),
    'authenticated route context must use the asynchronous Next.js params contract',
  );
  assert(
    authMiddleware.includes('const routeParams = context ? await context.params : undefined;'),
    'withAuth must resolve route params before invoking protected handlers',
  );
  assert(
    !authMiddleware.includes('context?: { params:'),
    'withAuth route context must remain compatible with generated Next.js route types',
  );
}

function verifyWorkerBoundary() {
  const worker = read('src/app/sw.ts');
  const route = read('src/app/serwist/[path]/route.ts');
  assert(route.includes("additionalPrecacheEntries: [{ url: '/offline', revision }]"), 'offline fallback precache');
  assert(!route.includes('**/*.js'), 'owner worker must not precache every JavaScript chunk');
  for (const forbidden of ['firestore.googleapis.com', 'firebasestorage.googleapis.com', '/api/']) {
    assert(!worker.includes(forbidden), `owner worker must not cache ${forbidden}`);
  }
}

verifyPackageContract();
verifyFrameworkConfiguration();
verifyFrameworkApiCalls();
verifyRouteHandlerContextBoundary();
verifyWorkerBoundary();

console.log('Next 16 runtime migration verification passed');
