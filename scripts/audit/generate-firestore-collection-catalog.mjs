#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, '__docs__', 'audits', 'data-flow-pipeline-deep-audit.collections.csv');

const SOURCE_ROOTS = [
  'src/',
  'functions/src/',
  'functions-answerlattice/src/',
  'functions-signaldesk/src/',
  'scripts/',
];

const ROOT_FIRESTORE_FILES = new Set([
  'firestore.rules',
  'firestore.indexes.json',
  'firestore-answerlattice.rules',
  'firestore-answerlattice.indexes.json',
]);

const SOURCE_EXTENSIONS = /\.(?:cjs|js|jsx|mjs|rules|ts|tsx)$/;
const SKIP_PATHS = [
  '__docs__/audits/data-flow-pipeline-deep-audit.',
  'scripts/audit/generate-firestore-collection-catalog.mjs',
];

function trackedSourceFiles() {
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
  ).toString('utf8').split('\0').filter(Boolean);

  return files
    .filter((file) => existsSync(path.join(ROOT, file)))
    .filter((file) => SOURCE_ROOTS.some((root) => file.startsWith(root)) || ROOT_FIRESTORE_FILES.has(file))
    .filter((file) => SOURCE_EXTENSIONS.test(file) || ROOT_FIRESTORE_FILES.has(file))
    .filter((file) => !SKIP_PATHS.some((skip) => file.startsWith(skip)))
    .sort((a, b) => a.localeCompare(b));
}

function parseConstantFile(relativePath, namespace) {
  const content = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const values = new Map();
  for (const match of content.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*:\s*['"]([^'"]+)['"]/gm)) {
    values.set(`${namespace}.${match[1]}`, match[2]);
  }
  return values;
}

const constantValues = new Map([
  ...parseConstantFile('src/constants/database.ts', 'DB_COLLECTIONS'),
  ...parseConstantFile('src/constants/answerlattice/database.ts', 'ANSWERLATTICE_DB_COLLECTIONS'),
  ...parseConstantFile('functions/src/constants/database.ts', 'FUNCTIONS_DB_COLLECTIONS'),
  ...parseConstantFile('functions-answerlattice/src/constants/database.ts', 'ANSWERLATTICE_FUNCTIONS_DB_COLLECTIONS'),
]);

const valuesByKey = new Map();
for (const [key, value] of constantValues) {
  const suffix = key.split('.').at(-1);
  const candidates = [key, `DB_COLLECTIONS.${suffix}`, `ANSWERLATTICE_DB_COLLECTIONS.${suffix}`];
  for (const candidate of candidates) {
    const existing = valuesByKey.get(candidate);
    if (existing && existing !== value) {
      valuesByKey.set(candidate, null);
    } else if (!valuesByKey.has(candidate)) {
      valuesByKey.set(candidate, value);
    }
  }
}

function productFor(file) {
  if (file.startsWith('functions-answerlattice/') || file.includes('/answerlattice/') || file.startsWith('firestore-answerlattice.')) return 'Answerlattice';
  if (file.startsWith('functions-signaldesk/') || file.includes('/signaldesk/')) return 'SignalDesk';
  if (file.includes('/canonica/')) return 'Canonica';
  return 'MenuList/shared';
}

function classifyContext(context) {
  const kinds = [];
  if (/\b(?:getDoc|getDocs|onSnapshot|transaction\.get|\.get\s*\(|where\s*\(|orderBy\s*\(|limit\s*\()/.test(context)) kinds.push('read/query');
  if (/\b(?:setDoc|updateDoc|addDoc|createDocument|transaction\.(?:set|update)|batch\.(?:set|update)|\.set\s*\(|\.update\s*\(|\.create\s*\()/.test(context)) kinds.push('write');
  if (/\b(?:deleteDoc|transaction\.delete|batch\.delete|\.delete\s*\()/.test(context)) kinds.push('delete');
  if (/\b(?:runTransaction|writeBatch|\.batch\s*\()/.test(context)) kinds.push('transaction/batch');
  if (/\b(?:revalidateTag|revalidatePath|mutate|invalidate|cache)/i.test(context)) kinds.push('cache/derived-state');
  if (/match\s+\//.test(context)) kinds.push('security-rule');
  return kinds.length ? Array.from(new Set(kinds)) : ['reference'];
}

function addEvidence(catalog, collectionName, evidence) {
  if (!collectionName || collectionName.includes('${') || collectionName.includes('/')) return;
  const entry = catalog.get(collectionName) || {
    collectionName,
    constantKeys: new Set(),
    products: new Set(),
    operations: new Set(),
    files: new Set(),
    evidence: [],
  };
  if (evidence.constantKey) entry.constantKeys.add(evidence.constantKey);
  entry.products.add(evidence.product);
  evidence.operations.forEach((operation) => entry.operations.add(operation));
  entry.files.add(evidence.file);
  if (entry.evidence.length < 80) entry.evidence.push(`${evidence.file}:${evidence.line}`);
  catalog.set(collectionName, entry);
}

const catalog = new Map();

for (const file of trackedSourceFiles()) {
  const content = readFileSync(path.join(ROOT, file), 'utf8');
  const lines = content.split(/\r?\n/);
  const isFirestoreSource = ROOT_FIRESTORE_FILES.has(file)
    || /(?:firebase-admin|firebase\/firestore|@firebase\/firestore|firestoreAdmin|answerlatticeFirestoreAdmin|DB_COLLECTIONS)/.test(content);

  lines.forEach((line, index) => {
    const context = lines.slice(Math.max(0, index - 4), Math.min(lines.length, index + 5)).join('\n');
    const operations = classifyContext(context);
    const product = productFor(file);

    for (const match of line.matchAll(/\b(?:DB_COLLECTIONS|ANSWERLATTICE_DB_COLLECTIONS)\.([A-Z][A-Z0-9_]*)\b/g)) {
      const constantKey = match[0];
      const collectionName = valuesByKey.get(constantKey);
      if (collectionName) {
        addEvidence(catalog, collectionName, {
          constantKey,
          file,
          line: index + 1,
          operations,
          product,
        });
      }
    }

    if (isFirestoreSource) for (const match of line.matchAll(/\b(?:collection|collectionGroup)\s*\(\s*(?:[^,()\n]+,\s*)?['"]([A-Za-z][A-Za-z0-9_-]{1,80})['"]/g)) {
      addEvidence(catalog, match[1], {
        file,
        line: index + 1,
        operations,
        product,
      });
    }

    if (isFirestoreSource) for (const match of line.matchAll(/\.collection\s*\(\s*['"]([A-Za-z][A-Za-z0-9_-]{1,80})['"]\s*\)/g)) {
      addEvidence(catalog, match[1], {
        file,
        line: index + 1,
        operations,
        product,
      });
    }

    for (const match of line.matchAll(/^\s*match\s+\/([A-Za-z][A-Za-z0-9_-]*)\//g)) {
      addEvidence(catalog, match[1], {
        file,
        line: index + 1,
        operations: ['security-rule'],
        product,
      });
    }

    for (const match of line.matchAll(/"collectionGroup"\s*:\s*"([A-Za-z][A-Za-z0-9_-]{1,80})"/g)) {
      addEvidence(catalog, match[1], {
        file,
        line: index + 1,
        operations: ['index definition'],
        product,
      });
    }
  });
}

for (const [constantKey, collectionName] of constantValues) {
  addEvidence(catalog, collectionName, {
    constantKey,
    file: constantKey.startsWith('FUNCTIONS_')
      ? 'functions/src/constants/database.ts'
      : constantKey.startsWith('ANSWERLATTICE_FUNCTIONS_')
        ? 'functions-answerlattice/src/constants/database.ts'
        : constantKey.startsWith('ANSWERLATTICE_')
          ? 'src/constants/answerlattice/database.ts'
          : 'src/constants/database.ts',
    line: 0,
    operations: ['constant definition'],
    product: collectionName.startsWith('answerlattice_') ? 'Answerlattice' : 'MenuList/shared',
  });
}

function csvCell(value) {
  const normalized = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${normalized.replaceAll('"', '""').replaceAll('\n', ' ')}"`;
}

const headers = [
  'collection_name',
  'product_authority',
  'constant_keys',
  'observed_operations',
  'source_file_count',
  'source_files',
  'evidence_locations',
  'review_status',
  'ownership_model',
  'rules_status',
  'index_status',
  'findings',
];

const rows = [headers.map(csvCell).join(',')];
for (const entry of Array.from(catalog.values()).sort((a, b) => a.collectionName.localeCompare(b.collectionName))) {
  rows.push([
    entry.collectionName,
    Array.from(entry.products).sort(),
    Array.from(entry.constantKeys).sort(),
    Array.from(entry.operations).sort(),
    entry.files.size,
    Array.from(entry.files).sort(),
    entry.evidence,
    'inventory-only',
    '',
    entry.operations.has('security-rule') ? 'rule path observed' : 'no rule path observed by catalog',
    '',
    '',
  ].map(csvCell).join(','));
}

writeFileSync(OUTPUT, `${rows.join('\n')}\n`);
process.stdout.write(JSON.stringify({ collections: catalog.size, output: path.relative(ROOT, OUTPUT) }, null, 2));
process.stdout.write('\n');
