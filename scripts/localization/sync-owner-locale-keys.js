#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  SOURCE_LOCALE,
  getOwnerLocaleNamespaces,
} = require('./owner-locale-boundary');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALE_DIR = path.join(ROOT, 'public', 'locales', 'menulist.ai');
const WRITE = process.argv.includes('--write');
const requestedLocaleArg = process.argv.find((argument) => argument.startsWith('--locale='));
const requestedLocale = requestedLocaleArg?.slice('--locale='.length);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function localePath(locale) {
  return path.join(LOCALE_DIR, `${locale}.json`);
}

function parseLocaleRegistry() {
  const common = fs.readFileSync(path.join(ROOT, 'src', 'constants', 'common.ts'), 'utf8');
  const registryMatch = common.match(/export const APP_LANGUAGES = \[([\s\S]*?)\n\]/);
  assert(registryMatch, 'APP_LANGUAGES registry could not be read');
  return [...registryMatch[1].matchAll(/value:\s*"([^"]+)"/g)]
    .map((match) => match[1]);
}

function flattenStrings(value, prefix = '', output = new Map()) {
  if (typeof value === 'string') {
    output.set(prefix, value);
    return output;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  for (const [key, child] of Object.entries(value)) {
    flattenStrings(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function getByPath(value, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current?.[key], value);
}

function setByPath(value, dottedPath, nextValue) {
  const parts = dottedPath.split('.');
  let current = value;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts.at(-1)] = nextValue;
}

function pruneToSourceShape(target, source) {
  if (
    !target
    || typeof target !== 'object'
    || Array.isArray(target)
    || !source
    || typeof source !== 'object'
    || Array.isArray(source)
  ) {
    return 0;
  }

  let removedKeys = 0;
  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      delete target[key];
      removedKeys += 1;
      continue;
    }
    removedKeys += pruneToSourceShape(target[key], source[key]);
  }
  return removedKeys;
}

function buildTranslationMemory(sourceMessages, localeMessages) {
  const memory = new Map();
  for (const [key, sourceValue] of sourceMessages) {
    const translated = getByPath(localeMessages, key);
    if (typeof translated !== 'string' || translated === sourceValue) continue;
    if (!memory.has(sourceValue)) memory.set(sourceValue, new Set());
    memory.get(sourceValue).add(translated);
  }
  return memory;
}

function sourceOwnerMessages(source) {
  const output = new Map();
  for (const namespace of getOwnerLocaleNamespaces(source)) {
    flattenStrings(source[namespace], namespace, output);
  }
  return output;
}

function syncLocale(locale, source, allSourceMessages, ownerSourceMessages) {
  const messages = readJson(localePath(locale));
  const translationMemory = buildTranslationMemory(allSourceMessages, messages);
  let existingTranslations = 0;
  let reusedTranslations = 0;
  let sourceFallbacks = 0;
  let staleKeysRemoved = 0;

  for (const [key, sourceValue] of ownerSourceMessages) {
    const currentValue = getByPath(messages, key);
    if (typeof currentValue === 'string' && currentValue !== sourceValue) {
      existingTranslations += 1;
      continue;
    }

    const reusableValues = translationMemory.get(sourceValue);
    if (reusableValues?.size === 1) {
      setByPath(messages, key, [...reusableValues][0]);
      reusedTranslations += 1;
    } else {
      setByPath(messages, key, sourceValue);
      sourceFallbacks += 1;
    }
  }

  for (const namespace of getOwnerLocaleNamespaces(source)) {
    staleKeysRemoved += pruneToSourceShape(messages[namespace], source[namespace]);
  }

  if (WRITE) {
    fs.writeFileSync(localePath(locale), `${JSON.stringify(messages, null, 4)}\n`);
  }

  return {
    existingTranslations,
    reusedTranslations,
    sourceFallbacks,
    staleKeysRemoved,
  };
}

function main() {
  const locales = parseLocaleRegistry()
    .filter((locale) => locale !== SOURCE_LOCALE)
    .filter((locale) => !requestedLocale || locale === requestedLocale);
  assert(locales.length, `Requested locale '${requestedLocale}' is not registered`);

  const source = readJson(localePath(SOURCE_LOCALE));
  const allSourceMessages = flattenStrings(source);
  const ownerSourceMessages = sourceOwnerMessages(source);
  console.log(
    `${WRITE ? 'Writing' : 'Dry run for'} ${ownerSourceMessages.size} owner strings across ${locales.length} locale pack(s).`,
  );

  for (const locale of locales) {
    const result = syncLocale(locale, source, allSourceMessages, ownerSourceMessages);
    console.log(
      `${locale}: ${result.existingTranslations} existing translations, `
      + `${result.reusedTranslations} safe exact-source translation-memory reuses, `
      + `${result.sourceFallbacks} source-value writes (new fallback or approved invariant), `
      + `${result.staleKeysRemoved} stale owner keys removed`,
    );
  }

  if (!WRITE) {
    console.log('No files were changed. Re-run with --write after reviewing the dry run.');
  }
}

main();
