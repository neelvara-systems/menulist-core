import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_PATH = path.join(ROOT, 'firestore.rules');
const OUTPUT_PATH = path.join(ROOT, 'firestore-menulist.rules');
const FUNCTION_PATTERN = /^    function ([A-Za-z0-9_]+)\([^\n]*\) \{/gm;
const MATCH_PATTERN = /^    match \/([^\s]+)\s+\{/gm;

function fail(message) {
  throw new Error(`[MenuList Firestore rules generator] ${message}`);
}

function extractBlocks(source, pattern) {
  const blocks = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const openingBrace = match.index + match[0].lastIndexOf('{');
    let depth = 0;
    let end = openingBrace;

    for (; end < source.length; end += 1) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}' && --depth === 0) {
        end += 1;
        break;
      }
    }

    if (depth !== 0) {
      fail(`Unbalanced block beginning at byte ${match.index}.`);
    }

    blocks.push({
      name: match[1],
      source: source.slice(match.index, end),
    });
  }

  return blocks;
}

function calledFunctions(source, functionNames) {
  return functionNames.filter((name) => new RegExp(`\\b${name}\\s*\\(`).test(source));
}

export function generateMenuListRules(source) {
  if (!source.startsWith("rules_version = '2';")) {
    fail('Canonical firestore.rules must use rules_version 2.');
  }

  const matches = extractBlocks(source, MATCH_PATTERN);
  const functions = extractBlocks(source, FUNCTION_PATTERN);
  const functionMap = new Map(functions.map((entry) => [entry.name, entry]));

  if (functionMap.size !== functions.length) {
    fail('Canonical firestore.rules contains duplicate helper function names.');
  }

  const selectedMatches = matches.filter((entry) => !entry.name.startsWith('answerlattice_'));
  const excludedMatches = matches.filter((entry) => entry.name.startsWith('answerlattice_'));
  const functionNames = [...functionMap.keys()];
  const requiredFunctions = new Set();
  const queue = selectedMatches.flatMap((entry) => calledFunctions(entry.source, functionNames));

  while (queue.length > 0) {
    const name = queue.pop();
    if (requiredFunctions.has(name)) continue;

    requiredFunctions.add(name);
    const helper = functionMap.get(name);
    if (!helper) fail(`Required helper ${name} is missing.`);
    queue.push(...calledFunctions(helper.source, functionNames));
  }

  if (excludedMatches.length === 0) {
    fail('No Answerlattice shared-mode match blocks were found to exclude.');
  }
  if (!selectedMatches.some((entry) => entry.name === '{document=**}')) {
    fail('Canonical firestore.rules is missing the explicit default-deny match block.');
  }

  const selectedFunctions = functions.filter((entry) => requiredFunctions.has(entry.name));
  const body = [...selectedMatches, ...selectedFunctions]
    .map((entry) => entry.source)
    .join('\n\n');

  return [
    "rules_version = '2';",
    '',
    '// GENERATED FILE. DO NOT EDIT.',
    '// Source: firestore.rules',
    '// Purpose: MenuList cloud deployment without Answerlattice shared-emulator namespaces.',
    '',
    'service cloud.firestore {',
    '  match /databases/{database}/documents {',
    body,
    '  }',
    '}',
    '',
  ].join('\n');
}

function main() {
  const generated = generateMenuListRules(fs.readFileSync(SOURCE_PATH, 'utf8'));

  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      fail('firestore-menulist.rules is missing. Run the generator first.');
    }
    if (fs.readFileSync(OUTPUT_PATH, 'utf8') !== generated) {
      fail('firestore-menulist.rules is stale. Run the generator and commit the result.');
    }
    console.log('MenuList Firestore deploy rules are current.');
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, generated);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)} (${Buffer.byteLength(generated)} bytes).`);
}

main();
