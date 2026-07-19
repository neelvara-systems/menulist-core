#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALE_DIR = path.join(ROOT, 'public', 'locales', 'menulist.ai');
const OUTPUT_PATH = path.join(
  ROOT,
  'src',
  'data',
  'generated',
  'publicCustomerMessages.json',
);
const SOURCE_LOCALE = 'en-US';
const CHECK = process.argv.includes('--check');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseLocaleRegistry() {
  const common = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'common.ts'), 'utf8');
  const registryMatch = common.match(/export const APP_LANGUAGES = \[([\s\S]*?)\n\]/);
  assert(registryMatch, 'APP_LANGUAGES registry could not be read');
  return [...registryMatch[1].matchAll(/value:\s*"([^"]+)"/g)]
    .map((match) => match[1]);
}

function flattenStrings(value, prefix = '', output = {}) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Public customer messages must be an object');
  for (const [key, child] of Object.entries(value)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      output[childPath] = child;
      continue;
    }
    assert(child && typeof child === 'object' && !Array.isArray(child), `${childPath} must be a string or object`);
    flattenStrings(child, childPath, output);
  }
  return output;
}

function getPublicCustomerSubtree(locale) {
  const messages = readJson(path.join(LOCALE_DIR, `${locale}.json`));
  const subtree = messages?.BusinessSettings?.publicCustomer;
  assert(subtree, `${locale} is missing BusinessSettings.publicCustomer`);
  return flattenStrings(subtree);
}

function main() {
  const locales = parseLocaleRegistry();
  const sourceMessages = getPublicCustomerSubtree(SOURCE_LOCALE);
  const sourceKeys = Object.keys(sourceMessages).sort();
  const generated = {};

  for (const locale of locales) {
    const messages = getPublicCustomerSubtree(locale);
    const localeKeys = Object.keys(messages).sort();
    assert(
      JSON.stringify(localeKeys) === JSON.stringify(sourceKeys),
      `${locale} public-customer keys do not match ${SOURCE_LOCALE}`,
    );
    generated[locale] = Object.fromEntries(sourceKeys.map((key) => [key, messages[key]]));
  }

  const serialized = `${JSON.stringify(generated, null, 2)}\n`;
  if (CHECK) {
    assert(fs.existsSync(OUTPUT_PATH), 'Generated public customer message bundle is missing');
    assert(
      fs.readFileSync(OUTPUT_PATH, 'utf8') === serialized,
      'Generated public customer message bundle is stale; run npm run sync:public-customer-messages',
    );
    console.log(
      `Public customer message bundle is current: ${sourceKeys.length} messages across ${locales.length} locales.`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, serialized);
  console.log(
    `Generated ${sourceKeys.length} public customer messages across ${locales.length} locales.`,
  );
}

main();
