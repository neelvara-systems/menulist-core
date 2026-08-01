/**
 * Move legacy Digital Screens bearer tokens out of tenant-readable campaign
 * summaries and into server-only screenControl_{storeId} documents.
 *
 * Dry-run is the default. Write mode requires an explicit project confirmation.
 *
 * Usage:
 *   npm run backfill:digital-screen-private-controls -- --project-id menulist-qa --all-screens
 *   npm run backfill:digital-screen-private-controls -- --project-id menulist-qa --store-id 42 --write --confirm-project menulist-qa
 *   npm run backfill:digital-screen-private-controls -- --project-id menulist-qa --all-screens --write --confirm-project menulist-qa
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../src/constants/database';
import { normalizeStorePermissionScopeDocumentId } from '../src/lib/permissions/scopeDocumentId';
import { normalizeMenuListPublicEntityIdentityAliases } from '../src/lib/publicTruth/entityEligibility';
import { isCurrentScreenSeenPublicScope } from '../src/lib/screen/screenSeenScope';
import { isValidScreenToken } from '../src/lib/screen/utils';

const args = process.argv.slice(2);
const PAGE_SIZE = 200;
const CAMPAIGN_SUMMARY_ID_PATTERN = /^campaigns_(\d{1,20})$/;
const SCREEN_TOKEN_PATTERN = /^[A-Za-z0-9]{6,24}$/;
const ADMIN_APP_NAME = 'menulist-digital-screen-private-control-backfill';

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function getProjectId(): string {
    const candidate = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;
    if (
        typeof candidate !== 'string'
        || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(candidate)
    ) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running the Digital Screens private-control backfill.');
    }
    return candidate;
}

function getBoundedErrorValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return null;
    return value.trim().replace(/\s+/g, ' ').slice(0, 180);
}

function getErrorSummary(error: unknown) {
    const readErrorField = (key: string): unknown => {
        try {
            if (!error || typeof error !== 'object') return undefined;
            return Object.prototype.hasOwnProperty.call(error, key)
                ? (error as Record<string, unknown>)[key]
                : undefined;
        } catch {
            return undefined;
        }
    };
    return {
        code: getBoundedErrorValue(readErrorField('code')),
        errorName: getBoundedErrorValue(readErrorField('name')),
        message: getBoundedErrorValue(readErrorField('message')),
    };
}

export function resolvePrivateScreenControlInput(
    storeId: string,
    screen: unknown,
    store: unknown,
): { screenToken: string; storeId: string; tenantId: string } | null {
    if (
        !screen
        || typeof screen !== 'object'
        || Array.isArray(screen)
        || !store
        || typeof store !== 'object'
        || Array.isArray(store)
    ) {
        return null;
    }
    const screenRecord = screen as Record<string, unknown>;
    const storeRecord = store as Record<string, unknown>;
    const screenToken = typeof screenRecord.screenToken === 'string'
        ? screenRecord.screenToken.trim()
        : '';
    const storeDocumentScope = normalizeStorePermissionScopeDocumentId(storeId);
    const storedStoreScope = normalizeMenuListPublicEntityIdentityAliases([
        storeRecord.storeId,
        storeRecord.sId,
    ]);
    const storedTenantScope = normalizeMenuListPublicEntityIdentityAliases([
        storeRecord.tenantId,
        storeRecord.tId,
    ]);
    if (
        !storeDocumentScope
        || !storedStoreScope
        || !storedTenantScope
        || storedStoreScope.documentId !== storeDocumentScope.documentId
        || !SCREEN_TOKEN_PATTERN.test(screenToken)
        || !isValidScreenToken(screenToken)
    ) {
        return null;
    }
    return {
        screenToken,
        storeId: storeDocumentScope.documentId,
        tenantId: storedTenantScope.documentId,
    };
}

async function loadLegacyScreenSummaries(
    db: FirebaseFirestore.Firestore,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const storeId = getArg('--store-id');
    if (storeId) {
        if (!/^\d{1,20}$/.test(storeId)) {
            throw new Error('Digital Screens private-control backfill requires a numeric --store-id.');
        }
        const snapshot = await db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`campaigns_${storeId}`)
            .get();
        return snapshot.exists ? [snapshot as FirebaseFirestore.QueryDocumentSnapshot] : [];
    }

    const summaries: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    do {
        let query: FirebaseFirestore.Query = db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .where('screen.screenToken', '>=', '')
            .orderBy('screen.screenToken')
            .limit(PAGE_SIZE);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        summaries.push(...page.docs);
        cursor = page.docs.length === PAGE_SIZE ? page.docs[page.docs.length - 1] : null;
    } while (cursor);
    return summaries;
}

async function main() {
    const projectId = getProjectId();
    const write = hasFlag('--write');
    const storeId = getArg('--store-id');
    const allScreens = hasFlag('--all-screens');
    const confirmedProjectId = getArg('--confirm-project');

    if (!storeId && !allScreens) {
        throw new Error('Pass --store-id or --all-screens before running the Digital Screens private-control backfill.');
    }
    if (storeId && allScreens) {
        throw new Error('Use either --store-id or --all-screens, not both.');
    }
    if (write && confirmedProjectId !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId}.`);
    }

    const existingApp = getApps().find((app) => app.name === ADMIN_APP_NAME);
    if (existingApp?.options.projectId && existingApp.options.projectId !== projectId) {
        throw new Error('Digital Screens private-control backfill Admin app project mismatch.');
    }
    const app = existingApp || initializeApp({ projectId }, ADMIN_APP_NAME);
    const db = getFirestore(app);
    const summaries = await loadLegacyScreenSummaries(db);
    let eligible = 0;
    let skipped = 0;
    let migrated = 0;

    console.log(`Project: ${projectId}`);
    console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);
    console.log(`Scope: ${storeId ? `store ${storeId}` : 'all legacy screens'}`);

    for (const summary of summaries) {
        const resolvedStoreId = summary.id.match(CAMPAIGN_SUMMARY_ID_PATTERN)?.[1] || '';
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(resolvedStoreId);
        const storeSnapshot = resolvedStoreId ? await storeRef.get() : null;
        const candidateInput = resolvedStoreId && storeSnapshot?.exists
            ? resolvePrivateScreenControlInput(
                resolvedStoreId,
                summary.data()?.screen,
                storeSnapshot.data() || {},
            )
            : null;
        const tenantSnapshot = candidateInput
            ? await db.collection(DB_COLLECTIONS.TENANTS).doc(candidateInput.tenantId).get()
            : null;
        const input = candidateInput
            && storeSnapshot?.exists
            && tenantSnapshot?.exists
            && isCurrentScreenSeenPublicScope({
                storeData: storeSnapshot.data(),
                storeDocumentId: storeSnapshot.id,
                tenantData: tenantSnapshot.data(),
                tenantDocumentId: tenantSnapshot.id,
            })
            ? candidateInput
            : null;
        if (!input) {
            skipped += 1;
            continue;
        }
        eligible += 1;
        if (!write) continue;

        await db.runTransaction(async (transaction) => {
            const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(summary.id);
            const controlRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`screenControl_${resolvedStoreId}`);
            const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(input.tenantId);
            const [currentSummary, currentControl, currentStore, currentTenant] = await Promise.all([
                transaction.get(summaryRef),
                transaction.get(controlRef),
                transaction.get(storeRef),
                transaction.get(tenantRef),
            ]);
            const currentInput = currentSummary.exists && currentStore.exists
                ? resolvePrivateScreenControlInput(
                    resolvedStoreId,
                    currentSummary.data()?.screen,
                    currentStore.data() || {},
                )
                : null;
            if (
                !currentInput
                || currentInput.tenantId !== input.tenantId
                || !currentTenant.exists
                || !isCurrentScreenSeenPublicScope({
                    storeData: currentStore.data(),
                    storeDocumentId: currentStore.id,
                    tenantData: currentTenant.data(),
                    tenantDocumentId: currentTenant.id,
                })
            ) {
                throw new Error(`Screen ${resolvedStoreId} changed during migration.`);
            }

            const control = currentControl.data();
            if (
                currentControl.exists
                && (
                    control?.screenToken !== currentInput.screenToken
                    || control?.storeId !== currentInput.storeId
                    || control?.tenantId !== currentInput.tenantId
                )
            ) {
                throw new Error(`Screen ${resolvedStoreId} has a conflicting private control.`);
            }

            const now = Timestamp.now();
            transaction.set(controlRef, {
                createdAt: control?.createdAt || now,
                ...currentInput,
                updatedAt: now,
            }, { merge: false });
            transaction.update(summaryRef, {
                'screen.screenToken': FieldValue.delete(),
            });
        });
        migrated += 1;
    }

    console.log(`Legacy summaries checked: ${summaries.length}`);
    console.log(`Eligible private controls: ${eligible}`);
    console.log(`Skipped invalid summaries: ${skipped}`);
    console.log(`Screens migrated: ${migrated}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('digital_screen_private_control_backfill_failed', JSON.stringify(getErrorSummary(error)));
        process.exitCode = 1;
    });
}
