/**
 * Replace legacy Digital Screens public listener mirrors with the token-free
 * public shape required by firestore.rules.
 *
 * Dry-run is the default. Write mode requires an explicit project confirmation
 * and either one store or an explicit all-screens acknowledgement.
 *
 * Usage:
 *   npm run backfill:digital-screen-public-mirrors -- --project-id menulist-qa --all-screens
 *   npm run backfill:digital-screen-public-mirrors -- --project-id menulist-qa --store-id 42 --write --confirm-project menulist-qa
 *   npm run backfill:digital-screen-public-mirrors -- --project-id menulist-qa --all-screens --write --confirm-project menulist-qa
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../src/constants/database';

const args = process.argv.slice(2);
const PAGE_SIZE = 200;
const CAMPAIGN_SUMMARY_ID_PATTERN = /^campaigns_(\d+)$/;
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
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running the Digital Screens mirror backfill.');
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

function isTimestampLike(value: unknown): boolean {
    return Boolean(value && typeof (value as { toMillis?: unknown }).toMillis === 'function');
}

function buildPublicMirror(
    storeId: string,
    screen: Record<string, unknown>,
): Record<string, unknown> | null {
    const token = typeof screen.screenToken === 'string' ? screen.screenToken : '';
    const contentVersion = Number(screen.contentVersion);
    if (
        !SCREEN_TOKEN_PATTERN.test(token)
        || !Number.isInteger(contentVersion)
        || contentVersion < 1
        || !isTimestampLike(screen.lastContentChangeAt)
        || typeof screen.enabled !== 'boolean'
    ) {
        return null;
    }

    return {
        contentVersion,
        enabled: screen.enabled,
        lastContentChangeAt: screen.lastContentChangeAt,
        storeId,
        updatedAt: Timestamp.now(),
    };
}

async function loadScreenSummaries(
    db: FirebaseFirestore.Firestore,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const storeId = getArg('--store-id');
    if (storeId) {
        if (!/^\d+$/.test(storeId)) throw new Error('Digital Screens mirror backfill requires a numeric --store-id.');
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
        throw new Error('Pass --store-id or --all-screens before running the Digital Screens mirror backfill.');
    }
    if (storeId && allScreens) {
        throw new Error('Use either --store-id or --all-screens, not both.');
    }
    if (write && confirmedProjectId !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId}.`);
    }

    if (!admin.apps.length) admin.initializeApp({ projectId });
    const db = admin.firestore();

    console.log(`Project: ${projectId}`);
    console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);
    console.log(`Scope: ${storeId ? `store ${storeId}` : 'all initialized screens'}`);

    const summaries = await loadScreenSummaries(db);
    let eligible = 0;
    let skipped = 0;
    let written = 0;
    let batch = db.batch();
    let pendingWrites = 0;

    for (const summary of summaries) {
        const idMatch = summary.id.match(CAMPAIGN_SUMMARY_ID_PATTERN);
        const resolvedStoreId = idMatch?.[1] || '';
        const screen = summary.data()?.screen as Record<string, unknown> | undefined;
        const publicMirror = resolvedStoreId && screen
            ? buildPublicMirror(resolvedStoreId, screen)
            : null;

        if (!publicMirror) {
            skipped += 1;
            continue;
        }

        eligible += 1;
        if (!write) continue;

        batch.set(
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`screen_${resolvedStoreId}`),
            publicMirror,
            { merge: false },
        );
        pendingWrites += 1;

        if (pendingWrites >= PAGE_SIZE) {
            await batch.commit();
            written += pendingWrites;
            batch = db.batch();
            pendingWrites = 0;
        }
    }

    if (write && pendingWrites > 0) {
        await batch.commit();
        written += pendingWrites;
    }

    console.log(`Canonical screen summaries checked: ${summaries.length}`);
    console.log(`Eligible token-free mirrors: ${eligible}`);
    console.log(`Skipped invalid summaries: ${skipped}`);
    console.log(`Mirrors written: ${written}`);
}

main().catch((error) => {
    console.error('digital_screen_public_mirror_backfill_failed', JSON.stringify(getErrorSummary(error)));
    process.exitCode = 1;
});
