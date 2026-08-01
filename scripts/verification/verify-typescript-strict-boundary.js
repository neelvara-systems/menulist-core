const assert = require('node:assert/strict');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..', '..');
const tsconfigPath = path.join(root, 'tsconfig.json');
const parsed = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
assert.equal(parsed.error, undefined, 'Root TypeScript configuration must parse.');
const tsconfig = parsed.config;
const compilerOptions = tsconfig.compilerOptions || {};

assert.equal(
  compilerOptions.strict,
  true,
  'Root TypeScript strict mode must remain enabled.',
);
assert.notEqual(
  compilerOptions.strictNullChecks,
  false,
  'Root TypeScript must not disable strict null checking.',
);

console.log('TypeScript strict boundary verification passed.');
