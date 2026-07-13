import { DB_COLLECTIONS } from '@constant/database';
import {
    findNextAvailablePlatformEntityId,
    LEGACY_PLATFORM_COUNTER_DOCUMENT_ID,
    PLATFORM_COUNTER_DOCUMENT_ID,
    resolvePlatformCounterFloor,
    type PlatformCounterSnapshot,
    type PlatformEntityCounter,
} from '@data/shared/platformCounterBoundary';
import {
    doc,
    Firestore,
    getDoc,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';

export type { PlatformCounterSnapshot, PlatformEntityCounter } from '@data/shared/platformCounterBoundary';

function getPlatformCounterRefs(db: Firestore) {
    return {
        canonical: doc(db, DB_COLLECTIONS.PLATFORM_SUMMARY, PLATFORM_COUNTER_DOCUMENT_ID),
        legacy: doc(db, DB_COLLECTIONS.PLATFORM_SUMMARY, LEGACY_PLATFORM_COUNTER_DOCUMENT_ID),
        storesSummary: doc(db, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary'),
    };
}

export async function readPlatformCounterSnapshot(db: Firestore): Promise<PlatformCounterSnapshot> {
    const refs = getPlatformCounterRefs(db);
    const [canonical, legacy, storesSummary] = await Promise.all([
        getDoc(refs.canonical),
        getDoc(refs.legacy),
        getDoc(refs.storesSummary),
    ]);
    return {
        stores: {
            count: resolvePlatformCounterFloor(
                canonical.data(),
                legacy.data(),
                storesSummary.data(),
                'store',
            ),
        },
        tenants: {
            count: resolvePlatformCounterFloor(
                canonical.data(),
                legacy.data(),
                storesSummary.data(),
                'tenant',
            ),
        },
    };
}

export async function allocateNextPlatformEntityId(
    db: Firestore,
    counter: PlatformEntityCounter,
): Promise<number> {
    return runTransaction(db, async (transaction) => {
        const refs = getPlatformCounterRefs(db);
        const [canonical, legacy, storesSummary] = await Promise.all([
            transaction.get(refs.canonical),
            transaction.get(refs.legacy),
            transaction.get(refs.storesSummary),
        ]);
        const counterFloor = resolvePlatformCounterFloor(
            canonical.data(),
            legacy.data(),
            storesSummary.data(),
            counter,
        );
        const collectionName = counter === 'tenant' ? DB_COLLECTIONS.TENANTS : DB_COLLECTIONS.STORES;

        const nextId = await findNextAvailablePlatformEntityId(
            counterFloor,
            async (candidateId) => (
                await transaction.get(doc(db, collectionName, String(candidateId)))
            ).exists(),
        );

        const fieldName = counter === 'tenant' ? 'tenants' : 'stores';
        transaction.set(refs.canonical, {
            [fieldName]: { count: nextId },
            modifiedOn: serverTimestamp(),
        }, { merge: true });

        return nextId;
    });
}
