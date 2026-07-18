#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, token, label) => assert(content.includes(token), `${label} must include ${token}`);
const excludes = (content, token, label) => assert(!content.includes(token), `${label} must not include ${token}`);

const features = read('src/config/features.ts');
const gbpDal = read('src/database/integrations/gbp.ts');
const integrationDoc = read('__docs__/external-integrations/README.md');
const posReadme = read('__docs__/pos-webhook-sync/README.md');
const posMarketing = read('__docs__/pos-webhook-sync/pos-webhook-sync_marketing.md');
const posWebsite = read('__docs__/pos-webhook-sync/pos-webhook-sync_website.md');
const packageJson = JSON.parse(read('package.json'));

[
  'ENABLE_GBP_SYNC: false',
  'ENABLE_POS_SYNC: true',
  'ENABLE_MESSAGING_ONBOARDING: true',
  "MESSAGING_ONBOARDING_PROVIDERS: ['whatsapp']",
  'ENABLE_PHONE_OTP_AUTH: true',
  'ENABLE_PUBLIC_API: true',
  'ENABLE_OWNER_NOTIFICATION_EMAIL: true',
  'ENABLE_OWNER_NOTIFICATION_WHATSAPP: false',
  'SOCIAL_CONTENT_DIRECT_POSTING: "disabled"',
  'GROWTHOS_DIRECT_POSTING: "disabled"',
  'ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST: true',
].forEach((token) => includes(features, token, 'MenuList integration feature posture'));

[
  'GBP_TOKEN_STORE_DISABLED',
  'throw createGBPTokenStoreDisabledError()',
  'import type { Timestamp } from "firebase/firestore";',
].forEach((token) => includes(gbpDal, token, 'GBP fail-closed DAL'));

[
  'Reserved Scope (not current runtime):',
  'Reserved Exclusions:',
  '@see __docs__/gbp-sync/gbp-sync_impl.md',
  'Keep OFF until the complete provider flow and prerequisites are verified',
].forEach((token) => includes(features, token, 'GBP disabled feature documentation'));

[
  'Active provider-backed MenuList flows',
  'Active external-consumer and owner-configured script flows',
  'Manual handoffs, not connected integrations',
  'Disabled or fail-closed MenuList integrations',
  'Product exclusions',
  'Common external-boundary requirements',
  'Release-owner pending evidence',
  '`ENABLE_GBP_SYNC: false`',
  '`ENABLE_OWNER_NOTIFICATION_WHATSAPP: false`',
  '`SOCIAL_CONTENT_DIRECT_POSTING` is disabled',
  '`GROWTHOS_DIRECT_POSTING` is disabled',
  'source code cannot prove third-party control planes',
].forEach((token) => includes(integrationDoc, token, 'MenuList integration inventory'));

[
  'Signing secrets are server-owned',
  'One attempt per debounced save',
  'Closing the app before the 25-second timer fires can prevent that attempt',
  'Background project writes that do not cross the client project DAL do not create a separate webhook attempt',
  'Provider smoke and coordinated deployment remain release-owner work',
].forEach((token) => includes(posReadme, token, 'POS code-truth README'));

[
  'works with any POS',
  'stays updated forever',
  'enterprise-grade',
  'bank-grade',
].forEach((claim) => {
  excludes(posMarketing.toLowerCase(), `**${claim}`, 'POS active marketing claims');
  excludes(posWebsite.toLowerCase(), `**${claim}`, 'POS active website claims');
});

assert(
  packageJson.scripts?.['verify:menulist-external-integrations'] === 'node scripts/verification/verify-menulist-external-integrations.js',
  'package.json must expose verify:menulist-external-integrations',
);

console.log('MenuList external integration inventory verifier passed');
