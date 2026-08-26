#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCOPED_FILES = [
  'src/components/templates/main-app/businessSettings/OBPLinkCard.tsx',
  'src/components/templates/main-app/businessSettings/tabs/BusinessCopySetupTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx',
  'src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/SpecialHoursEditor.tsx',
  'src/components/templates/main-app/useMenuList/CommunicationKit.tsx',
  'src/components/templates/main-app/useMenuList/OwnerReferralModal.tsx',
  'src/components/templates/main-app/useMenuList/PresenceMonitor.tsx',
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const relativePath of SCOPED_FILES) {
  const source = read(relativePath);
  const antImports = [...source.matchAll(/import\s*{([^}]*)}\s*from ['"]antd['"]/g)].map((match) => match[1]);
  assert(source.includes('App.useApp()'), `${relativePath} must use the mounted Ant application context`);
  assert(!/\bmessage\.(success|error|warning|info)\(/.test(source), `${relativePath} must not call detached static Ant feedback`);
  assert(!antImports.some((imports) => /\bmessage\b/.test(imports)), `${relativePath} must not import the detached static Ant message API`);
}

console.log(`Owner feedback context boundary verification passed for ${SCOPED_FILES.length} reachable surfaces.`);
