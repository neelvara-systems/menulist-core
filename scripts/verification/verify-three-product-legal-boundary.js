#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function verifyPackageScript() {
  const packageJson = JSON.parse(read('package.json'));
  assert(
    packageJson.scripts['verify:three-product-legal-boundary'] ===
      'node scripts/verification/verify-three-product-legal-boundary.js',
    'package.json must expose verify:three-product-legal-boundary',
  );
}

function verifyCounselPacket() {
  const readme = read('__docs__/legal/README.md');
  const packetPath = '__docs__/legal/three-product-legal-readiness-and-counsel-packet.md';
  const packet = read(packetPath);

  assertIncludes(
    readme,
    'Three-Product Legal Readiness and Counsel Packet',
    'Legal documentation index',
  );

  [
    '**Status:** COUNSEL REVIEW REQUIRED',
    '**Execution status:** NOT EXECUTION-READY',
    '## 5. Neelvara Counsel Brief',
    '## 6. MenuList Counsel Brief',
    '## 7. Answerlattice Counsel Brief',
    '## 8. Data-Role and Processing Worksheet',
    '## 9. Clickwrap, Versioning, and Evidence Requirements',
    '## 10. Provider and Subprocessor Approval Register',
    '## 12. Approval and Publication Ledger',
    '## 13. Release Gate',
    'Neelvara Systems is an operating trade name',
    'Master Services Agreement',
    'Data Processing Addendum',
    'Founder/brother IP assignment',
  ].forEach((needle) => assertIncludes(packet, needle, 'Three-product counsel packet'));

  assertNotIncludes(packet, 'Status:** LEGALLY APPROVED', 'Three-product counsel packet');
  assertNotIncludes(packet, 'Execution status:** READY', 'Three-product counsel packet');
}

function verifyPublicLegalSources() {
  const sources = [
    ['Neelvara policy source', 'src/app/sites/neelvara/content.tsx'],
    ['MenuList privacy source', 'src/components/website/legal/PrivacyPolicyPage.tsx'],
    ['MenuList terms source', 'src/components/website/legal/TermsOfServicePage.tsx'],
    ['MenuList refund source', 'src/components/website/legal/RefundPolicyPage.tsx'],
    ['Answerlattice privacy source', 'src/app/sites/answerlattice/privacy-policy/page.tsx'],
    ['Answerlattice terms source', 'src/app/sites/answerlattice/terms-of-service/page.tsx'],
    ['Answerlattice trust source', 'src/app/sites/answerlattice/trust/page.tsx'],
  ];

  const blockedTemplateResidue = [
    'Generic Judges',
    "Company' platform designed to test and validate Customer's generative AI applications",
    'New Castle County, Delaware',
    'the parties herby agree',
    'American Arbitration Association',
  ];

  for (const [label, relativePath] of sources) {
    const content = read(relativePath);
    for (const needle of blockedTemplateResidue) {
      assertNotIncludes(content, needle, label);
    }
  }

  const neelvara = read('src/app/sites/neelvara/content.tsx');
  assertIncludes(
    neelvara,
    'This Privacy Policy applies only to the Neelvara Systems company website.',
    'Neelvara product separation',
  );
  assertIncludes(
    neelvara,
    'This company website does not include a user account area, checkout, newsletter, or lead form.',
    'Neelvara narrow website boundary',
  );

  const menuListPrivacy = read('src/components/website/legal/PrivacyPolicyPage.tsx');
  assertIncludes(menuListPrivacy, 'Razorpay handles payment entry', 'MenuList payment-data boundary');
  assertIncludes(menuListPrivacy, 'only after you accept optional analytics', 'MenuList analytics-consent boundary');
  assertIncludes(
    menuListPrivacy,
    'We keep personal data only while it has a product, security, support, billing, or legal purpose.',
    'MenuList retention boundary',
  );

  const answerlatticeTerms = read('src/app/sites/answerlattice/terms-of-service/page.tsx');
  assertIncludes(
    answerlatticeTerms,
    'require founder and legal approval',
    'Answerlattice counsel-pending contract boundary',
  );

  const answerlatticeTrust = read('src/app/sites/answerlattice/trust/page.tsx');
  assertIncludes(
    answerlatticeTrust,
    'Not published as a standard public document',
    'Answerlattice DPA publication boundary',
  );
  assertIncludes(
    answerlatticeTrust,
    'not a contractual subprocessor schedule',
    'Answerlattice operational-provider boundary',
  );
}

verifyPackageScript();
verifyCounselPacket();
verifyPublicLegalSources();

console.log('Three-product legal boundary verification passed.');
