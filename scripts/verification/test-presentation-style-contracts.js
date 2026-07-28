const fs = require('fs');
const path = require('path');

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_ROOT = path.join(REPOSITORY_ROOT, 'src');

const STYLE_ALIASES = Object.freeze({
  '@/': 'src/',
  '@antdComponent/': 'src/components/antdComponent/',
  '@atoms/': 'src/components/atoms/',
  '@atomsCSS/': 'public/styles/components/atoms/',
  '@molecules/': 'src/components/molecules/',
  '@moleculesCSS/': 'public/styles/components/molecules/',
  '@organisms/': 'src/components/organisms/',
  '@organismsCSS/': 'public/styles/components/organisms/',
  '@sections/': 'src/components/organisms/sections/',
  '@styles/': 'public/styles/',
  '@template/': 'src/components/templates/',
  '@templatesCSS/': 'public/styles/components/templates/',
});

function walkFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, output);
    } else {
      output.push(absolutePath);
    }
  }
  return output;
}

function resolveStyleImport(sourceFile, specifier) {
  if (specifier.startsWith('.')) {
    return path.resolve(path.dirname(sourceFile), specifier);
  }

  for (const [alias, target] of Object.entries(STYLE_ALIASES)) {
    if (specifier.startsWith(alias)) {
      return path.join(REPOSITORY_ROOT, target, specifier.slice(alias.length));
    }
  }

  return null;
}

function collectLocalClassNames(styleSource) {
  const withoutSingleGlobalSelectors = styleSource.replace(
    /:global\(\s*\.[_a-zA-Z][\w-]*\s*\)/g,
    '',
  );
  return new Set(
    [...withoutSingleGlobalSelectors.matchAll(/\.([_a-zA-Z][\w-]*)/g)]
      .map((match) => match[1]),
  );
}

function collectImportedStyleUsages(source, identifier) {
  const sourceWithoutImports = source.replace(
    /^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm,
    '',
  );
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const usagePattern = new RegExp(
    `\\b${escapedIdentifier}(?:\\.([A-Za-z_$][\\w$]*)|\\[['"]([^'"]+)['"]\\])`,
    'g',
  );

  return new Set(
    [...sourceWithoutImports.matchAll(usagePattern)]
      .map((match) => match[1] || match[2]),
  );
}

function main() {
  const sourceFiles = walkFiles(SOURCE_ROOT)
    .filter((filePath) => /\.(?:c|m)?[jt]sx?$/.test(filePath));
  const failures = [];
  let checkedImports = 0;
  let checkedUsages = 0;

  for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(sourceFile, 'utf8');
    const importPattern = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.module\.(?:css|scss))['"]/g;

    for (const match of source.matchAll(importPattern)) {
      const [, identifier, specifier] = match;
      const styleFile = resolveStyleImport(sourceFile, specifier);
      checkedImports += 1;

      if (!styleFile || !fs.existsSync(styleFile)) {
        failures.push(`${path.relative(REPOSITORY_ROOT, sourceFile)}: unresolved CSS-module import ${specifier}`);
        continue;
      }

      const localClasses = collectLocalClassNames(fs.readFileSync(styleFile, 'utf8'));
      const usages = collectImportedStyleUsages(source, identifier);
      checkedUsages += usages.size;

      for (const usage of usages) {
        if (!localClasses.has(usage)) {
          failures.push(
            `${path.relative(REPOSITORY_ROOT, sourceFile)} uses ${identifier}.${usage}, `
            + `but ${path.relative(REPOSITORY_ROOT, styleFile)} does not export .${usage}`,
          );
        }
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`CSS-module contract failures:\n- ${failures.join('\n- ')}`);
  }

  console.log(
    `Presentation style contracts passed (${checkedImports} CSS-module imports, ${checkedUsages} static class usages)`,
  );
}

main();
