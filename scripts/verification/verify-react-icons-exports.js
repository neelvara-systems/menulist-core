#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ICON_IMPORT_PATTERN = /import\s*{([^}]*)}\s*from\s*['"](react-icons\/[a-z0-9-]+)['"]/g;

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(absolutePath);
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [absolutePath] : [];
  });
}

const failures = [];
let importCount = 0;

for (const filePath of collectSourceFiles(SRC)) {
  const source = fs.readFileSync(filePath, 'utf8');
  let match;

  while ((match = ICON_IMPORT_PATTERN.exec(source)) !== null) {
    const moduleName = match[2];
    const moduleExports = require(moduleName);
    const importedNames = match[1]
      .split(',')
      .map((specifier) => specifier.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);

    importCount += importedNames.length;
    const duplicates = importedNames.filter((name, index) => importedNames.indexOf(name) !== index);
    const missing = importedNames.filter((name) => !(name in moduleExports));

    if (duplicates.length > 0 || missing.length > 0) {
      failures.push({
        file: path.relative(ROOT, filePath),
        moduleName,
        duplicates: [...new Set(duplicates)],
        missing,
      });
    }
  }
}

if (failures.length > 0) {
  console.error('React icon export verification failed:');
  for (const failure of failures) {
    const details = [
      failure.duplicates.length > 0 ? `duplicate imports: ${failure.duplicates.join(', ')}` : '',
      failure.missing.length > 0 ? `missing exports: ${failure.missing.join(', ')}` : '',
    ].filter(Boolean).join('; ');
    console.error(`- ${failure.file} (${failure.moduleName}): ${details}`);
  }
  process.exit(1);
}

console.log(`React icon export verification passed (${importCount} named imports checked).`);
