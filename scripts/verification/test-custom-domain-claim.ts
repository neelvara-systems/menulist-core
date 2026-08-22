#!/usr/bin/env ts-node

import { deleteApp, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
    getCustomDomainClaimDocumentId,
    isCustomDomainUnavailableError,
    isReservedCustomDomainClaimCandidate,
    normalizeCustomDomainClaimCandidate,
    readCustomDomainReservationInTransaction,
    writeCurrentCustomDomainClaim,
    writeReleasedCustomDomainClaim,
    writeReleasingCustomDomainClaim,
    writeReservedCustomDomainClaim,
} from '../../src/lib/routing/customDomainClaim';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-custom-domain-claim';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    assert(normalizeCustomDomainClaimCandidate('owner.example.com') === 'owner.example.com', 'valid domains must normalize');
    assert(normalizeCustomDomainClaimCandidate('Owner.example.com') === null, 'claim inputs must already be canonical lowercase');
    assert(normalizeCustomDomainClaimCandidate('owner.example.com/path') === null, 'paths must not enter domain claims');
    assert(
        normalizeCustomDomainClaimCandidate(`${'a'.repeat(64)}.example.com`) === null,
        'DNS labels longer than 63 characters must fail before provider work',
    );
    assert(isReservedCustomDomainClaimCandidate('menulist.ai'), 'production MenuList root must be reserved');
    assert(isReservedCustomDomainClaimCandidate('app.menulist.ai'), 'MenuList owner app namespace must be reserved');
    assert(isReservedCustomDomainClaimCandidate('menulist.online'), 'MenuList production tenant root must be reserved');
    assert(isReservedCustomDomainClaimCandidate('sample-cafe.menulist.online'), 'MenuList production tenant namespace must be reserved');
    assert(isReservedCustomDomainClaimCandidate('menulist.digital'), 'MenuList QA platform root must be reserved');
    assert(isReservedCustomDomainClaimCandidate('app.menulist.digital'), 'MenuList QA owner app namespace must be reserved');
    assert(isReservedCustomDomainClaimCandidate('qa-cafe.menulist.digital'), 'MenuList QA tenant namespace must be reserved');
    assert(isReservedCustomDomainClaimCandidate('canonica.app'), 'preview product host must be reserved');
    assert(isReservedCustomDomainClaimCandidate('www.canonica.app'), 'preview product www host must be reserved');
    assert(isReservedCustomDomainClaimCandidate('support.answerlattice.com'), 'product descendants must be reserved');
    assert(isReservedCustomDomainClaimCandidate('surfaceos.app'), 'declared future product roots must be reserved');
    assert(!isReservedCustomDomainClaimCandidate('owner.example.com'), 'unrelated owner domains must remain available');

    const app = getApps().length
        ? getApp()
        : initializeApp({ projectId: PROJECT_ID });
    const db = getFirestore(app);
    const now = Timestamp.fromMillis(Date.now());
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 60_000);

    let reservationSequence = 0;
    const reserve = (
        storeId: string,
        tenantId: string,
        domain: string,
        reservationId = `reservation-${++reservationSequence}`,
    ) => db.runTransaction(async (transaction) => {
        const reservation = await readCustomDomainReservationInTransaction({
            db,
            domain,
            nowMillis: now.toMillis(),
            reservationId,
            storeId,
            tenantId,
            transaction,
        });
        writeReservedCustomDomainClaim(transaction, reservation, now, expiresAt);
        return reservation;
    });

    const contestedDomain = 'contested.example.com';
    const contested = await Promise.allSettled([
        reserve('101', '201', contestedDomain),
        reserve('102', '202', contestedDomain),
    ]);
    const winners = contested.filter((result) => result.status === 'fulfilled');
    const losers = contested.filter((result) => result.status === 'rejected');
    assert(winners.length === 1 && losers.length === 1, 'concurrent stores must not both reserve one domain');
    assert(
        losers[0].status === 'rejected' && isCustomDomainUnavailableError(losers[0].reason),
        'the losing concurrent reservation must fail with the stable unavailable error',
    );
    const winningReservation = winners[0].status === 'fulfilled' ? winners[0].value : null;
    assert(winningReservation, 'a concurrent reservation winner must exist');
    await db.runTransaction(async (transaction) => {
        const sameOwner = await readCustomDomainReservationInTransaction({
            db,
            domain: contestedDomain,
            nowMillis: now.toMillis(),
            reservationId: winningReservation.reservationId || undefined,
            storeId: winningReservation.storeId,
            tenantId: winningReservation.tenantId,
            transaction,
        });
        writeCurrentCustomDomainClaim(transaction, sameOwner, now);
    });
    const currentClaim = await db.collection('platformSummary')
        .doc(getCustomDomainClaimDocumentId(contestedDomain))
        .get();
    assert(currentClaim.data()?.status === 'current', 'the winning reservation must become current');

    const activeReservationDomain = 'active-reservation.example.com';
    const activeReservation = await reserve('110', '210', activeReservationDomain, 'active-owner-operation');
    let sameOwnerOverlapBlocked = false;
    try {
        await reserve('110', '210', activeReservationDomain, 'overlapping-owner-operation');
    } catch (error) {
        sameOwnerOverlapBlocked = isCustomDomainUnavailableError(error);
    }
    assert(sameOwnerOverlapBlocked, 'a second operation from the same store must not replace an active reservation');
    await db.runTransaction(async (transaction) => {
        const continued = await readCustomDomainReservationInTransaction({
            db,
            domain: activeReservationDomain,
            nowMillis: now.toMillis(),
            reservationId: activeReservation.reservationId || undefined,
            storeId: activeReservation.storeId,
            tenantId: activeReservation.tenantId,
            transaction,
        });
        writeReleasingCustomDomainClaim(
            transaction,
            continued,
            now,
            Timestamp.fromMillis(now.toMillis() + 60_000),
        );
    });
    let sameOwnerReleaseOverlapBlocked = false;
    try {
        await reserve('110', '210', activeReservationDomain, 'release-overlap-operation');
    } catch (error) {
        sameOwnerReleaseOverlapBlocked = isCustomDomainUnavailableError(error);
    }
    assert(
        sameOwnerReleaseOverlapBlocked,
        'the same store must not reclaim a domain while provider release is in flight',
    );

    const legacyDomain = 'legacy-owner.example.com';
    await db.collection('stores').doc('103').set({
        active: false,
        customDomain: legacyDomain,
        storeId: 103,
        tenantId: 203,
    });
    let legacyConflictBlocked = false;
    try {
        await reserve('104', '204', legacyDomain);
    } catch (error) {
        legacyConflictBlocked = isCustomDomainUnavailableError(error);
    }
    assert(legacyConflictBlocked, 'legacy inactive store ownership must block silent domain reassignment');

    await db.runTransaction(async (transaction) => {
        writeReleasedCustomDomainClaim(transaction, winningReservation, now);
    });
    const successorStoreId = winningReservation.storeId === '101' ? '102' : '101';
    const successorTenantId = successorStoreId === '101' ? '201' : '202';
    const successorReservation = await reserve(successorStoreId, successorTenantId, contestedDomain);
    assert(successorReservation.storeId === successorStoreId, 'released claims must permit an explicit successor');

    const expiredDomain = 'expired-reservation.example.com';
    const expiredClaimRef = db.collection('platformSummary').doc(getCustomDomainClaimDocumentId(expiredDomain));
    await expiredClaimRef.set({
        customDomain: expiredDomain,
        expiresAt: Timestamp.fromMillis(now.toMillis() - 1),
        status: 'reserved',
        storeId: '105',
        tId: '205',
    });
    const recoveredReservation = await reserve('106', '206', expiredDomain);
    assert(recoveredReservation.storeId === '106', 'expired reservations must not permanently strand a domain');

    const expiredReleaseDomain = 'expired-release.example.com';
    const expiredReleaseRef = db.collection('platformSummary')
        .doc(getCustomDomainClaimDocumentId(expiredReleaseDomain));
    await expiredReleaseRef.set({
        customDomain: expiredReleaseDomain,
        expiresAt: Timestamp.fromMillis(now.toMillis() - 1),
        reservationId: 'expired-release-operation',
        status: 'releasing',
        storeId: '107',
        tId: '207',
    });
    const recoveredRelease = await reserve('108', '208', expiredReleaseDomain);
    assert(recoveredRelease.storeId === '108', 'expired release leases must recover after bounded cleanup time');

    const duplicateDomain = 'duplicate-legacy.example.com';
    await Promise.all([
        db.collection('stores').doc('111').set({ customDomain: duplicateDomain, storeId: 111, tenantId: 211 }),
        db.collection('stores').doc('112').set({ customDomain: duplicateDomain, storeId: 112, tenantId: 212 }),
    ]);
    let duplicateLegacyBlocked = false;
    try {
        await reserve('111', '211', duplicateDomain);
    } catch (error) {
        duplicateLegacyBlocked = isCustomDomainUnavailableError(error);
    }
    assert(duplicateLegacyBlocked, 'duplicate legacy rows must remain fail-closed instead of choosing a winner');

    await deleteApp(app);
    process.stdout.write('Custom domain claim transaction tests passed.\n');
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
