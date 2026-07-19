const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_DIR = path.join(ROOT, 'functions-answerlattice');

const ROOT_ALLOWED_HIGH_PACKAGES = new Map([
  ['@mapbox/node-pre-gyp', 'fabric'],
  ['canvas', 'fabric'],
  ['fabric', 'fabric'],
  ['next', 'next'],
  ['next-pwa', 'next-pwa'],
  ['rollup-plugin-terser', 'next-pwa'],
  ['serialize-javascript', 'next-pwa'],
  ['tar', 'fabric'],
  ['workbox-build', 'next-pwa'],
  ['workbox-webpack-plugin', 'next-pwa'],
]);
const ROOT_MAX_HIGH_COUNT = ROOT_ALLOWED_HIGH_PACKAGES.size;

const REQUIRED_DIRECT_VERSIONS = {
  root: {
    '@sentry/nextjs': '10.66.0',
    axios: '1.18.1',
    jspdf: '4.2.1',
    nodemailer9: 'npm:nodemailer@9.0.3',
    'ua-parser-js': '2.0.10',
    uuid: '11.1.1',
    ws: '8.21.1',
  },
  functions: {
    'firebase-admin': '12.7.0',
    'firebase-functions': '5.1.1',
    nodemailer: '9.0.3',
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

function runAudit(cwd, label) {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
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

function verifyRootAudit(report) {
  const counts = report.metadata.vulnerabilities;
  assert(counts.critical === 0, `Root production audit contains ${counts.critical} critical vulnerabilities`);
  assert(
    counts.high <= ROOT_MAX_HIGH_COUNT,
    `Root production audit high count increased from the controlled baseline of ${ROOT_MAX_HIGH_COUNT} to ${counts.high}`,
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
    `Root production audit contains unapproved high vulnerabilities: ${unapprovedHighs.join(', ')}`,
  );

  const directHighs = Object.entries(report.vulnerabilities)
    .filter(([, vulnerability]) => vulnerability.severity === 'high' && vulnerability.isDirect)
    .map(([name]) => name);
  const unexpectedDirectHighs = directHighs.filter(
    (name) => !ROOT_ALLOWED_HIGH_PACKAGES.has(name),
  );
  assert(
    unexpectedDirectHighs.length === 0,
    `Root production audit contains new direct high vulnerabilities: ${unexpectedDirectHighs.join(', ')}`,
  );

  console.log(
    `Root production audit accepted: ${counts.critical} critical, ${counts.high} high, `
      + `${counts.moderate} moderate. Controlled high migration families: `
      + `${[...new Set(ROOT_ALLOWED_HIGH_PACKAGES.values())].join(', ')}.`,
  );
}

function verifyFunctionsAudit(report) {
  const counts = report.metadata.vulnerabilities;
  assert(
    counts.critical === 0 && counts.high === 0,
    `Answerlattice Functions production audit contains ${counts.critical} critical and ${counts.high} high vulnerabilities`,
  );
  console.log(
    `Answerlattice Functions production audit accepted: ${counts.critical} critical, `
      + `${counts.high} high, ${counts.moderate} moderate.`,
  );
}

verifyDirectVersions(ROOT, REQUIRED_DIRECT_VERSIONS.root, 'Root runtime');
verifyDirectVersions(
  FUNCTIONS_DIR,
  REQUIRED_DIRECT_VERSIONS.functions,
  'Answerlattice Functions runtime',
);
verifyRootMailRuntime();
verifyRootAudit(runAudit(ROOT, 'Root production'));
verifyFunctionsAudit(runAudit(FUNCTIONS_DIR, 'Answerlattice Functions production'));

console.log('Answerlattice dependency security audit verification passed');
