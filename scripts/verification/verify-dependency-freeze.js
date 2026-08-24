const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const EXACT_NPM_ALIAS = /^npm:(@[^/]+\/[^@]+|[^@]+)@(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/;

const PACKAGE_PAIRS = [
  {
    label: 'root app package',
    dir: '.',
    expectedCoreVersions: {
      '@google/genai': '2.13.0',
      '@react-email/render': '2.1.0',
      '@reduxjs/toolkit': '2.12.0',
      '@serwist/turbopack': '9.5.12',
      '@swc/helpers': '0.5.23',
      '@tiptap/react': '2.11.0',
      '@vercel/oidc': '3.8.4',
      ajv: '8.20.0',
      antd: '5.25.1',
      fabric: '7.4.0',
      firebase: '11.7.3',
      'firebase-admin': '14.2.0',
      'google-auth-library': '10.9.1',
      next: '16.3.0',
      'next-auth': '4.24.15',
      'next-intl': '4.13.4',
      react: '19.2.8',
      'react-dom': '19.2.8',
      'react-redux': '9.3.0',
      'redux-persist': '6.0.0',
      resend: '6.20.0',
      serwist: '9.5.12',
      postcss: '8.5.23',
      picomatch: '4.0.5',
      sass: '1.101.7',
      typescript: '5.8.3',
      webpack: '5.109.0',
      zod: '3.25.76',
    },
  },
  {
    label: 'MenuList Functions package',
    dir: 'functions',
    expectedCoreVersions: {
      '@google/genai': '2.13.0',
      '@react-email/render': '2.1.0',
      '@sentry/node': '10.68.0',
      '@upstash/redis': '1.35.7',
      'firebase-admin': '13.10.0',
      'firebase-functions': '7.3.0',
      nodemailer: '9.0.3',
      razorpay: '2.9.8',
      react: '19.2.8',
      'react-dom': '19.2.8',
      resend: '6.20.0',
      typescript: '5.9.2',
    },
  },
  {
    label: 'Answerlattice Functions package',
    dir: 'functions-answerlattice',
    expectedCoreVersions: {
      '@google/genai': '2.13.0',
      '@react-email/render': '2.1.0',
      'firebase-admin': '13.10.0',
      'firebase-functions': '7.3.0',
      nodemailer: '9.0.3',
      react: '19.2.8',
      'react-dom': '19.2.8',
      resend: '6.20.0',
      typescript: '5.9.3',
    },
  },
  {
    label: 'SignalDesk Functions package',
    dir: 'functions-signaldesk',
    expectedCoreVersions: {
      'firebase-admin': '13.10.0',
      'firebase-functions': '7.3.0',
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

function parseExactDependency(name, declaredVersion) {
  if (EXACT_VERSION.test(declaredVersion)) {
    return { packageName: name, version: declaredVersion };
  }
  const aliasMatch = declaredVersion.match(EXACT_NPM_ALIAS);
  return aliasMatch
    ? { packageName: aliasMatch[1], version: aliasMatch[2] }
    : null;
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
      const exactDependency = parseExactDependency(name, declaredVersion);
      assert(
        exactDependency,
        `${label} ${sectionName}.${name} must be pinned to an exact resolved version, found ${declaredVersion}`,
      );
      assert(
        lockSection[name] === declaredVersion,
        `${label} package-lock root ${sectionName}.${name} must match package.json ${declaredVersion}, found ${lockSection[name] || 'missing'}`,
      );

      const resolvedPackage = lockJson.packages?.[`node_modules/${name}`];
      const resolvedVersion = resolvedPackage?.version;
      assert(
        resolvedVersion === exactDependency.version,
        `${label} lockfile resolved version for ${name} must match package.json ${exactDependency.version}, found ${resolvedVersion || 'missing'}`,
      );
      if (exactDependency.packageName !== name) {
        assert(
          resolvedPackage?.name === exactDependency.packageName,
          `${label} lockfile alias ${name} must resolve package ${exactDependency.packageName}, found ${resolvedPackage?.name || 'missing'}`,
        );
      }
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

function verifyRetiredRuntimeDependencies() {
  const rootPackage = readJson('package.json');
  const retiredDependencies = [
    'next-pwa',
    '@emoji-mart/react',
    '@ant-design/plots',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-menubar',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-separator',
    '@radix-ui/react-slider',
    '@radix-ui/react-tabs',
    '@tiptap/pm',
    '@types/react-window',
    '@types/ua-parser-js',
    '@types/uuid',
    'axios',
    'critters',
    'date-fns',
    'encoding',
    'libphonenumber-js',
    'patch-package',
    'react-intersection-observer',
    'react-window',
  ];
  for (const retiredDependency of retiredDependencies) {
    assert(
      !rootPackage.dependencies?.[retiredDependency]
        && !rootPackage.devDependencies?.[retiredDependency],
      `${retiredDependency} must remain removed from direct root dependencies`,
    );
  }

  const toolingOnlyDependencies = {
    '@svgr/webpack': '8.1.0',
    '@types/qrcode': '1.5.6',
    'tailwindcss-animate': '1.0.7',
    ws: '8.21.1',
  };
  for (const [dependency, expectedVersion] of Object.entries(toolingOnlyDependencies)) {
    assert(
      !rootPackage.dependencies?.[dependency]
        && rootPackage.devDependencies?.[dependency] === expectedVersion,
      `${dependency} must stay tooling-only in root devDependencies at ${expectedVersion}`,
    );
  }
}

function verifyRootRuntimeEnvironment() {
  const rootPackage = readJson('package.json');
  const rootLock = readJson('package-lock.json');
  assert(
    rootPackage.engines?.node === '22',
    `Root Node engine must stay pinned to major 22, found ${rootPackage.engines?.node || 'missing'}`,
  );
  assert(
    read('.nvmrc').trim() === '22.23.1',
    `Root .nvmrc must stay pinned to 22.23.1, found ${read('.nvmrc').trim() || 'missing'}`,
  );
  assert(
    rootPackage.overrides?.uuid === '11.1.1',
    'Root UUID security override must stay pinned to 11.1.1',
  );
  assert(
    rootPackage.overrides?.exceljs?.archiver === '8.0.0'
      && rootPackage.overrides?.exceljs?.unzipper === '0.12.5'
      && rootPackage.overrides?.['google-gax']?.rimraf === '6.1.3'
      && rootPackage.overrides?.sucrase?.glob === '13.0.6'
      && rootPackage.devDependencies?.['brace-expansion'] === '1.1.18'
      && rootPackage.devDependencies?.['fast-uri'] === '3.1.5',
    'Root brace-expansion advisory controls must keep production consumers on compatible patched chains',
  );
  assert(
    rootPackage.overrides?.next?.sharp === '0.35.3',
    'Next optional Sharp security override must stay pinned to 0.35.3',
  );
  const patchedTransitiveVersions = {
    dompurify: '3.4.13',
    'js-yaml': '4.3.1',
    nanoid: '3.3.18',
  };
  for (const [dependency, expectedVersion] of Object.entries(patchedTransitiveVersions)) {
    assert(
      rootPackage.overrides?.[dependency] === expectedVersion,
      `Root ${dependency} security override must stay pinned to ${expectedVersion}`,
    );
    assert(
      rootLock.packages?.[`node_modules/${dependency}`]?.version === expectedVersion,
      `Root lockfile must resolve ${dependency} to ${expectedVersion}`,
    );
  }
  assert(
    !rootPackage.devDependencies?.['@types/fabric'],
    '@types/fabric must remain removed because Fabric 7 ships its own types',
  );

}

function verifyFunctionsSecurityOverrides() {
  const menulistFunctionsPackage = readJson('functions/package.json');
  const menulistFunctionsLock = readJson('functions/package-lock.json');
  assert(
    menulistFunctionsPackage.overrides?.['brace-expansion'] === '1.1.18',
    'MenuList Functions lint chain must stay on patched brace-expansion 1.1.18',
  );
  assert(
    menulistFunctionsPackage.overrides?.['js-yaml'] === '4.3.1',
    'MenuList Functions lint chain must stay on patched js-yaml 4.3.1',
  );
  assert(
    menulistFunctionsLock.packages?.['node_modules/js-yaml']?.version === '4.3.1',
    'MenuList Functions lockfile must resolve js-yaml to 4.3.1',
  );
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
verifyRetiredRuntimeDependencies();
verifyRootRuntimeEnvironment();
verifyFunctionsSecurityOverrides();
verifyDocsAndRegistry();

console.log('Dependency freeze verification passed');
