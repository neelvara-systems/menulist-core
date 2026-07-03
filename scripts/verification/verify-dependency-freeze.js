const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const PACKAGE_PAIRS = [
  {
    label: 'root app package',
    dir: '.',
    expectedCoreVersions: {
      '@google/genai': '0.12.0',
      '@reduxjs/toolkit': '1.9.7',
      '@tiptap/react': '2.11.0',
      antd: '5.25.1',
      firebase: '11.7.3',
      'firebase-admin': '12.7.0',
      next: '14.2.35',
      'next-auth': '4.24.13',
      react: '18.3.1',
      'react-dom': '18.3.1',
      'redux-persist': '6.0.0',
      typescript: '5.8.3',
      zod: '3.25.76',
    },
  },
  {
    label: 'MenuList Functions package',
    dir: 'functions',
    expectedCoreVersions: {
      '@sentry/node': '8.55.0',
      '@upstash/redis': '1.35.7',
      'firebase-admin': '13.5.0',
      'firebase-functions': '6.6.0',
      typescript: '5.9.2',
    },
  },
  {
    label: 'Answerlattice Functions package',
    dir: 'functions-answerlattice',
    expectedCoreVersions: {
      'firebase-admin': '12.7.0',
      'firebase-functions': '5.1.1',
      typescript: '5.9.3',
    },
  },
];

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function packageRelPath(dir, filename) {
  return dir === '.' ? filename : path.join(dir, filename);
}

function getDeclaredVersion(packageJson, name) {
  return packageJson.dependencies?.[name] || packageJson.devDependencies?.[name] || null;
}

function verifyPackagePair({ label, dir, expectedCoreVersions }) {
  const packageJson = readJson(packageRelPath(dir, 'package.json'));
  const lockJson = readJson(packageRelPath(dir, 'package-lock.json'));
  const rootLockPackage = lockJson.packages?.[''];
  assert(rootLockPackage, `${label} package-lock.json must include root package metadata`);

  for (const sectionName of ['dependencies', 'devDependencies']) {
    const packageSection = packageJson[sectionName] || {};
    const lockSection = rootLockPackage[sectionName] || {};

    for (const [name, declaredVersion] of Object.entries(packageSection)) {
      assert(
        EXACT_VERSION.test(declaredVersion),
        `${label} ${sectionName}.${name} must be pinned to an exact resolved version, found ${declaredVersion}`,
      );
      assert(
        lockSection[name] === declaredVersion,
        `${label} package-lock root ${sectionName}.${name} must match package.json ${declaredVersion}, found ${lockSection[name] || 'missing'}`,
      );

      const resolvedVersion = lockJson.packages?.[`node_modules/${name}`]?.version;
      assert(
        resolvedVersion === declaredVersion,
        `${label} lockfile resolved version for ${name} must match package.json ${declaredVersion}, found ${resolvedVersion || 'missing'}`,
      );
    }
  }

  for (const [name, expectedVersion] of Object.entries(expectedCoreVersions)) {
    const declaredVersion = getDeclaredVersion(packageJson, name);
    assert(
      declaredVersion === expectedVersion,
      `${label} core runtime ${name} must stay pinned at ${expectedVersion}, found ${declaredVersion || 'missing'}`,
    );
  }
}

function walkFiles(relPath, extensions, files = []) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return files;

  for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === '_archive' ||
      entry.name === 'archive'
    ) {
      continue;
    }

    const childRelPath = path.join(relPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(childRelPath, extensions, files);
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      files.push(childRelPath);
    }
  }

  return files;
}

function verifyMobileLibraryBoundary() {
  const rootPackage = readJson('package.json');
  const hasAntdMobileDependency = Boolean(rootPackage.dependencies?.['antd-mobile']);
  const sourceFiles = walkFiles('src', new Set(['.ts', '.tsx', '.js', '.jsx']));
  const antdMobileImports = sourceFiles.filter((relPath) => {
    const content = read(relPath);
    return /from\s+['"]antd-mobile(?:\/[^'"]*)?['"]|require\(['"]antd-mobile(?:\/[^'"]*)?['"]\)/.test(content);
  });

  if (!hasAntdMobileDependency) {
    assert(
      antdMobileImports.length === 0,
      `antd-mobile is not a root dependency, but runtime imports were found:\n${antdMobileImports.join('\n')}`,
    );
  }
}

function verifyDocsAndRegistry() {
  const packageJson = readJson('package.json');
  assert(
    packageJson.scripts?.['verify:dependency-freeze'] ===
      'node scripts/verification/verify-dependency-freeze.js',
    'package.json must expose verify:dependency-freeze',
  );

  const docsToCheck = [
    'AGENTS.md',
    '.windsurfrules',
    '.codex/rules/custom-instructions.md',
    '.codex/rules/debug-mode.md',
    '.codex/rules/architect-mode.md',
    '.codex/rules/MOBILE_SUPPORT_RULES.md',
    '__docs__/project-memory-for-chatgpt.md',
    '__docs__/project-memory-for-chatgpt-technical.md',
    '__docs__/production-readiness/dev-prod-environment-guide.md',
    '__docs__/audits/menulist-production-readiness-audit.md',
    '__docs__/production-readiness/external-certification-runbook.md',
    '__docs__/production-readiness/README.md',
  ].filter(exists);

  const gateMentionFiles = [
    'AGENTS.md',
    '.windsurfrules',
    '.codex/rules/custom-instructions.md',
    '.codex/rules/architect-mode.md',
    '.codex/rules/MOBILE_SUPPORT_RULES.md',
    '__docs__/project-memory-for-chatgpt.md',
    '__docs__/project-memory-for-chatgpt-technical.md',
    '__docs__/production-readiness/dev-prod-environment-guide.md',
    '__docs__/audits/menulist-production-readiness-audit.md',
    '__docs__/production-readiness/external-certification-runbook.md',
    '__docs__/production-readiness/README.md',
  ].filter(exists);

  for (const relPath of gateMentionFiles) {
    assert(
      read(relPath).includes('verify:dependency-freeze'),
      `${relPath} must mention verify:dependency-freeze`,
    );
  }

  const staleRuntimeTokens = [
    'Next.js 14.2.5',
    'Next.js (v14.2.5)',
    '14.2.30',
    'Ant Design 5.20.2',
    'Ant Design (v5.20.2)',
    '5.23.1 on desktop',
    'Firebase 10.5.0',
    'OpenAI SDK 4.52.2',
    'OpenAI SDK (v4.52.2)',
    'antd-mobile + Tailwind',
  ];

  for (const relPath of docsToCheck) {
    const content = read(relPath);
    for (const token of staleRuntimeTokens) {
      assert(!content.includes(token), `${relPath} must not contain stale runtime token ${token}`);
    }
  }
}

for (const packagePair of PACKAGE_PAIRS) {
  verifyPackagePair(packagePair);
}
verifyMobileLibraryBoundary();
verifyDocsAndRegistry();

console.log('Dependency freeze verification passed');
