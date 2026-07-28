#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertNoDuplicateJsonObjectKeys } from './json-object-key-integrity.mjs';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, '__docs__', 'audits', 'data-flow-pipeline-deep-audit.collections.csv');
const REVIEW_STATE_PATH = path.join(
  ROOT,
  '__docs__',
  'audits',
  'data-flow-pipeline-deep-audit.collection-review-state.json',
);
const FILE_REVIEW_STATE_PATH = path.join(
  ROOT,
  '__docs__',
  'audits',
  'data-flow-pipeline-deep-audit.review-state.json',
);

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
  'firestore-campaigncue.rules',
  'firestore-campaigncue.indexes.json',
  'firestore-signaldesk.rules',
  'firestore-signaldesk.indexes.json',
]);

const FIRESTORE_RULE_PATH_WRAPPERS = new Set(['databases', 'documents']);

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

const trackedFiles = trackedSourceFiles();

function parseConstantObject(relativePath, objectName, namespace = objectName) {
  const content = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const escapedObjectName = objectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = content.match(new RegExp(
    `export\\s+const\\s+${escapedObjectName}\\s*=\\s*\\{([\\s\\S]*?)^\\}\\s*(?:as\\s+const)?\\s*;`,
    'm',
  ));
  if (!block) throw new Error(`Missing collection constant object ${objectName} in ${relativePath}`);
  const values = new Map();
  for (const match of block[1].matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*:\s*['"]([^'"]+)['"]/gm)) {
    values.set(`${namespace}.${match[1]}`, match[2]);
  }
  return values;
}

function parseScalarConstant(relativePath, constantName) {
  const content = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const escapedConstantName = constantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(
    `export\\s+const\\s+${escapedConstantName}\\s*=\\s*['"]([^'"]+)['"]`,
  ));
  if (!match) throw new Error(`Missing collection scalar ${constantName} in ${relativePath}`);
  return new Map([[constantName, match[1]]]);
}

function parseCollectionProperties(relativePath, objectName, namespace = objectName) {
  return new Map(
    Array.from(parseConstantObject(relativePath, objectName, namespace))
      .filter(([constantKey]) => constantKey.endsWith('_COLLECTION')),
  );
}

const constantDefinitions = [
  ['src/constants/database.ts', parseConstantObject('src/constants/database.ts', 'DB_COLLECTIONS', 'DB_COLLECTIONS')],
  ['src/constants/database.ts', parseConstantObject('src/constants/database.ts', 'AI_OPERATIONS_COLLECTIONS', 'AI_OPERATIONS_COLLECTIONS')],
  ['src/constants/database.ts', parseScalarConstant('src/constants/database.ts', 'FONT_PRESET_ASSET_COLLECTION')],
  ['src/constants/database.ts', parseConstantObject('src/constants/database.ts', 'STATIC_ASSET_COLLECTIONS', 'STATIC_ASSET_COLLECTIONS')],
  ['src/constants/answerlattice/database.ts', parseConstantObject('src/constants/answerlattice/database.ts', 'ANSWERLATTICE_DB_COLLECTIONS', 'ANSWERLATTICE_DB_COLLECTIONS')],
  ['src/constants/signaldesk/database.ts', parseConstantObject('src/constants/signaldesk/database.ts', 'SIGNALDESK_COLLECTIONS', 'SIGNALDESK_COLLECTIONS')],
  ['src/constants/campaigncue/database.ts', parseConstantObject('src/constants/campaigncue/database.ts', 'CAMPAIGNCUE_COLLECTIONS', 'CAMPAIGNCUE_COLLECTIONS')],
  ['src/constants/campaigncue/packTemplates.ts', parseCollectionProperties(
    'src/constants/campaigncue/packTemplates.ts',
    'CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY',
    'CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY',
  )],
  ['src/data/shared/ownerNotificationRegistry.ts', parseConstantObject(
    'src/data/shared/ownerNotificationRegistry.ts',
    'OWNER_NOTIFICATION_COLLECTIONS',
    'OWNER_NOTIFICATION_COLLECTIONS',
  )],
  ['functions/src/constants/database.ts', parseConstantObject('functions/src/constants/database.ts', 'DB_COLLECTIONS', 'FUNCTIONS_DB_COLLECTIONS')],
  ['functions-answerlattice/src/constants/database.ts', parseConstantObject('functions-answerlattice/src/constants/database.ts', 'DB_COLLECTIONS', 'ANSWERLATTICE_FUNCTIONS_DB_COLLECTIONS')],
  ['functions-signaldesk/src/constants/database.ts', parseConstantObject('functions-signaldesk/src/constants/database.ts', 'SIGNALDESK_COLLECTIONS', 'SIGNALDESK_FUNCTIONS_COLLECTIONS')],
];

const constantValues = new Map(constantDefinitions.flatMap(([, values]) => Array.from(values)));

function productFor(file) {
  const normalized = file.toLowerCase();
  if (normalized.includes('answerlattice')) return 'Answerlattice';
  if (normalized.includes('signaldesk')) return 'SignalDesk';
  if (normalized.includes('campaigncue')) return 'CampaignCue';
  if (normalized.includes('canonica')) return 'Canonica';
  return 'MenuList/shared';
}

function resolveCollectionConstant(file, constantKey) {
  const exact = constantValues.get(constantKey);
  if (exact) return exact;
  if (!constantKey.startsWith('DB_COLLECTIONS.')) return null;

  const suffix = constantKey.slice('DB_COLLECTIONS.'.length);
  const product = productFor(file);
  const candidates = product === 'Answerlattice'
    ? [
      `ANSWERLATTICE_DB_COLLECTIONS.${suffix}`,
      `ANSWERLATTICE_FUNCTIONS_DB_COLLECTIONS.${suffix}`,
      `DB_COLLECTIONS.${suffix}`,
      `FUNCTIONS_DB_COLLECTIONS.${suffix}`,
    ]
    : file.startsWith('functions/src/')
      ? [
        `FUNCTIONS_DB_COLLECTIONS.${suffix}`,
        `DB_COLLECTIONS.${suffix}`,
      ]
      : [
        `DB_COLLECTIONS.${suffix}`,
        `FUNCTIONS_DB_COLLECTIONS.${suffix}`,
      ];
  for (const candidate of candidates) {
    const value = constantValues.get(candidate);
    if (value) return value;
  }
  // The root DB_COLLECTIONS object re-exports product-local registries with
  // object spreads. Generic shared files do not necessarily contain the
  // product name in their path, so filename routing alone can miss those
  // aliases. Admit an otherwise unresolved suffix only when every registered
  // namespace that defines it resolves to one identical collection value.
  const suffixValues = new Set();
  for (const [candidate, value] of constantValues) {
    if (candidate.endsWith(`.${suffix}`)) suffixValues.add(value);
  }
  if (suffixValues.size === 1) return Array.from(suffixValues)[0];
  return null;
}

function parseCollectionRegistryDefinitions() {
  const registries = new Map();
  for (const file of trackedFiles) {
    const content = readFileSync(path.join(ROOT, file), 'utf8');
    for (const match of content.matchAll(
      /\bexport\s+const\s+([A-Za-z_$][\w$]*)[\s\S]{0,240}?=\s*\[([\s\S]*?)\]\s*as\s+const\s*;/g,
    )) {
      const members = new Map();
      for (const member of match[2].matchAll(
        /\bcollection\s*:\s*((?:DB_COLLECTIONS|ANSWERLATTICE_DB_COLLECTIONS|AI_OPERATIONS_COLLECTIONS|SIGNALDESK_COLLECTIONS|CAMPAIGNCUE_COLLECTIONS)\.[A-Z][A-Z0-9_]*)\b/g,
      )) {
        const collectionName = resolveCollectionConstant(file, member[1]);
        if (collectionName) members.set(member[1], collectionName);
      }
      if (members.size > 0) registries.set(match[1], members);
    }
  }
  return registries;
}

const collectionRegistryDefinitions = parseCollectionRegistryDefinitions();

function classifyCollectionRegistryConsumer(content) {
  const operations = new Set(['reference']);
  if (
    /\.collection\s*\(\s*[A-Za-z_$][\w$]*\.collection\s*\)/.test(content)
    && /\.get\s*\(/.test(content)
  ) {
    operations.add('read/query');
  }
  if (/\bbatch\.delete\s*\(/.test(content)) operations.add('delete');
  if (/\b(?:runTransaction|writeBatch|\.batch\s*\()/.test(content)) operations.add('transaction/batch');
  return Array.from(operations);
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

function addLiteralPathEvidence({
  file,
  line,
  operations,
  pathSegments,
  product,
}) {
  for (let index = 0; index < pathSegments.length; index += 2) {
    const collectionName = pathSegments[index];
    if (!/^[A-Za-z][A-Za-z0-9_-]{1,80}$/.test(collectionName ?? '')) continue;
    addEvidence(catalog, collectionName, {
      file,
      line,
      operations,
      product,
    });
  }
}

function splitTopLevelCallArguments(source) {
  const args = [];
  let current = '';
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (const char of source) {
    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      current += char;
      continue;
    }
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function findModularFirestoreCalls(content) {
  const calls = [];
  const pattern = /\b(doc|collection)\s*\(/g;
  for (const match of content.matchAll(pattern)) {
    let depth = 1;
    let quote = null;
    let escaped = false;
    let cursor = match.index + match[0].length;
    for (; cursor < content.length && depth > 0; cursor += 1) {
      const char = content[cursor];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
      } else if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
      }
    }
    if (depth !== 0) continue;
    calls.push({
      args: splitTopLevelCallArguments(content.slice(
        match.index + match[0].length,
        cursor - 1,
      )),
      index: match.index,
      name: match[1],
    });
  }
  return calls;
}

function resolveCollectionArgument(argument, values) {
  const literal = argument.match(/^(['"])([A-Za-z][A-Za-z0-9_-]{1,80})\1$/);
  if (literal) return literal[2];
  return values.get(argument) ?? null;
}

function loadCollectionReviewState() {
  if (!existsSync(REVIEW_STATE_PATH)) return {};
  const source = readFileSync(REVIEW_STATE_PATH, 'utf8');
  assertNoDuplicateJsonObjectKeys(source, 'Firestore collection review state');
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Firestore collection review state must be an object');
  }

  for (const [collectionName, review] of Object.entries(parsed)) {
    if (!review || typeof review !== 'object' || Array.isArray(review)) {
      throw new Error(`Invalid collection review state for ${collectionName}`);
    }
    if (!['inventory-only', 'in-progress', 'reviewed'].includes(review.reviewStatus)) {
      throw new Error(`Invalid collection review status for ${collectionName}`);
    }
    for (const field of ['ownershipModel', 'rulesStatus', 'indexStatus']) {
      if (typeof review[field] !== 'string') {
        throw new Error(`Invalid ${field} for ${collectionName}`);
      }
    }
    if (!Array.isArray(review.findings) || review.findings.some((finding) => typeof finding !== 'string')) {
      throw new Error(`Invalid findings for ${collectionName}`);
    }
    if (
      review.reviewedEvidenceSha256 !== undefined
      && !/^[a-f0-9]{64}$/.test(review.reviewedEvidenceSha256)
    ) {
      throw new Error(`Invalid reviewedEvidenceSha256 for ${collectionName}`);
    }
  }
  return parsed;
}

const collectionReviewState = loadCollectionReviewState();

function loadFileReviewState() {
  const source = readFileSync(FILE_REVIEW_STATE_PATH, 'utf8');
  assertNoDuplicateJsonObjectKeys(source, 'Audit review state');
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Audit review state must be an object');
  }
  return parsed;
}

const fileReviewState = loadFileReviewState();

function hasCurrentFileReview(file) {
  const review = fileReviewState[file];
  if (
    !review
    || review.reviewStatus !== 'reviewed'
    || !/^[a-f0-9]{64}$/.test(review.reviewedSha256 ?? '')
  ) return false;
  const digest = createHash('sha256')
    .update(readFileSync(path.join(ROOT, file)))
    .digest('hex');
  return review.reviewedSha256 === digest;
}

for (const file of trackedFiles) {
  const content = readFileSync(path.join(ROOT, file), 'utf8');
  const lines = content.split(/\r?\n/);
  const importsRealtimeDatabase = /from\s*['"](?:@firebase|firebase)\/database['"]/.test(content);
  const importsFirestore = /(?:firebase-admin|firebase\/firestore|@firebase\/firestore|firestoreAdmin|answerlatticeFirestoreAdmin)/.test(content);
  const isRealtimeDatabaseOnlySource = importsRealtimeDatabase && !importsFirestore;
  const isFirestoreSource = !isRealtimeDatabaseOnlySource && (
    ROOT_FIRESTORE_FILES.has(file)
    || /(?:firebase-admin|firebase\/firestore|@firebase\/firestore|firestoreAdmin|answerlatticeFirestoreAdmin|DB_COLLECTIONS|AI_OPERATIONS_COLLECTIONS|SIGNALDESK_COLLECTIONS|CAMPAIGNCUE_COLLECTIONS|CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY|OWNER_NOTIFICATION_COLLECTIONS)/.test(content)
  );
  const localCollectionConstants = new Map();
  for (const match of content.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*['"]([A-Za-z][A-Za-z0-9_-]{1,80})['"]/g)) {
    const [, constantKey, collectionName] = match;
    const escapedKey = constantKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (
      new RegExp(`(?:collectionName\\s*:\\s*${escapedKey}\\b|(?:collection|collectionGroup)\\s*\\([^)]*\\b${escapedKey}\\b|\\.collection\\s*\\(\\s*${escapedKey}\\b)`).test(content)
    ) {
      localCollectionConstants.set(constantKey, collectionName);
    }
  }
  const templatePathAliases = new Map();
  for (const match of content.matchAll(/\bconst\s+([A-Za-z_$][\w$]*(?:Path|Collection))\s*=\s*`([A-Za-z][A-Za-z0-9_-]{1,80})\/\$\{/g)) {
    templatePathAliases.set(match[1], match[2]);
  }
  const product = productFor(file);
  const collectionArgumentValues = new Map([...constantValues, ...localCollectionConstants]);

  // Some shared services select a collection through a product-aware target
  // object and then pass only a DocumentReference into generic transaction
  // helpers. Their collection identity and operation sites never coexist in a
  // statically resolvable SDK call. Permit an explicit, closed operation
  // annotation so those real indirect effects remain in reverse-flow evidence.
  for (const match of content.matchAll(
    /@firestore-collection-evidence\s+([A-Za-z_$][\w$]*(?:\.[A-Z][A-Z0-9_]*)?)\s+operations=([a-z/,|-]+)/g,
  )) {
    const collectionName = resolveCollectionArgument(match[1], collectionArgumentValues)
      || resolveCollectionConstant(file, match[1]);
    if (!collectionName) {
      throw new Error(`Unresolved Firestore collection evidence annotation ${match[1]} in ${file}`);
    }
    const operations = match[2].split('|');
    const allowedOperations = new Set([
      'cache/derived-state',
      'delete',
      'read/query',
      'reference',
      'security-rule',
      'transaction/batch',
      'write',
    ]);
    if (
      operations.length === 0
      || operations.some((operation) => !allowedOperations.has(operation))
    ) {
      throw new Error(`Invalid Firestore collection evidence operations in ${file}`);
    }
    addEvidence(catalog, collectionName, {
      constantKey: collectionArgumentValues.has(match[1]) ? match[1] : undefined,
      file,
      line: content.slice(0, match.index).split(/\r?\n/).length,
      operations,
      product,
    });
  }

  // Runtime registry arrays can carry collection identities into generic
  // consumers such as bounded erasure workers. Attach every registry consumer
  // to every member so reverse-flow evidence does not stop at the definition.
  for (const [registryName, members] of collectionRegistryDefinitions) {
    const registryPattern = new RegExp(`\\b${registryName}\\b`, 'g');
    const occurrences = Array.from(content.matchAll(registryPattern));
    if (occurrences.length === 0) continue;
    const line = content.slice(0, occurrences[0].index).split(/\r?\n/).length;
    const operations = classifyCollectionRegistryConsumer(content);
    for (const [constantKey, collectionName] of members) {
      addEvidence(catalog, collectionName, {
        constantKey,
        file,
        line,
        operations,
        product,
      });
    }
  }

  if (isFirestoreSource) {
    for (const call of findModularFirestoreCalls(content)) {
      const line = content.slice(0, call.index).split(/\r?\n/).length;
      const context = lines.slice(Math.max(0, line - 6), Math.min(lines.length, line + 5)).join('\n');
      const pathArguments = call.args.slice(1);
      // `doc(collectionRef, documentId)` contributes no collection segment of
      // its own. Direct modular document paths always include at least the
      // collection and document-id pair after the Firestore argument.
      if (call.name === 'doc' && pathArguments.length < 2) continue;
      for (let index = 0; index < pathArguments.length; index += 2) {
        const argument = pathArguments[index];
        const collectionName = resolveCollectionArgument(argument, collectionArgumentValues);
        if (!collectionName) continue;
        const constantKey = collectionArgumentValues.has(argument) ? argument : undefined;
        addEvidence(catalog, collectionName, {
          constantKey,
          file,
          line,
          operations: classifyContext(context),
          product,
        });
      }
    }

    for (const match of content.matchAll(/['"`]match\s+\/([A-Za-z][A-Za-z0-9_-]{1,80})\/\{/g)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      const context = lines.slice(Math.max(0, line - 4), Math.min(lines.length, line + 3)).join('\n');
      if (!/firestore/i.test(context)) continue;
      addEvidence(catalog, match[1], {
        file,
        line,
        operations: ['security-rule'],
        product,
      });
    }
  }

  // Rules emulators often keep full document paths in immutable `*_PATHS`
  // matrices and later call `doc(db, segments.join('/'))`. The matrix itself
  // is executable collection evidence even though the call has no literal.
  if (
    isFirestoreSource
    && /\bdoc\s*\([\s\S]{0,200}\.join\(\s*['"]\/['"]\s*\)/.test(content)
  ) {
    for (const match of content.matchAll(
      /\bconst\s+[A-Z][A-Z0-9_]*_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/g,
    )) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      for (const row of match[1].matchAll(/\[((?:\s*['"][^'"]+['"]\s*,?)+)\]/g)) {
        addLiteralPathEvidence({
          file,
          line,
          operations: classifyContext(content),
          pathSegments: Array.from(
            row[1].matchAll(/['"]([^'"]+)['"]/g),
            (segment) => segment[1],
          ),
          product,
        });
      }
    }
  }

  // Security verifiers may enumerate complete collection families and then
  // resolve each corresponding `match` block dynamically. Preserve those
  // executable rule-contract lists even when no SDK call contains the literal.
  if (isFirestoreSource && /firestoreRules|firestore\.rules/i.test(content)) {
    for (const match of content.matchAll(
      /\bconst\s+[A-Za-z_$][\w$]*Collections\s*=\s*\[([\s\S]*?)\]\s*;/g,
    )) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      for (const literal of match[1].matchAll(/['"]([A-Za-z][A-Za-z0-9_-]{1,80})['"]/g)) {
        addEvidence(catalog, literal[1], {
          file,
          line,
          operations: ['security-rule'],
          product,
        });
      }
    }
  }

  lines.forEach((line, index) => {
    const context = lines.slice(Math.max(0, index - 4), Math.min(lines.length, index + 5)).join('\n');
    const operations = classifyContext(context);

    if (isFirestoreSource) for (const match of line.matchAll(/\b(?:DB_COLLECTIONS|ANSWERLATTICE_DB_COLLECTIONS|AI_OPERATIONS_COLLECTIONS|SIGNALDESK_COLLECTIONS|CAMPAIGNCUE_COLLECTIONS|CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY|OWNER_NOTIFICATION_COLLECTIONS)\.([A-Z][A-Z0-9_]*)\b/g)) {
      const constantKey = match[0];
      const collectionName = resolveCollectionConstant(file, constantKey);
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

    // Scalar collection constants (currently FONT_PRESET_ASSET_COLLECTION)
    // participate in composed collection paths and must retain their real
    // producers/consumers in the reverse catalog just like object members.
    for (const [constantKey, collectionName] of constantValues) {
      if (constantKey.includes('.')) continue;
      const scalarPattern = new RegExp(`\\b${constantKey}\\b`);
      if (!scalarPattern.test(line)) continue;
      addEvidence(catalog, collectionName, {
        constantKey,
        file,
        line: index + 1,
        operations,
        product,
      });
    }

    for (const [constantKey, collectionName] of localCollectionConstants) {
      if (!new RegExp(`\\b${constantKey}\\b`).test(line)) continue;
      addEvidence(catalog, collectionName, {
        constantKey,
        file,
        line: index + 1,
        operations,
        product,
      });
    }

    for (const [alias, collectionName] of templatePathAliases) {
      if (
        !new RegExp(`(?:\\b(?:doc|collection)\\s*\\([^,\\n]+,\\s*${alias}\\b|\\.collection\\s*\\(\\s*${alias}\\b)`).test(line)
      ) continue;
      addEvidence(catalog, collectionName, {
        file,
        line: index + 1,
        operations,
        product,
      });
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

    // Both SDKs accept slash-delimited literal document/collection paths.
    // Retain every collection-position segment rather than discarding the
    // entire literal because it contains `/`.
    if (isFirestoreSource) {
      for (const match of line.matchAll(
        /\b(?:doc|collection)\s*\(\s*[^,\n]+,\s*['"]([A-Za-z][A-Za-z0-9_-]*\/[A-Za-z0-9_/-]{1,499})['"]/g,
      )) {
        addLiteralPathEvidence({
          file,
          line: index + 1,
          operations,
          pathSegments: match[1].split('/'),
          product,
        });
      }
      for (const match of line.matchAll(
        /\.(?:doc|collection)\s*\(\s*['"]([A-Za-z][A-Za-z0-9_-]*\/[A-Za-z0-9_/-]{1,499})['"]/g,
      )) {
        addLiteralPathEvidence({
          file,
          line: index + 1,
          operations,
          pathSegments: match[1].split('/'),
          product,
        });
      }
    }

    // Firestore match paths alternate collection/document segments. Retain
    // every literal collection-position segment, including roots followed by a
    // literal document ID, without misclassifying literal document positions.
    // Dynamic collection positions require an explicit evidence annotation.
    if (/^\s*match\s+\//.test(line)) {
      const matchPath = line.match(/^\s*match\s+\/([^\s]+)\s*\{/);
      const pathSegments = matchPath?.[1]?.split('/') ?? [];
      for (let segmentIndex = 0; segmentIndex < pathSegments.length; segmentIndex += 2) {
        const segment = pathSegments[segmentIndex];
        if (
          !/^[A-Za-z][A-Za-z0-9_-]*$/.test(segment)
          || FIRESTORE_RULE_PATH_WRAPPERS.has(segment)
        ) continue;
        addEvidence(catalog, segment, {
          file,
          line: index + 1,
          operations: ['security-rule'],
          product,
        });
      }
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

for (const [file, values] of constantDefinitions) {
  for (const [constantKey, collectionName] of values) {
    addEvidence(catalog, collectionName, {
      constantKey,
      file,
      line: 0,
      operations: ['constant definition'],
      product: productFor(file),
    });
  }
}

function csvCell(value) {
  const normalized = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${normalized.replaceAll('"', '""').replaceAll('\n', ' ')}"`;
}

function evidenceFingerprint(entry) {
  const sourceDigests = Array.from(entry.files)
    .sort()
    .map((file) => [
      file,
      createHash('sha256').update(readFileSync(path.join(ROOT, file))).digest('hex'),
    ]);
  const canonicalEvidence = {
    collectionName: entry.collectionName,
    constantKeys: Array.from(entry.constantKeys).sort(),
    products: Array.from(entry.products).sort(),
    operations: Array.from(entry.operations).sort(),
    evidence: Array.from(new Set(entry.evidence)).sort(),
    sourceDigests,
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalEvidence))
    .digest('hex');
}

const headers = [
  'collection_name',
  'product_authority',
  'constant_keys',
  'observed_operations',
  'source_file_count',
  'source_files',
  'evidence_locations',
  'evidence_sha256',
  'current_reviewed_source_count',
  'unreviewed_source_files',
  'review_status',
  'ownership_model',
  'rules_status',
  'index_status',
  'findings',
];

const rows = [headers.map(csvCell).join(',')];
for (const entry of Array.from(catalog.values()).sort((a, b) => a.collectionName.localeCompare(b.collectionName))) {
  const review = collectionReviewState[entry.collectionName];
  const evidenceSha256 = evidenceFingerprint(entry);
  const sourceFiles = Array.from(entry.files).sort();
  const unreviewedSourceFiles = sourceFiles.filter((file) => !hasCurrentFileReview(file));
  const requestedReviewStatus = review?.reviewStatus ?? 'inventory-only';
  const reviewStatus = requestedReviewStatus === 'reviewed'
    && (
      review?.reviewedEvidenceSha256 !== evidenceSha256
      || unreviewedSourceFiles.length > 0
    )
    ? 'in-progress'
    : requestedReviewStatus;
  rows.push([
    entry.collectionName,
    Array.from(entry.products).sort(),
    Array.from(entry.constantKeys).sort(),
    Array.from(entry.operations).sort(),
    entry.files.size,
    sourceFiles,
    entry.evidence,
    evidenceSha256,
    sourceFiles.length - unreviewedSourceFiles.length,
    unreviewedSourceFiles,
    reviewStatus,
    review?.ownershipModel ?? '',
    review?.rulesStatus ?? (entry.operations.has('security-rule') ? 'rule path observed' : 'no rule path observed by catalog'),
    review?.indexStatus ?? '',
    review?.findings ?? [],
  ].map(csvCell).join(','));
}

for (const collectionName of Object.keys(collectionReviewState)) {
  if (!catalog.has(collectionName)) {
    throw new Error(`Collection review state references unknown collection: ${collectionName}`);
  }
}

writeFileSync(OUTPUT, `${rows.join('\n')}\n`);
process.stdout.write(JSON.stringify({ collections: catalog.size, output: path.relative(ROOT, OUTPUT) }, null, 2));
process.stdout.write('\n');
