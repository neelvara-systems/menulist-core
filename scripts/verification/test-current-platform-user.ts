#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    isCurrentPlatformUserRecordEligible,
    isCurrentUserRecordEligible,
    resolveCurrentSessionUserDocumentId,
} from '../../src/lib/auth/currentPlatformUser';

const session = {
    authIssuedAt: 1_800_000_000,
    uId: 'platform-user-1',
    user: {
        email: 'founder@example.com',
        id: 'platform-user-1',
    },
};
const currentUser = {
    active: true,
    authDisabled: false,
    deleted: false,
    email: 'founder@example.com',
    id: 'platform-user-1',
    isVerified: true,
    platformRole: 'PLATFORM',
};

assert.equal(isCurrentPlatformUserRecordEligible({ documentId: 'platform-user-1', session, userData: currentUser }), true);
assert.equal(resolveCurrentSessionUserDocumentId(session), 'platform-user-1');
assert.equal(resolveCurrentSessionUserDocumentId({
    ...session,
    user: { ...session.user, id: 'platform-user-2' },
}), null, 'contradictory root and nested user aliases must fail closed');
assert.equal(resolveCurrentSessionUserDocumentId({
    ...session,
    uId: ' platform-user-1',
}), null, 'whitespace-mutated user aliases must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session: {
        ...session,
        user: { ...session.user, id: 'platform-user-2' },
    },
    userData: currentUser,
}), false, 'current persisted platform authority must reject contradictory user aliases');
assert.equal(isCurrentUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, platformRole: 'OWNER' },
}), true, 'a current non-platform user remains eligible for self-service account mutations');
assert.equal(isCurrentUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, platformRole: 'OWNER', authDisabled: 'false' },
}), false, 'malformed lifecycle markers must fail current-user admission');
assert.equal(isCurrentUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, platformRole: 'OWNER', isVerified: false },
}), false, 'an unverified current user cannot perform a security-sensitive account mutation');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, platformRole: 'OWNER' },
}), false, 'a downgraded platform operator must fail current authorization');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, active: false },
}), false);
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, authDisabled: true },
}), false);
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, authDisabled: 'true' },
}), false, 'malformed auth-disabled markers must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, deleted: 'true' },
}), false, 'malformed deletion markers must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, blocked: 'true' },
}), false, 'malformed block markers must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, blockDetails: { blocked: 'true' } },
}), false, 'malformed nested block markers must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, blockDetails: 'invalid' },
}), false, 'malformed block details must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, email: 'other@example.com' },
}), false);
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'other-user',
    session,
    userData: { ...currentUser, id: 'other-user' },
}), false);
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, sessionRevokedAt: 1_800_000_001 },
}), false, 'a revocation after issuance must fail');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, sessionRevokedAt: 1_800_000_000 },
}), false, 'a revocation at the issuance boundary must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, sessionRevokedAt: 1_799_999_999 },
}), true, 'an older revocation marker must not invalidate a newer session');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session: { ...session, authIssuedAt: undefined },
    userData: currentUser,
}), false, 'a platform session without a comparable issuance time must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, sessionRevokedAt: 'not-a-timestamp' },
}), false, 'malformed persisted revocation state must fail closed');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, sessionRevokedAt: { seconds: 1_799_999_999, nanoseconds: 500_000_000 } },
}), true, 'a valid Firestore timestamp-like revocation marker remains comparable');
assert.equal(isCurrentPlatformUserRecordEligible({
    documentId: 'platform-user-1',
    session,
    userData: { ...currentUser, sessionRevokedAt: { seconds: 1_799_999_999, nanoseconds: 1_000_000_000 } },
}), false, 'an invalid Firestore nanosecond value must fail closed');

process.stdout.write('Current user and platform-user authorization tests passed.\n');
