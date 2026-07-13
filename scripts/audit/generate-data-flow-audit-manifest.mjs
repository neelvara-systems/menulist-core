#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertNoDuplicateJsonObjectKeys } from './json-object-key-integrity.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, '__docs__', 'audits');
const MANIFEST_PATH = path.join(AUDIT_DIR, 'data-flow-pipeline-deep-audit.manifest.csv');
const EXCLUSIONS_PATH = path.join(AUDIT_DIR, 'data-flow-pipeline-deep-audit.exclusions.csv');
const SUMMARY_PATH = path.join(AUDIT_DIR, 'data-flow-pipeline-deep-audit.manifest-summary.json');
const REVIEW_STATE_PATH = path.join(AUDIT_DIR, 'data-flow-pipeline-deep-audit.review-state.json');

const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.csv', '.html', '.js', '.jsx', '.json', '.md', '.mjs',
  '.rules', '.scss', '.sh', '.srt', '.ts', '.tsx', '.txt', '.vtt', '.webmanifest',
  '.xml', '.yaml', '.yml',
]);

const ASSET_EXTENSIONS = new Set([
  '.gif', '.ico', '.jpeg', '.jpg', '.mp3', '.mp4', '.pdf', '.png', '.svg',
  '.ttf', '.wav', '.webm', '.webp', '.woff2',
]);

const INCLUDED_BASENAMES = new Set([
  '.env.production.example', '.env.staging.example', '.firebaserc', '.npmrc',
  'AGENTS.md', 'Dockerfile', 'package-lock.json', 'package.json',
]);

const EXCLUDED_SEGMENTS = new Map([
  ['node_modules', 'third-party dependency tree; package manifests and lockfiles remain in scope'],
  ['.next', 'Next.js generated build output; next.config.js and source inputs remain in scope'],
  ['.next-audit-build', 'generated Next.js audit build output; next.config.js and source inputs remain in scope'],
  ['.next-answerlattice-audit', 'generated Next.js/Answerlattice audit build output; source inputs remain in scope'],
  ['coverage', 'generated test coverage output; tests and runner configuration remain in scope'],
  ['dist', 'fully derived distribution output; package source and build configuration remain in scope'],
  ['build', 'fully derived build output; source and build configuration remain in scope'],
  ['out', 'fully derived export output; source and export configuration remain in scope'],
]);

const GENERATED_PUBLIC_PATTERNS = [
  /^public\/sw\.js$/,
  /^public\/workbox-[^/]+\.js$/,
  /^public\/worker-[^/]+\.js$/,
  /^public\/worker-[^/]+\.js\.map$/,
];

const GENERATED_AUDIT_OUTPUTS = new Map([
  ['__docs__/audits/data-flow-pipeline-deep-audit.collections.csv', 'generated Firestore collection inventory; generator and manual collection review remain in scope'],
  ['__docs__/audits/data-flow-pipeline-deep-audit.manifest.csv', 'generated coverage inventory; generator and manual review state remain in scope'],
  ['__docs__/audits/data-flow-pipeline-deep-audit.exclusions.csv', 'generated exclusion inventory; generator and exclusion rules remain in scope'],
  ['__docs__/audits/data-flow-pipeline-deep-audit.manifest-summary.json', 'generated inventory summary; generator and review state remain in scope'],
]);

function normalizeFile(file) {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

function getTrackedAndUntrackedFiles() {
  const buffer = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
  );
  return buffer
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(normalizeFile)
    .filter((file) => existsSync(path.join(ROOT, file)))
    .sort((a, b) => a.localeCompare(b));
}

function exclusionFor(file) {
  if (GENERATED_AUDIT_OUTPUTS.has(file)) {
    return {
      reason: GENERATED_AUDIT_OUTPUTS.get(file),
      generator: 'scripts/audit/generate-data-flow-audit-manifest.mjs',
    };
  }

  const segments = file.split('/');
  for (const segment of segments) {
    if (EXCLUDED_SEGMENTS.has(segment)) {
      return {
        reason: EXCLUDED_SEGMENTS.get(segment),
        generator: segment === 'dist' ? 'nearest package build script' : 'repository build/test tooling',
      };
    }
  }

  if (segments.includes('_archive')) {
    return {
      reason: 'historical or superseded artifact; active runtime and active contract documents remain in scope',
      generator: 'not applicable',
    };
  }

  if (GENERATED_PUBLIC_PATTERNS.some((pattern) => pattern.test(file))) {
    return {
      reason: 'generated PWA/service-worker artifact; next.config.js and worker source remain in scope',
      generator: 'next-pwa via npm run build',
    };
  }

  const extension = path.extname(file).toLowerCase();
  const basename = path.basename(file);

  if (['.log', '.map', '.jsonl'].includes(extension)) {
    return {
      reason: 'generated diagnostic, source-map, or session output; producing source remains in scope',
      generator: 'runtime, build, or audit tooling',
    };
  }

  if (basename === '.gitignore' || basename === '.gitkeep') {
    return {
      reason: 'repository-control placeholder with no executable or data contract',
      generator: 'not applicable',
    };
  }

  if (!TEXT_EXTENSIONS.has(extension) && !ASSET_EXTENSIONS.has(extension) && !INCLUDED_BASENAMES.has(basename)) {
    return {
      reason: 'file type has no executable, persistence, routing, contract, test, or public-output role in this repository',
      generator: 'not applicable',
    };
  }

  return null;
}

function readReviewState() {
  if (!existsSync(REVIEW_STATE_PATH)) return {};
  const source = readFileSync(REVIEW_STATE_PATH, 'utf8');
  assertNoDuplicateJsonObjectKeys(source, 'Audit review state');
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Audit review state must be a JSON object keyed by repository-relative file path.');
  }
  return parsed;
}

function readText(file) {
  const extension = path.extname(file).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension) && !INCLUDED_BASENAMES.has(path.basename(file))) return '';
  return readFileSync(path.join(ROOT, file), 'utf8');
}

function unique(values, limit = 12) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

function extractImports(content) {
  const imports = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) imports.push(match[1]);
  }
  return unique(imports);
}

function extractExports(content) {
  const exports = [];
  const namedPattern = /\bexport\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  const listPattern = /\bexport\s*\{([^}]+)\}/g;
  const commonJsPattern = /\bexports\.([A-Za-z_$][\w$]*)\s*=|\bmodule\.exports\s*=/g;
  for (const match of content.matchAll(namedPattern)) exports.push(match[1]);
  for (const match of content.matchAll(listPattern)) {
    for (const item of match[1].split(',')) {
      exports.push(item.trim().split(/\s+as\s+/)[1] || item.trim().split(/\s+as\s+/)[0]);
    }
  }
  for (const match of content.matchAll(commonJsPattern)) exports.push(match[1] || 'module.exports');
  if (/\bexport\s+default\b/.test(content)) exports.push('default');
  return unique(exports);
}

function categoryFor(file) {
  const extension = path.extname(file).toLowerCase();
  const basename = path.basename(file);
  if (ASSET_EXTENSIONS.has(extension)) return 'asset/public-output';
  if (file.endsWith('.rules')) return 'security-rules';
  if (file.includes('/__tests__/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return 'test';
  if (file.startsWith('scripts/verification/') || /\/(verify|test)-[^/]+\.[cm]?[jt]s$/.test(file)) return 'verifier/test';
  if (file.startsWith('functions/') || file.startsWith('functions-answerlattice/') || file.startsWith('functions-signaldesk/')) return 'firebase-functions';
  if (file.startsWith('src/app/api/') && /^route\.[jt]sx?$/.test(basename)) return 'api-route';
  if (file === 'src/middleware.ts' || file === 'middleware.ts') return 'middleware/routing';
  if (file.startsWith('src/app/') && /^(page|layout|template|loading|error|not-found|route)\.[jt]sx?$/.test(basename)) return 'nextjs-entrypoint';
  if (file.startsWith('src/database/')) return 'data-access-layer';
  if (file.startsWith('src/redux/')) return 'redux-state';
  if (file.startsWith('src/hooks/')) return 'hook/state-flow';
  if (file.startsWith('src/types/') || /(?:^|\/)(types?|schemas?)\.[jt]s$/.test(file)) return 'type/schema-contract';
  if (file.startsWith('src/components/')) return 'ui-component';
  if (file.startsWith('src/lib/')) return 'shared-runtime';
  if (file.startsWith('src/constants/') || file.startsWith('src/config/') || file.startsWith('src/data/')) return 'constant/config/data';
  if (file.startsWith('__docs__/') || file.endsWith('.md')) return 'documentation/contract';
  if (file.startsWith('scripts/')) return 'script/maintenance';
  if (extension === '.json' || extension === '.yaml' || extension === '.yml' || extension === '.webmanifest' || extension === '.xml' || extension === '.csv') return 'configuration/data';
  if (extension === '.css' || extension === '.scss' || extension === '.html') return 'presentation/public-output';
  return 'runtime/support';
}

function routeFromFile(file) {
  if (!file.startsWith('src/app/')) return '';
  const route = file
    .replace(/^src\/app\//, '/')
    .replace(/\/(page|layout|template|loading|error|not-found|route)\.[jt]sx?$/, '')
    .replace(/\/\([^/]+\)/g, '')
    .replace(/\/+/g, '/');
  return route || '/';
}

function responsibilityFor(file, category) {
  const stem = path.basename(file, path.extname(file));
  if (category === 'api-route') return `Next.js route handler for ${routeFromFile(file)}`;
  if (category === 'nextjs-entrypoint') return `Next.js ${stem} entry point for ${routeFromFile(file)}`;
  if (category === 'middleware/routing') return 'Host, product, tenant, security-header, and rewrite middleware boundary';
  if (category === 'firebase-functions') return `Firebase Functions or backend support module: ${stem}`;
  if (category === 'data-access-layer') return `Client/server data-access module: ${stem}`;
  if (category === 'redux-state') return `Redux state or persistence module: ${stem}`;
  if (category === 'hook/state-flow') return `React hook and state-flow module: ${stem}`;
  if (category === 'ui-component') return `User-interface component module: ${stem}`;
  if (category === 'type/schema-contract') return `Compile-time or runtime data contract: ${stem}`;
  if (category === 'security-rules') return `Firebase access-control ruleset: ${path.basename(file)}`;
  if (category === 'verifier/test' || category === 'test') return `Regression or boundary verification: ${stem}`;
  if (category === 'documentation/contract') return `Active governance, feature contract, runbook, or audit artifact: ${stem}`;
  if (category === 'asset/public-output') return `First-party binary or vector public/media asset: ${path.basename(file)}`;
  if (category === 'presentation/public-output') return `First-party presentation or rendered-output source: ${path.basename(file)}`;
  if (category === 'configuration/data') return `Runtime, deployment, schema, fixture, manifest, or locale data: ${path.basename(file)}`;
  return `First-party ${category} module: ${stem}`;
}

function detectDataSources(content, file) {
  const sources = [];
  const checks = [
    [/request\.(?:json|text|formData)\s*\(/, 'HTTP request body'],
    [/searchParams|request\.nextUrl|new URL\(/, 'URL/query parameters'],
    [/headers\s*\(|request\.headers|cookies\s*\(/, 'request headers/cookies'],
    [/getDoc\s*\(|getDocs\s*\(|onSnapshot\s*\(|\.get\s*\(\s*\)/, 'Firestore reads'],
    [/firebase-admin|admin\.firestore|Firestore\s*\(/, 'Firebase Admin'],
    [/localStorage\.getItem|sessionStorage\.getItem/, 'browser storage'],
    [/useSelector|useAppSelector|getState\s*\(/, 'Redux state'],
    [/useSWR|SWRConfig/, 'SWR cache'],
    [/process\.env\.|import\.meta\.env/, 'environment configuration'],
    [/\bfetch\s*\(|axios\.|https?\.request/, 'HTTP/external service'],
    [/FormData|FileReader|Blob\b/, 'file/media input'],
  ];
  for (const [pattern, label] of checks) if (pattern.test(content)) sources.push(label);
  if (file.endsWith('.rules')) sources.push('Firebase auth/document state');
  if (file.includes('/locales/') || file.endsWith('.csv') || file.endsWith('.json')) sources.push('static/configured data');
  return unique(sources);
}

function detectDataDestinations(content, file) {
  const destinations = [];
  const checks = [
    [/setDoc\s*\(|updateDoc\s*\(|addDoc\s*\(|deleteDoc\s*\(|writeBatch\s*\(|runTransaction\s*\(/, 'Firestore client writes'],
    [/\.set\s*\(|\.update\s*\(|\.create\s*\(|\.delete\s*\(|bulkWriter\s*\(/, 'server/Admin persistence'],
    [/revalidateTag\s*\(|revalidatePath\s*\(|unstable_cache\s*\(/, 'Next.js cache'],
    [/localStorage\.setItem|localStorage\.removeItem|sessionStorage\.setItem/, 'browser storage'],
    [/\bdispatch\s*\(|\.dispatch\s*\(/, 'Redux state'],
    [/\bmutate\s*\(|useSWRMutation/, 'SWR cache'],
    [/NextResponse\.|Response\s*\(|res\.(?:json|send|status)/, 'HTTP response'],
    [/\bfetch\s*\(|axios\.|https?\.request/, 'HTTP/external service'],
    [/bucket\.|uploadBytes|deleteObject|storagePath/, 'Firebase Storage/media'],
    [/logger\.|secureLog|secureError|logRuntimeFailure|Sentry\./, 'logs/monitoring'],
  ];
  for (const [pattern, label] of checks) if (pattern.test(content)) destinations.push(label);
  if (file.endsWith('.rules')) destinations.push('Firebase authorization decision');
  if (file.startsWith('public/') || file.includes('/locales/')) destinations.push('public/browser output');
  return unique(destinations);
}

function sensitivity(content, file, patterns) {
  return patterns.some((pattern) => pattern.test(file) || pattern.test(content)) ? 'yes' : 'no';
}

function isTestFile(file) {
  return file.includes('/__tests__/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file.startsWith('scripts/verification/') || /(?:^|\/)(verify|test)-[^/]+\.[cm]?[jt]s$/.test(file);
}

function buildTestAssociations(files) {
  const testFiles = files.filter(isTestFile);
  const associations = new Map();
  const genericStems = new Set(['index', 'route', 'page', 'layout', 'types', 'constants', 'config', 'schema']);
  for (const file of files) {
    if (isTestFile(file)) continue;
    const stem = path.basename(file, path.extname(file)).toLowerCase();
    if (stem.length < 5 || genericStems.has(stem)) continue;
    const matches = testFiles.filter((testFile) => path.basename(testFile).toLowerCase().includes(stem));
    if (matches.length > 0) associations.set(file, matches.slice(0, 8));
  }
  return associations;
}

function csvCell(value) {
  const stringValue = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${stringValue.replaceAll('"', '""').replaceAll('\r', ' ').replaceAll('\n', ' ')}"`;
}

function fileDigest(file, content, size) {
  if (!content && size > 5 * 1024 * 1024) return 'omitted-large-binary';
  const buffer = content ? Buffer.from(content, 'utf8') : readFileSync(path.join(ROOT, file));
  return createHash('sha256').update(buffer).digest('hex');
}

function isMissingFileError(error) {
  return Boolean(error && typeof error === 'object' && error.code === 'ENOENT');
}

function main() {
  const reviewState = readReviewState();
  const allFiles = getTrackedAndUntrackedFiles();
  const exclusions = [];
  const inScopeFiles = [];

  for (const file of allFiles) {
    const exclusion = exclusionFor(file);
    if (exclusion) exclusions.push({ file, ...exclusion });
    else inScopeFiles.push(file);
  }

  const testAssociations = buildTestAssociations(inScopeFiles);
  const rows = [];
  let vanishedDuringInventory = 0;

  for (const file of inScopeFiles) {
    try {
      const absolutePath = path.join(ROOT, file);
      const stats = statSync(absolutePath);
      const content = readText(file);
      const category = categoryFor(file);
      const state = reviewState[file] || {};
      const lineCount = content ? content.split(/\r?\n/).length : 0;
      const tests = unique([...(state.tests || []), ...(testAssociations.get(file) || [])], 12);
      const imports = content ? extractImports(content) : [];
      const exports = content ? extractExports(content) : [];
      const sources = content ? detectDataSources(content, file) : [];
      const destinations = content ? detectDataDestinations(content, file) : [];

      rows.push({
        file,
        category,
        responsibility: state.responsibility || responsibilityFor(file, category),
        exports,
        imports,
        dataSources: state.dataSources || sources,
        dataDestinations: state.dataDestinations || destinations,
        tenantSensitive: state.tenantSensitive || sensitivity(content, file, [/tenant/i, /\btId\b/, /multiTenant/, /domainResolver/, /middleware/]),
        persistenceSensitive: state.persistenceSensitive || sensitivity(content, file, [/firestore/i, /storage/i, /database/i, /redux/i, /persist/i, /cache/i, /billing/i, /subscription/i, /payment/i]),
        publicOutputSensitive: state.publicOutputSensitive || sensitivity(content, file, [/public/i, /client\//i, /website/i, /screen/i, /sitemap/i, /robots/i, /manifest/i, /metadata/i, /schema\.org/i]),
        reviewStatus: state.reviewStatus || 'inventory-only',
        auditPass: state.auditPass ?? 0,
        reviewedFunctionsOrRanges: state.reviewedFunctionsOrRanges || '',
        findings: state.findings || [],
        tests,
        lineCount,
        bytes: stats.size,
        sha256: fileDigest(file, content, stats.size),
        reviewedAt: state.reviewedAt || '',
        reviewNotes: state.reviewNotes || '',
      });
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
      vanishedDuringInventory += 1;
    }
  }

  const headers = [
    'file_path', 'category', 'primary_responsibility', 'important_exports', 'important_imports',
    'data_sources', 'data_destinations', 'tenant_sensitive', 'persistence_sensitive',
    'public_output_sensitive', 'review_status', 'audit_pass_number', 'reviewed_functions_or_ranges',
    'findings', 'tests_associated', 'line_count', 'bytes', 'sha256', 'reviewed_at', 'review_notes',
  ];

  const manifestLines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    manifestLines.push([
      row.file, row.category, row.responsibility, row.exports, row.imports,
      row.dataSources, row.dataDestinations, row.tenantSensitive, row.persistenceSensitive,
      row.publicOutputSensitive, row.reviewStatus, row.auditPass, row.reviewedFunctionsOrRanges,
      row.findings, row.tests, row.lineCount, row.bytes, row.sha256, row.reviewedAt, row.reviewNotes,
    ].map(csvCell).join(','));
  }
  writeFileSync(MANIFEST_PATH, `${manifestLines.join('\n')}\n`);

  const exclusionLines = [["file_path", "reason", "generator_or_authority"].map(csvCell).join(',')];
  for (const exclusion of exclusions) {
    exclusionLines.push([exclusion.file, exclusion.reason, exclusion.generator].map(csvCell).join(','));
  }
  writeFileSync(EXCLUSIONS_PATH, `${exclusionLines.join('\n')}\n`);

  const byCategory = {};
  const byReviewStatus = {};
  for (const row of rows) {
    byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    byReviewStatus[row.reviewStatus] = (byReviewStatus[row.reviewStatus] || 0) + 1;
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    repositoryHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    totalDiscoveredFiles: rows.length + exclusions.length,
    vanishedDuringInventory,
    inScopeFiles: rows.length,
    excludedFiles: exclusions.length,
    byCategory: Object.fromEntries(Object.entries(byCategory).sort((a, b) => b[1] - a[1])),
    byReviewStatus: Object.fromEntries(Object.entries(byReviewStatus).sort((a, b) => b[1] - a[1])),
    manifest: path.relative(ROOT, MANIFEST_PATH),
    exclusions: path.relative(ROOT, EXCLUSIONS_PATH),
    reviewState: path.relative(ROOT, REVIEW_STATE_PATH),
  };
  writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
