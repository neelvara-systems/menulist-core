#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = ['src', 'functions/src'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const skipPath = (relativePath) => (
  relativePath.includes('node_modules')
  || relativePath.includes('.next')
  || relativePath.includes('functions/lib/')
  || relativePath.includes('src/scripts/fabric')
  || relativePath.includes('src/lib/answerlattice/')
  || relativePath.includes('src/app/(answerlattice)/')
  || relativePath.includes('src/app/api/answerlattice/')
  || relativePath.includes('src/database/answerlattice/')
  || relativePath.includes('functions-answerlattice/')
  || relativePath.includes('/answerlattice/')
);

const walk = (directory, files = []) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, filePath);
    if (skipPath(relativePath)) continue;
    if (entry.isDirectory()) {
      walk(filePath, files);
      continue;
    }
    if (extensions.has(path.extname(filePath))) files.push(filePath);
  }
  return files;
};

const patterns = {
  read: /\b(getDoc|getDocs|transaction\.get|\.get\(\)|firestoreAdmin\.collection|admin\.firestore\(\)\.collection|db\.collection)\b/g,
  write: /\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction|transaction\.(set|update|delete)|\.set\(|\.update\(|\.add\(|\.delete\()\b/g,
  listener: /\bonSnapshot\s*\(/g,
  query: /\b(query|where|orderBy|limit|startAfter|collectionGroup)\s*\(/g,
  storage: /\b(getStorage|getDownloadURL|uploadBytes|uploadBytesResumable|deleteObject|ref\()\b/g,
  callable: /\b(httpsCallable|getFunctions)\s*\(/g,
};

const surfaceFor = (relativePath) => {
  if (
    relativePath.includes('src/app/client')
    || relativePath.includes('src/app/screen')
    || relativePath.includes('src/app/feedback')
    || relativePath.includes('src/app/api/public')
  ) return 'public';
  if (relativePath.includes('/mobile/')) return 'mobile-owner';
  if (relativePath.includes('src/app/api/')) return 'api/backend';
  if (relativePath.includes('functions/src/')) return 'cloud-functions';
  if (relativePath.includes('src/database/') || relativePath.includes('src/hooks/')) return 'owner/shared-dal';
  return 'owner/ui';
};

const flowFor = (relativePath) => {
  if (/multiOutlet|outlet/i.test(relativePath)) return 'multi-outlet';
  if (/analytics|Dashboard/i.test(relativePath)) return 'analytics/dashboard';
  if (/image|Image/i.test(relativePath)) return 'ai-image';
  if (/menuProcessing|projects|campaigns|screen/i.test(relativePath)) return 'menu/public-output';
  if (/pos-sync|PosSync/i.test(relativePath)) return 'pos-sync';
  if (/feedback|review|reputation/i.test(relativePath)) return 'feedback/reputation';
  if (/obp|official-business-page/i.test(relativePath)) return 'obp';
  if (/pwa|customerApp/i.test(relativePath)) return 'customer-app-pwa';
  if (/subscription|billing|razorpay|topup|aiOperations|capacity/i.test(relativePath)) return 'billing/ai-capacity';
  if (/stores|tenant|domain|subdomain|routing/i.test(relativePath)) return 'routing/store';
  if (/mce|correctness/i.test(relativePath)) return 'mce';
  if (/mol|drift|staleness|truth/i.test(relativePath)) return 'mol/truth';
  return 'platform';
};

const riskFor = (relativePath, text, counts) => {
  if (counts.listener > 0) return 'high-listener';
  if (surfaceFor(relativePath) === 'public' && (counts.read + counts.query) > 4) return 'medium-public-read';
  if (counts.write > 8) return 'medium-write-volume';
  if (/getDocs\(/.test(text) && !/limit\s*\(/.test(text)) return 'medium-query-scope';
  return 'low';
};

const files = roots.flatMap((scanRoot) => walk(path.join(root, scanRoot)));
const rows = files
  .map((filePath) => {
    const relativePath = path.relative(root, filePath);
    const text = fs.readFileSync(filePath, 'utf8');
    const counts = Object.fromEntries(
      Object.entries(patterns).map(([name, pattern]) => [
        name,
        [...text.matchAll(new RegExp(pattern.source, 'g'))].length,
      ]),
    );
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return null;
    return {
      file: relativePath,
      surface: surfaceFor(relativePath),
      flow: flowFor(relativePath),
      risk: riskFor(relativePath, text, counts),
      total,
      ...counts,
    };
  })
  .filter(Boolean)
  .sort((left, right) => right.total - left.total || left.file.localeCompare(right.file));

const countBy = (key) => rows.reduce((acc, row) => {
  acc[row[key]] = (acc[row[key]] || 0) + 1;
  return acc;
}, {});

const printSummary = () => {
  console.log(`# Firebase Usage Map\n`);
  console.log(`Scanned runtime files: ${rows.length}\n`);
  console.log(`## By Surface\n`);
  Object.entries(countBy('surface')).forEach(([key, value]) => console.log(`- ${key}: ${value}`));
  console.log(`\n## By Risk\n`);
  Object.entries(countBy('risk')).forEach(([key, value]) => console.log(`- ${key}: ${value}`));
  console.log(`\n## Complete File-Level Map\n`);
  console.log('| File | Surface | Flow | Risk | Reads | Writes | Listeners | Queries | Storage | Callables |');
  console.log('| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  rows.forEach((row) => {
    console.log(`| \`${row.file}\` | ${row.surface} | ${row.flow} | ${row.risk} | ${row.read} | ${row.write} | ${row.listener} | ${row.query} | ${row.storage} | ${row.callable} |`);
  });
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, bySurface: countBy('surface'), byRisk: countBy('risk'), byFlow: countBy('flow') }, null, 2));
} else {
  printSummary();
}
