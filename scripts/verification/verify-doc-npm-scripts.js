const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DOC_ROOT = path.join(ROOT, '__docs__');
const IGNORED_PATH_PARTS = new Set([
  'archive',
  '_archive',
  'neelvara-main-website',
  'kitstamp',
]);
const packageScriptCache = new Map();

function readPackageScriptsForDir(dir) {
  const normalizedDir = path.resolve(dir);
  if (packageScriptCache.has(normalizedDir)) {
    return packageScriptCache.get(normalizedDir);
  }

  const packagePath = path.join(normalizedDir, 'package.json');
  let scripts = null;
  if (!fs.existsSync(packagePath)) return new Set();
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    scripts = new Set(Object.keys(packageJson.scripts || {}));
  } catch (error) {
    console.error(`Failed to read package scripts from ${path.relative(ROOT, packagePath)}: ${error.message}`);
    process.exit(1);
  }

  packageScriptCache.set(normalizedDir, scripts);
  return scripts;
}

function resolveRepoPath(rawPath) {
  const expandedPath = rawPath.replace(/^['"]|['"]$/g, '');
  const absolutePath = path.isAbsolute(expandedPath)
    ? expandedPath
    : path.resolve(ROOT, expandedPath);
  const relativePath = path.relative(ROOT, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return absolutePath;
}

const rootScripts = readPackageScriptsForDir(ROOT);

function shouldIgnore(relPath) {
  return relPath.split(path.sep).some((part) => IGNORED_PATH_PARTS.has(part));
}

function getInlineCommandDirectory(filePath, text, index) {
  const lineStart = Math.max(0, text.lastIndexOf('\n', index) + 1);
  const linePrefix = text.slice(lineStart, index);
  const explicitCdMatch = linePrefix.match(/cd\s+((?:\.\/)?[A-Za-z0-9_./@-]+)\s*&&\s*$/);
  if (explicitCdMatch) {
    return resolveRepoPath(explicitCdMatch[1]);
  }

  let currentDir = path.dirname(filePath);
  while (true) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    if (currentDir === ROOT) {
      return ROOT;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return ROOT;
    }
    currentDir = parentDir;
  }
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
    const commandDir = getInlineCommandDirectory(filePath, text, match.index);
    const scriptSet = commandDir ? readPackageScriptsForDir(commandDir) : rootScripts;
    if (!scriptSet?.has(scriptName)) {
      missing.push({
        relPath,
        scriptName,
        commandDir: commandDir ? path.relative(ROOT, commandDir) || 'root' : 'root',
      });
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
