#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireToken = (source, token, label) => {
  if (!source.includes(token)) throw new Error(`${label} is missing: ${token}`);
};
const rejectToken = (source, token, label) => {
  if (source.includes(token)) throw new Error(`${label} still contains: ${token}`);
};

const database = read('src/constants/database.ts');
const boundary = read('src/lib/staffManagement/concurrencyBoundary.ts');
const server = read('src/lib/staffManagement/server.ts');
const platformEntityBlocks = read('src/app/api/platform/entity-blocks/route.ts');
const emulatorTest = read('scripts/verification/test-staff-concurrency-emulator.ts');
const packageJson = read('package.json');

requireToken(database, 'STAFF_STORE_ACCESS_STATE: "staffStoreAccessState"', 'private staff access-state collection');
requireToken(boundary, '`${tenantId}_${storeId}`', 'tenant and store partitioned access-state identity');
requireToken(boundary, 'createStaffUserDocumentTransaction', 'atomic deterministic staff creation');
requireToken(boundary, 'runStaffUserMutationTransaction', 'atomic staff mapping mutation');
requireToken(boundary, 'runStaffRoleMutationTransaction', 'atomic staff role mutation');
requireToken(boundary, "throw new StaffConcurrencyError('LAST_OWNER')", 'last-owner transaction invariant');
requireToken(boundary, "throw new StaffConcurrencyError('ROLE_IN_USE')", 'role-in-use transaction invariant');
requireToken(boundary, 'transaction.create(userRef, data)', 'single-claim deterministic user creation');
requireToken(boundary, 'transaction.update(userRef, update)', 'atomic user update');
requireToken(boundary, 'transaction.update(storeRef, {', 'atomic role definition update');
requireToken(server, 'createStaffUserDocumentTransaction({', 'staff create route transaction boundary');
requireToken(server, 'mutation: { kind: "add", mapping: stores[0] }', 'existing staff add transaction boundary');
requireToken(server, 'mutation: { active: input.active, kind: "replace", mappings: input.stores ? nextStores : undefined }', 'staff update transaction boundary');
requireToken(server, 'mutation: { kind: "remove", storeId: input.storeId }', 'staff removal transaction boundary');
requireToken(server, 'runStaffRoleMutationTransaction({', 'role route transaction boundary');
requireToken(server, 'const repair = await runStaffRoleMutationTransaction({', 'default role repair transaction boundary');
requireToken(server, 'revokeStaffFirebaseRefreshTokensAfterCommit', 'post-commit session token revocation boundary');
requireToken(server, 'assertOwnerTargetMutationAllowed(authority, currentData)', 'fresh owner-target mutation authority boundary');
requireToken(server, 'OWNER_MANAGEMENT_FORBIDDEN', 'owner-target manager refusal response');
requireToken(server, 'STAFF_LOGIN_COLLISION', 'managed Staff ID Auth collision refusal');
requireToken(server, 'mutation: { kind: "upsert", mapping: stores[0], verified: true }', 'existing placeholder Auth binding mapping transaction');
requireToken(server, 'staff_verify_auth_compensation_failed', 'failed Auth binding compensation diagnostic');
requireToken(server, 'mode: "existing_user_auth_bound"', 'explicit existing-user Auth binding acknowledgement');
requireToken(server, 'staff_password_setup_metadata_write_failed', 'post-commit password setup metadata failure boundary');
requireToken(boundary, "| { kind: 'upsert'; mapping: UserStoreMappingType; verified?: boolean }", 'transactional mapping upsert operation');
requireToken(boundary, 'currentData.isVerified !== false', 'active assignment verified-user boundary');
requireToken(platformEntityBlocks, 'prepareStaffAccessStateScope(db, entitySnap.data() || {})', 'platform block access-state preparation');
requireToken(platformEntityBlocks, 'readStaffAccessStateInTransaction(transaction, db, staffAccessScope)', 'platform block access-state transaction read');
requireToken(platformEntityBlocks, 'writeStaffBlockedAccessStateInTransaction(', 'platform block access-state synchronization');
rejectToken(server, 'collection(USERS_COLLECTION).add(newUserDoc)', 'random-ID staff creation race');
rejectToken(server, 'const sessionRevocationFields = await revokeStaffSessions', 'pre-commit session revocation side effect');
rejectToken(server, 'await revokeStaffFirebaseRefreshTokens(existingData, {', 'pre-commit refresh-token revocation side effect');
rejectToken(server, 'if (concurrencyResponse && error instanceof StaffConcurrencyError && error.code === "USER_ALREADY_EXISTS")', 'uncompensated deterministic user collision');
requireToken(emulatorTest, 'verifyConcurrentAddsPreserveEveryMapping', 'lost-update emulator regression');
requireToken(emulatorTest, 'verifyConcurrentUpsertPreservesOtherMappings', 'Auth-binding mapping upsert emulator regression');
requireToken(emulatorTest, 'verifyUnverifiedOwnerDoesNotSatisfyLastOwner', 'unverified last-owner emulator regression');
requireToken(emulatorTest, 'verifyConcurrentCreateClaimsOneUserAndOneAssignment', 'duplicate-create emulator regression');
requireToken(emulatorTest, 'verifyConcurrentOwnerRemovalPreservesOneOwner', 'last-owner emulator regression');
requireToken(emulatorTest, 'verifyRoleAssignmentAndDeactivationCannotBothCommit', 'role assignment emulator regression');
requireToken(emulatorTest, 'verifyConcurrentRoleEditsPreserveBothChanges', 'role edit emulator regression');
requireToken(packageJson, '"test:staff-concurrency:emulator"', 'staff concurrency emulator package command');

console.log('Staff concurrency boundary verification passed.');
