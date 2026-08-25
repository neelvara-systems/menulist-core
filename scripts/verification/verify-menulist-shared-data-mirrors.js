const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const functionsSharedDir = path.join(root, 'functions/src/sharedData');
const appSharedDir = path.join(root, 'src/data/shared');
const countryPrimary = path.join(root, 'src/components/atoms/phoneNumberInput/countryData.ts');

const functionsFiles = fs.readdirSync(functionsSharedDir)
  .filter((file) => file.endsWith('.ts'))
  .sort();
const expectedMirrors = fs.readdirSync(appSharedDir)
  .filter((file) => file.endsWith('.ts') && fs.existsSync(path.join(functionsSharedDir, file)))
  .sort();

assert.deepEqual(
  functionsFiles,
  [...expectedMirrors, 'countryData.ts'].sort(),
  'every Functions shared-data TypeScript file must have one declared primary source',
);

for (const file of expectedMirrors) {
  assert.equal(
    fs.readFileSync(path.join(functionsSharedDir, file), 'utf8'),
    fs.readFileSync(path.join(appSharedDir, file), 'utf8'),
    `${file} must remain byte-identical across app and Functions`,
  );
}

assert.equal(
  fs.readFileSync(path.join(functionsSharedDir, 'countryData.ts'), 'utf8'),
  fs.readFileSync(countryPrimary, 'utf8'),
  'countryData.ts must remain byte-identical to the phone-input primary source',
);

const countrySource = fs.readFileSync(countryPrimary, 'utf8');
const countryRows = [...countrySource.matchAll(/\{ code: "([A-Z]{2})"[^\n]*flag: "([^"]*)"/g)]
  .map((match) => ({ code: match[1], flag: match[2] }));
const explicitFlagExceptions = new Map([
  ['UK', '🇬🇧'],
  ['AC', ' '],
  ['XK', ' '],
  ['TA', ' '],
]);
const regionalIndicatorFlag = (code) => [...code]
  .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
  .join('');

assert(countryRows.length >= 240, 'country flag validation must cover the complete country table');
for (const country of countryRows) {
  assert.equal(
    country.flag,
    explicitFlagExceptions.get(country.code) ?? regionalIndicatorFlag(country.code),
    `${country.code} must use its matching country flag`,
  );
}

console.log(`MenuList shared-data mirrors verified (${functionsFiles.length} files).`);
