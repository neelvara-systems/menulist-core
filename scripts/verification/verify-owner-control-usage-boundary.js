#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, token, label) => assert(content.includes(token), `${label} must include ${token}`);
const excludes = (content, token, label) => assert(!content.includes(token), `${label} must not include ${token}`);

const appContract = read('src/data/shared/ownerControlUsageContract.ts');
const functionsContract = read('functions/src/sharedData/ownerControlUsageContract.ts');
const dal = read('src/database/ownerControlUsage/index.ts');
const writer = read('src/lib/ownerControlUsage/writeOwnerControlUsage.ts');
const rules = read('firestore.rules');
const maturation = read('functions/src/analytics/authorityMaturation.ts');
const scheduler = read('functions/src/decisionBlocksScoring.ts');
const desktopScreens = read('src/components/templates/main-app/settings/DigitalScreenSettings/index.tsx');
const mobileScreens = read('src/components/mobile/screens/MobileDigitalScreensScreen.tsx');

assert(appContract === functionsContract, 'Owner control app/Functions contracts must be byte-identical');
[
  'export const OWNER_CONTROL_TYPES = [',
  'normalizeOwnerControlDocumentIdPart',
  'parseOwnerControlUsageDocument',
  'getOwnerControlUsageMonthKey',
  'documentId !== `${tId}_${sId}`',
  'monthKeys.length > MAX_MONTH_BUCKETS',
  'monthlyTotals[controlType] !== count',
  'latestUsedAtMillis !== lastUpdatedAtMillis',
  'lastUpdatedAtMillis > nowMillis + MAX_TIMESTAMP_CLOCK_SKEW_MS',
  'monthKey < firstTrackedMonth || monthKey > lastUpdatedMonth',
].forEach((token) => includes(appContract, token, 'Owner control shared runtime contract'));

[
  "import { writeOwnerControlUsageEvent } from '@lib/ownerControlUsage/writeOwnerControlUsage';",
  'await writeOwnerControlUsageEvent(firebaseClient, tId, sId, controlType);',
  'parseOwnerControlUsageDocument(',
  'owner_control_usage_read_invalid_document',
  'Partial<Record<OwnerControlType, number>>',
].forEach((token) => includes(dal, token, 'Owner control DAL'));
['updateDoc(', 'setDoc(', 'as OwnerControlUsageStats', 'metadata?: any'].forEach((token) => {
  excludes(dal, token, 'Owner control DAL unsafe persistence boundary');
});

[
  'export async function writeOwnerControlUsageEvent(',
  'await runTransaction(database, async (transaction) => {',
  'const currentSnapshot = await transaction.get(documentRef);',
  'transaction.set(documentRef, {',
  'parseOwnerControlUsageDocument(',
  'transaction.update(documentRef, {',
  'getOwnerControlUsageMonthKey(new Date())',
  'serverTimestamp()',
  'shouldRetryOwnerControlMonthBoundary(',
  "getFirestoreErrorCode(error) === 'permission-denied'",
].forEach((token) => includes(writer, token, 'Owner control transaction writer'));

[
  'allow create: if isValidOwnerControlUsageCreate(docId);',
  'allow update: if isValidOwnerControlUsageUpdate(docId);',
  'function ownerControlCurrentMonthKey()',
  'function ownerControlCounterAdvancedOnce(before, after, affected)',
  'after.monthlyUsage.diff(before.monthlyUsage).affectedKeys() == [monthKey].toSet()',
  'after.lastUpdatedAt == request.time',
  '(isPlatformAdmin() || hasTenantWriteRole())',
].forEach((token) => includes(rules, token, 'Owner control Firestore rule boundary'));

[
  'const OWNER_CONTROL_USAGE_PAGE_SIZE = 500;',
  '.orderBy(FieldPath.documentId())',
  '.limit(OWNER_CONTROL_USAGE_PAGE_SIZE)',
  'parseOwnerControlUsageDocument(',
  'invalidDocuments++;',
  'invalidDocuments,',
  "await db.collection(DB_COLLECTIONS.INSIGHTS).doc(summaryDocId).set({",
].forEach((token) => includes(maturation, token, 'Authority maturation Functions boundary'));
excludes(
  maturation,
  'db.collection(DB_COLLECTIONS.OWNER_CONTROL_USAGE).get()',
  'Authority maturation unbounded collection read',
);
excludes(maturation, '}, { merge: true });', 'Authority maturation exact summary replacement');
includes(scheduler, 'invalidDocuments: maturationResult.invalidDocuments', 'Authority maturation scheduler diagnostics');

for (const [content, label, assertionCode] of [
  [desktopScreens, 'Desktop screen override tracking', 'desktop_digital_screen_override_update_rejected'],
  [mobileScreens, 'Mobile screen override tracking', 'mobile_digital_screen_override_update_rejected'],
]) {
  const mutationIndex = content.indexOf(`'${assertionCode}'`);
  const trackingIndex = content.indexOf("trackOwnerControlUsage('screenOverride'", mutationIndex);
  assert(mutationIndex !== -1, `${label} must retain confirmed mutation assertion`);
  assert(trackingIndex > mutationIndex, `${label} must run only after confirmed mutation`);
}

process.stdout.write('Owner control usage boundary verifier passed.\n');
