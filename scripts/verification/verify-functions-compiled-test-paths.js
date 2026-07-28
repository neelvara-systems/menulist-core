const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const verificationRoot = path.join(root, 'scripts', 'verification');
const forbiddenCompiledRoot = 'functions/lib/functions/src';
const sourceExtensions = new Set(['.js', '.ts']);
const failures = [];

for (const name of fs.readdirSync(verificationRoot)) {
  if (name === path.basename(__filename)) continue;
  const filePath = path.join(verificationRoot, name);
  if (!fs.statSync(filePath).isFile() || !sourceExtensions.has(path.extname(name))) continue;
  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes(forbiddenCompiledRoot)) {
    failures.push(`${path.relative(root, filePath)} imports the stale duplicate ${forbiddenCompiledRoot}`);
  }
}

if (failures.length > 0) {
  console.error('Functions compiled-test path verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Functions compiled-test paths verified.');
}
