const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DOC_ROOT = path.join(ROOT, '__docs__');
const NESTED_PACKAGE_DIRS = ['functions', 'functions-answerlattice'];
const IGNORED_PATH_PARTS = new Set([
  'archive',
  '_archive',
  'neelvara-main-website',
  'kitstamp',
]);

function readPackageScripts(dir) {
  const packagePath = path.join(ROOT, dir, 'package.json');
  if (!fs.existsSync(packagePath)) return new Set();
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return new Set(Object.keys(packageJson.scripts || {}));
}

const rootScripts = readPackageScripts('.');
const nestedScripts = new Map(NESTED_PACKAGE_DIRS.map((dir) => [dir, readPackageScripts(dir)]));

function shouldIgnore(relPath) {
  return relPath.split(path.sep).some((part) => IGNORED_PATH_PARTS.has(part));
}

function getInlineCommandDirectory(text, index) {
  const lineStart = Math.max(0, text.lastIndexOf('\n', index) + 1);
  const linePrefix = text.slice(lineStart, index);
  const match = linePrefix.match(/cd\s+(functions-answerlattice|functions)\s*&&\s*$/);
  return match ? match[1] : null;
}

function collectDocFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath);
    if (shouldIgnore(relPath)) continue;
    if (entry.isDirectory()) {
      collectDocFiles(fullPath, files);
      continue;
    }
    if (/\.(?:md|mdx|txt)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const missing = [];
const npmRunPattern = /npm\s+run\s+([A-Za-z0-9:_-]+)/g;

for (const filePath of collectDocFiles(DOC_ROOT)) {
  const relPath = path.relative(ROOT, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = npmRunPattern.exec(text))) {
    const scriptName = match[1];
    const commandDir = getInlineCommandDirectory(text, match.index);
    const scriptSet = commandDir ? nestedScripts.get(commandDir) : rootScripts;
    if (!scriptSet?.has(scriptName)) {
      missing.push({ relPath, scriptName, commandDir: commandDir || 'root' });
    }
  }
}

if (missing.length) {
  for (const item of missing) {
    console.error(`${item.commandDir}\t${item.scriptName}\t${item.relPath}`);
  }
  process.exit(1);
}

console.log('Documentation npm script references verification passed');
