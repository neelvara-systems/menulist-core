#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`[verify-menulist-commercial-identity] ${message}`);
};
const includes = (content, needle, label) => assert(content.includes(needle), `${label} must include ${needle}`);
const excludes = (content, needle, label) => assert(!content.includes(needle), `${label} must not include ${needle}`);

const packageJson = JSON.parse(read('package.json'));
assert(
  packageJson.scripts['verify:menulist-commercial-identity'] ===
    'node scripts/verification/verify-menulist-commercial-identity.js',
  'package.json must expose verify:menulist-commercial-identity',
);

const identity = read('src/constants/menulist/commercialIdentity.ts');
includes(identity, "MENULIST_PRODUCT_NAME = 'MenuList'", 'Commercial identity constants');
includes(identity, 'MENULIST_OPERATOR_DISCLOSURE', 'Commercial identity constants');
includes(identity, 'MENULIST_TRADE_NAME_QUALIFIER', 'Commercial identity constants');
includes(identity, 'MENULIST_PAYMENT_PROCESSOR_DISCLOSURE', 'Commercial identity constants');

const publicConsumers = [
  ['MenuList footer', 'src/components/website/Footer.tsx'],
  ['MenuList Terms', 'src/components/website/legal/TermsOfServicePage.tsx'],
  ['MenuList Privacy Policy', 'src/components/website/legal/PrivacyPolicyPage.tsx'],
  ['MenuList Refund Policy', 'src/components/website/legal/RefundPolicyPage.tsx'],
];
for (const [label, relativePath] of publicConsumers) {
  const source = read(relativePath);
  includes(source, 'MENULIST_OPERATOR_DISCLOSURE', label);
}

const ownerIdentityConsumers = [
  ['MenuList owner sidebar', 'src/components/organisms/sidebar/index.tsx'],
  ['MenuList owner header', 'src/components/organisms/headerComponent/index.tsx'],
];
for (const [label, relativePath] of ownerIdentityConsumers) {
  const source = read(relativePath);
  includes(source, 'MenuListIconLogo', label);
  excludes(source, 'EcomsIconLogo', label);
  excludes(source, 'EcomsHorizontalLogo', label);
}

const ownerLogo = read('src/components/atoms/menuListLogo/index.tsx');
includes(ownerLogo, 'aria-label="MenuList"', 'MenuList owner logo');
includes(ownerLogo, '<span>MenuList</span>', 'MenuList owner logo');
excludes(ownerLogo, 'ecoms.ai', 'MenuList owner logo');

const taxPolicy = read('src/data/shared/billingTaxPolicy.ts');
includes(taxPolicy, 'legalIdentityVerified: boolean', 'Tax supplier contract');
includes(taxPolicy, "`${normalizeText(supplier.productName, 80) || 'Product'} billing legal identity is not verified.`", 'Tax supplier gate');

const taxServer = read('src/lib/billing/menulistTaxServer.ts');
includes(taxServer, 'billingLegalIdentityVerified', 'Server supplier configuration');
includes(taxServer, "productName: 'MenuList'", 'Server supplier product identity');

for (const relativePath of ['.env.staging.example', '.env.production.example']) {
  const template = read(relativePath);
  includes(template, 'MENULIST_BILLING_LEGAL_IDENTITY_VERIFIED=false', relativePath);
  includes(template, 'MENULIST_BILLING_LEGAL_SUPPLIER_NAME=<verified-legal-supplier-name>', relativePath);
}

const activeIdentitySources = [
  'src/constants/menulist/commercialIdentity.ts',
  'src/constants/neelvara/product.ts',
  'src/constants/neelvara/website.ts',
  'src/components/website/Footer.tsx',
  'src/components/website/legal/TermsOfServicePage.tsx',
  'src/components/website/legal/PrivacyPolicyPage.tsx',
  'src/components/website/legal/RefundPolicyPage.tsx',
];
const prohibitedEntityClaims = [
  'Neelvara Systems Private Limited',
  'Neelvara Systems Pvt Ltd',
  'Neelvara Systems LLP',
  'Neelvara Systems OPC',
];
for (const relativePath of activeIdentitySources) {
  const source = read(relativePath);
  for (const claim of prohibitedEntityClaims) excludes(source, claim, relativePath);
}

const docsIndex = read('__docs__/commercial-identity/README.md');
for (const documentName of [
  'commercial-identity_spec.md',
  'commercial-identity_impl.md',
  'commercial-identity_marketing.md',
  'commercial-identity_website.md',
  'commercial-identity_helpdoc.md',
  'commercial-identity_firebase.md',
  'commercial-identity_mobile-support.md',
  'commercial-identity_test-cases.md',
]) includes(docsIndex, documentName, 'Commercial identity documentation index');

console.log('MenuList commercial identity verification passed.');
