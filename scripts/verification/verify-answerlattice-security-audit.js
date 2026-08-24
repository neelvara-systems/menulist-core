const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MENULIST_FUNCTIONS_DIR = path.join(ROOT, 'functions');
const ANSWERLATTICE_FUNCTIONS_DIR = path.join(ROOT, 'functions-answerlattice');
const SIGNALDESK_FUNCTIONS_DIR = path.join(ROOT, 'functions-signaldesk');

const ROOT_MAX_HIGH_COUNT = 0;
const ROOT_MAX_MODERATE_COUNT = 0;

const REQUIRED_DIRECT_VERSIONS = {
  root: {
    '@sentry/nextjs': '10.66.0',
    fabric: '7.4.0',
    'firebase-admin': '14.2.0',
    jspdf: '4.2.1',
    next: '16.3.0',
    'brace-expansion': '1.1.18',
    'fast-uri': '3.1.5',
    nodemailer9: 'npm:nodemailer@9.0.3',
    'ua-parser-js': '2.0.10',
    uuid: '11.1.1',
    ws: '8.21.1',
  },
  menulistFunctions: {
    '@google/genai': '2.13.0',
    '@sentry/node': '10.68.0',
    'firebase-admin': '13.10.0',
    'firebase-functions': '7.3.0',
    nodemailer: '9.0.3',
    razorpay: '2.9.8',
  },
  answerlatticeFunctions: {
    '@google/genai': '2.13.0',
    'firebase-admin': '13.10.0',
    'firebase-functions': '7.3.0',
    nodemailer: '9.0.3',
  },
  signaldeskFunctions: {
    'firebase-admin': '13.10.0',
    'firebase-functions': '7.3.0',
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
  assert(
    packageJson.overrides?.exceljs?.archiver === '8.0.0'
      && packageJson.overrides?.exceljs?.unzipper === '0.12.5'
      && packageJson.overrides?.['google-gax']?.rimraf === '6.1.3'
      && packageJson.overrides?.sucrase?.glob === '13.0.6'
      && packageJson.devDependencies?.['brace-expansion'] === '1.1.18'
      && packageJson.devDependencies?.['fast-uri'] === '3.1.5',
    'Root production brace-expansion consumers must stay on compatible patched chains',
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
  if (cwd === MENULIST_FUNCTIONS_DIR) {
    assert(
      packageJson.overrides?.['brace-expansion'] === '1.1.18',
      'MenuList Functions must keep its legacy lint chain on patched brace-expansion 1.1.18',
    );
  }
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

function verifyRootAudit(report, label) {
  const counts = report.metadata.vulnerabilities;
  assert(
    counts.critical === 0,
    `${label} audit contains ${counts.critical} critical vulnerabilities`,
  );
  assert(
    counts.high <= ROOT_MAX_HIGH_COUNT,
    `${label} audit high count increased from zero to ${counts.high}`,
  );
  assert(
    counts.moderate <= ROOT_MAX_MODERATE_COUNT,
    `${label} audit moderate count increased from the controlled baseline of ${ROOT_MAX_MODERATE_COUNT} to ${counts.moderate}`,
  );
  assert(
    counts.low === 0,
    `${label} audit contains ${counts.low} low vulnerabilities`,
  );

  assert(counts.total === 0, `${label} audit contains ${counts.total} vulnerabilities`);
  console.log(`${label} audit accepted: 0 vulnerabilities.`);
}

function verifyFunctionsFullAudit(report, label) {
  const counts = report.metadata.vulnerabilities;
  assert(
    counts.total === 0,
    `${label} full audit contains ${counts.total} vulnerabilities: `
      + `${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low`,
  );
  console.log(`${label} full audit accepted: 0 vulnerabilities.`);
}

function verifyFunctionsProductionAudit(report, label) {
  const counts = report.metadata.vulnerabilities;
  assert(
    counts.total === 0,
    `${label} production audit contains ${counts.total} vulnerabilities: `
      + `${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low`,
  );
  console.log(`${label} production audit accepted: 0 vulnerabilities.`);
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
verifyFunctionsFullAudit(
  runAudit(MENULIST_FUNCTIONS_DIR, 'MenuList Functions full'),
  'MenuList Functions full',
);
verifyFunctionsProductionAudit(
  runAudit(MENULIST_FUNCTIONS_DIR, 'MenuList Functions production', { omitDev: true }),
  'MenuList Functions production',
);
verifyFunctionsFullAudit(
  runAudit(ANSWERLATTICE_FUNCTIONS_DIR, 'Answerlattice Functions full'),
  'Answerlattice Functions full',
);
verifyFunctionsProductionAudit(
  runAudit(ANSWERLATTICE_FUNCTIONS_DIR, 'Answerlattice Functions production', { omitDev: true }),
  'Answerlattice Functions production',
);
verifyFunctionsFullAudit(
  runAudit(SIGNALDESK_FUNCTIONS_DIR, 'SignalDesk Functions full'),
  'SignalDesk Functions full',
);
verifyFunctionsProductionAudit(
  runAudit(SIGNALDESK_FUNCTIONS_DIR, 'SignalDesk Functions production', { omitDev: true }),
  'SignalDesk Functions production',
);

console.log('Repository dependency security audit verification passed');
