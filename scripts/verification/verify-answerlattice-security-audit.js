const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MENULIST_FUNCTIONS_DIR = path.join(ROOT, 'functions');
const ANSWERLATTICE_FUNCTIONS_DIR = path.join(ROOT, 'functions-answerlattice');
const SIGNALDESK_FUNCTIONS_DIR = path.join(ROOT, 'functions-signaldesk');

const ROOT_ALLOWED_HIGH_PACKAGES = new Map([
  ['postcss', 'next'],
]);
const ROOT_ALLOWED_MODERATE_PACKAGES = new Map([
  ['next', 'next'],
]);
const ROOT_MAX_HIGH_COUNT = 1;
const ROOT_MAX_MODERATE_COUNT = 1;

const REQUIRED_DIRECT_VERSIONS = {
  root: {
    '@sentry/nextjs': '10.66.0',
    axios: '1.18.1',
    fabric: '7.4.0',
    'firebase-admin': '14.2.0',
    jspdf: '4.2.1',
    next: '16.2.11',
    nodemailer9: 'npm:nodemailer@9.0.3',
    'ua-parser-js': '2.0.10',
    uuid: '11.1.1',
    ws: '8.21.1',
  },
  menulistFunctions: {
    '@sentry/node': '10.68.0',
    'firebase-admin': '13.10.0',
    'firebase-functions': '6.6.0',
    nodemailer: '9.0.3',
    razorpay: '2.9.8',
  },
  answerlatticeFunctions: {
    'firebase-admin': '13.10.0',
    'firebase-functions': '6.6.0',
    nodemailer: '9.0.3',
  },
  signaldeskFunctions: {
    'firebase-admin': '13.10.0',
    'firebase-functions': '6.6.0',
  },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readPackageJson(cwd) {
  return require(path.join(cwd, 'package.json'));
}

function getDeclaredVersion(packageJson, packageName) {
  return packageJson.dependencies?.[packageName]
    || packageJson.devDependencies?.[packageName]
    || null;
}

function verifyDirectVersions(cwd, expectedVersions, label) {
  const packageJson = readPackageJson(cwd);
  for (const [packageName, expectedVersion] of Object.entries(expectedVersions)) {
    const actualVersion = getDeclaredVersion(packageJson, packageName);
    assert(
      actualVersion === expectedVersion,
      `${label} ${packageName} must stay pinned at ${expectedVersion}; found ${actualVersion || 'missing'}`,
    );
  }
}

function verifyRootMailRuntime() {
  const packageJson = readPackageJson(ROOT);
  const packageLock = require(path.join(ROOT, 'package-lock.json'));
  assert(
    !packageJson.dependencies?.nodemailer,
    'Root Nodemailer must remain absent so NextAuth 4 does not receive an incompatible optional peer',
  );
  assert(
    packageLock.packages?.['node_modules/nodemailer9']?.version === '9.0.3',
    'Root Nodemailer 9 runtime alias must resolve exactly to 9.0.3',
  );
}

function walkSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(absolutePath);
    return /\.(?:js|mjs|cjs|ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

function verifyRootDependencyOverrides() {
  const packageJson = readPackageJson(ROOT);
  assert(
    packageJson.overrides?.uuid === '11.1.1',
    'Root UUID transitive security floor must stay overridden to 11.1.1',
  );
  assert(
    packageJson.overrides?.next?.sharp === '0.35.3',
    'Next optional Sharp runtime must stay overridden to 0.35.3',
  );
}

function verifyFunctionsDependencyBoundary(cwd, label) {
  const packageJson = readPackageJson(cwd);
  assert(
    packageJson.overrides?.uuid === '11.1.1',
    `${label} UUID transitive security floor must stay overridden to 11.1.1`,
  );
  assert(
    !packageJson.devDependencies?.['firebase-functions-test'],
    `${label} must not reintroduce unused firebase-functions-test and its vulnerable ts-deepmerge chain`,
  );
}

function verifyFirebaseAdminModularBoundary() {
  const rootNamespaceImport = /(?:from\s+['"]firebase-admin['"]|require\(\s*['"]firebase-admin['"]\s*\))/;
  const sourceDirectories = [
    path.join(ROOT, 'src'),
    path.join(MENULIST_FUNCTIONS_DIR, 'src'),
    path.join(ANSWERLATTICE_FUNCTIONS_DIR, 'src'),
    path.join(SIGNALDESK_FUNCTIONS_DIR, 'src'),
  ];
  const offenders = sourceDirectories.flatMap((directory) => walkSourceFiles(directory))
    .filter((filePath) => rootNamespaceImport.test(fs.readFileSync(filePath, 'utf8')))
    .map((filePath) => path.relative(ROOT, filePath));
  assert(
    offenders.length === 0,
    `Firebase Admin root namespace imports are forbidden; use modular service entry points: ${offenders.join(', ')}`,
  );
}

function runAudit(cwd, label, { omitDev = false } = {}) {
  const args = ['audit', ...(omitDev ? ['--omit=dev'] : []), '--json'];
  const result = spawnSync('npm', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  assert(!result.error, `${label} npm audit failed to start: ${result.error?.message || 'unknown error'}`);
  assert(result.stdout.trim(), `${label} npm audit returned no JSON output`);

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} npm audit returned invalid JSON`);
  }

  assert(
    report.metadata?.vulnerabilities && report.vulnerabilities,
    `${label} npm audit did not return a vulnerability report${report.error?.summary ? `: ${report.error.summary}` : ''}`,
  );

  return report;
}

function getMigrationFamily(name, vulnerability) {
  if (vulnerability.isDirect) return name;
  if (
    vulnerability.fixAvailable
    && typeof vulnerability.fixAvailable === 'object'
    && typeof vulnerability.fixAvailable.name === 'string'
  ) {
    return vulnerability.fixAvailable.name;
  }
  return null;
}

function verifyRootAudit(report, label) {
  const counts = report.metadata.vulnerabilities;
  assert(
    counts.critical === 0,
    `${label} audit contains ${counts.critical} critical vulnerabilities`,
  );
  assert(
    counts.high <= ROOT_MAX_HIGH_COUNT,
    `${label} audit high count increased from the controlled baseline of ${ROOT_MAX_HIGH_COUNT} to ${counts.high}`,
  );
  assert(
    counts.moderate <= ROOT_MAX_MODERATE_COUNT,
    `${label} audit moderate count increased from the controlled baseline of ${ROOT_MAX_MODERATE_COUNT} to ${counts.moderate}`,
  );
  assert(
    counts.low === 0,
    `${label} audit contains ${counts.low} low vulnerabilities`,
  );

  const unapprovedHighs = Object.entries(report.vulnerabilities)
    .filter(([, vulnerability]) => vulnerability.severity === 'high')
    .filter(([name, vulnerability]) => {
      const expectedFamily = ROOT_ALLOWED_HIGH_PACKAGES.get(name);
      const family = getMigrationFamily(name, vulnerability);
      return !expectedFamily || family !== expectedFamily;
    })
    .map(([name]) => name);

  assert(
    unapprovedHighs.length === 0,
    `${label} audit contains unapproved high vulnerabilities: ${unapprovedHighs.join(', ')}`,
  );

  const unapprovedModerates = Object.entries(report.vulnerabilities)
    .filter(([, vulnerability]) => vulnerability.severity === 'moderate')
    .filter(([name, vulnerability]) => {
      const expectedFamily = ROOT_ALLOWED_MODERATE_PACKAGES.get(name);
      const family = getMigrationFamily(name, vulnerability);
      return !expectedFamily || family !== expectedFamily;
    })
    .map(([name]) => name);
  assert(
    unapprovedModerates.length === 0,
    `${label} audit contains unapproved moderate vulnerabilities: ${unapprovedModerates.join(', ')}`,
  );

  const directHighs = Object.entries(report.vulnerabilities)
    .filter(([, vulnerability]) => vulnerability.severity === 'high' && vulnerability.isDirect)
    .map(([name]) => name);
  const unexpectedDirectHighs = directHighs.filter(
    (name) => !ROOT_ALLOWED_HIGH_PACKAGES.has(name),
  );
  assert(
    unexpectedDirectHighs.length === 0,
    `${label} audit contains new direct high vulnerabilities: ${unexpectedDirectHighs.join(', ')}`,
  );

  console.log(
    `${label} audit accepted: ${counts.critical} critical, ${counts.high} high, `
      + `${counts.moderate} moderate. The only accepted family is Next's pinned PostCSS dependency.`,
  );
}

function verifyFunctionsAudit(report, label) {
  const counts = report.metadata.vulnerabilities;
  assert(
    counts.total === 0,
    `${label} audit contains ${counts.total} vulnerabilities: ${counts.critical} critical, `
      + `${counts.high} high, ${counts.moderate} moderate, ${counts.low} low`,
  );
  console.log(`${label} audit accepted: 0 vulnerabilities.`);
}

verifyDirectVersions(ROOT, REQUIRED_DIRECT_VERSIONS.root, 'Root runtime');
verifyDirectVersions(
  MENULIST_FUNCTIONS_DIR,
  REQUIRED_DIRECT_VERSIONS.menulistFunctions,
  'MenuList Functions runtime',
);
verifyDirectVersions(
  ANSWERLATTICE_FUNCTIONS_DIR,
  REQUIRED_DIRECT_VERSIONS.answerlatticeFunctions,
  'Answerlattice Functions runtime',
);
verifyDirectVersions(
  SIGNALDESK_FUNCTIONS_DIR,
  REQUIRED_DIRECT_VERSIONS.signaldeskFunctions,
  'SignalDesk Functions runtime',
);
verifyRootMailRuntime();
verifyRootDependencyOverrides();
verifyFunctionsDependencyBoundary(MENULIST_FUNCTIONS_DIR, 'MenuList Functions');
verifyFunctionsDependencyBoundary(ANSWERLATTICE_FUNCTIONS_DIR, 'Answerlattice Functions');
verifyFunctionsDependencyBoundary(SIGNALDESK_FUNCTIONS_DIR, 'SignalDesk Functions');
verifyFirebaseAdminModularBoundary();
verifyRootAudit(runAudit(ROOT, 'Root full'), 'Root full');
verifyRootAudit(runAudit(ROOT, 'Root production', { omitDev: true }), 'Root production');
verifyFunctionsAudit(
  runAudit(MENULIST_FUNCTIONS_DIR, 'MenuList Functions full'),
  'MenuList Functions full',
);
verifyFunctionsAudit(
  runAudit(MENULIST_FUNCTIONS_DIR, 'MenuList Functions production', { omitDev: true }),
  'MenuList Functions production',
);
verifyFunctionsAudit(
  runAudit(ANSWERLATTICE_FUNCTIONS_DIR, 'Answerlattice Functions full'),
  'Answerlattice Functions full',
);
verifyFunctionsAudit(
  runAudit(ANSWERLATTICE_FUNCTIONS_DIR, 'Answerlattice Functions production', { omitDev: true }),
  'Answerlattice Functions production',
);
verifyFunctionsAudit(
  runAudit(SIGNALDESK_FUNCTIONS_DIR, 'SignalDesk Functions full'),
  'SignalDesk Functions full',
);
verifyFunctionsAudit(
  runAudit(SIGNALDESK_FUNCTIONS_DIR, 'SignalDesk Functions production', { omitDev: true }),
  'SignalDesk Functions production',
);

console.log('Repository dependency security audit verification passed');
