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

const args = process.argv.slice(2);
const PAGE_SIZE = 200;
const CAMPAIGN_SUMMARY_ID_PATTERN = /^campaigns_(\d{1,20})$/;
const SCREEN_TOKEN_PATTERN = /^[A-Za-z0-9]{6,24}$/;

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function getProjectId(): string {
    const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running the Digital Screens private-control backfill.');
    }
    return projectId;
}

function getBoundedErrorValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return null;
    return value.trim().replace(/\s+/g, ' ').slice(0, 180);
}

function getErrorSummary(error: unknown) {
    const source = error as { code?: unknown; message?: unknown; name?: unknown };
    return {
        code: getBoundedErrorValue(source?.code),
        errorName: getBoundedErrorValue(source?.name),
        message: getBoundedErrorValue(source?.message),
    };
}

export function resolvePrivateScreenControlInput(
    storeId: string,
    screen: Record<string, unknown>,
    store: Record<string, unknown>,
): { screenToken: string; storeId: string; tenantId: string } | null {
    const screenToken = typeof screen.screenToken === 'string' ? screen.screenToken.trim() : '';
    const rawTenantId = store.tenantId ?? store.tId;
    const tenantId = typeof rawTenantId === 'string' || typeof rawTenantId === 'number'
        ? String(rawTenantId).trim()
        : '';
    if (
        !/^\d{1,20}$/.test(storeId)
        || !SCREEN_TOKEN_PATTERN.test(screenToken)
        || !tenantId
    ) {
        return null;
    }
    return { screenToken, storeId, tenantId };
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

    if (!getApps().length) initializeApp({ projectId });
    const db = getFirestore();
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
        const input = resolvedStoreId && storeSnapshot?.exists
            ? resolvePrivateScreenControlInput(
                resolvedStoreId,
                summary.data()?.screen as Record<string, unknown>,
                storeSnapshot.data() || {},
            )
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
            const [currentSummary, currentControl, currentStore] = await Promise.all([
                transaction.get(summaryRef),
                transaction.get(controlRef),
                transaction.get(storeRef),
            ]);
            const currentInput = currentSummary.exists && currentStore.exists
                ? resolvePrivateScreenControlInput(
                    resolvedStoreId,
                    currentSummary.data()?.screen as Record<string, unknown>,
                    currentStore.data() || {},
                )
                : null;
            if (!currentInput) throw new Error(`Screen ${resolvedStoreId} changed during migration.`);

            const control = currentControl.data();
            if (
                currentControl.exists
                && (
                    control?.screenToken !== currentInput.screenToken
                    || String(control?.storeId || '') !== currentInput.storeId
                    || String(control?.tenantId || '') !== currentInput.tenantId
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
