#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const route = read('src/app/api/auth/change-password/route.ts');
const currentUser = read('src/lib/auth/currentPlatformUser.ts');
const authReadme = read('__docs__/auth/README.md');
const authFirebase = read('__docs__/auth/auth_firebase.md');
const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

const requireText = (source, token, label) => {
  assert.ok(source.includes(token), `${label}: missing ${token}`);
};

requireText(route, 'const currentUser = await getCurrentUser(session);', 'fresh current-user read');
requireText(route, 'currentUser.documentId !== userId', 'exact current-user identity');
requireText(route, 'failClosedOnProviderError: true', 'fail-closed sensitive limiter');
requireText(route, 'rl.reason === "provider_unavailable"', 'provider failure distinction');
requireText(route, 'status: providerUnavailable ? 503 : 429', 'provider failure status');
requireText(route, 'firebaseUser.disabled', 'disabled Firebase identity rejection');
requireText(route, 'firebaseEmail !== currentEmail', 'Firebase email binding');
requireText(route, 'storedFirebaseUid !== firebaseUser.uid', 'optional Firebase UID binding');
requireText(route, 'const verificationController = new AbortController();', 'verification deadline');
requireText(route, 'CHANGE_PASSWORD_VERIFICATION_TIMEOUT_MS', 'bounded verification timeout');
requireText(route, 'signal: verificationController.signal', 'verification abort signal');
requireText(route, 'clearTimeout(verificationTimeout);', 'timeout cleanup');
requireText(route, '"change_password_metadata_sync_failed"', 'metadata repair observability');
requireText(route, 'return NextResponse.json({\n      success: true,', 'success after authoritative Auth update');

const updateUserOffset = route.indexOf('await authAdmin.updateUser');
const metadataOffset = route.indexOf('await userRef.update');
const metadataCatchOffset = route.indexOf('"change_password_metadata_sync_failed"');
const successOffset = route.indexOf('return NextResponse.json({\n      success: true,');
assert.ok(updateUserOffset >= 0 && updateUserOffset < metadataOffset, 'Firebase Auth must update before metadata');
assert.ok(metadataOffset < metadataCatchOffset && metadataCatchOffset < successOffset, 'metadata failure must be observed before success');

requireText(currentUser, 'export function isCurrentUserRecordEligible', 'shared current-user admission');
requireText(currentUser, 'export async function getCurrentUser', 'shared current-user read');
requireText(currentUser, 'userData.active !== true', 'active admission');
requireText(currentUser, 'userData.isVerified !== true', 'verification admission');
requireText(currentUser, 'revokedAt === 0 || revokedAt < issuedAt', 'session revocation admission');

for (const [source, label] of [
  [authReadme, 'Auth README'],
  [authFirebase, 'Auth Firebase docs'],
  [productionAudit, 'production audit'],
  [changelog, 'changelog'],
]) {
  requireText(source, 'change-password current-authority hardening', label);
}

assert.ok(!route.includes('console.log'), 'password route must not log raw values');
process.stdout.write('Change-password current-authority boundary verification passed.\n');
