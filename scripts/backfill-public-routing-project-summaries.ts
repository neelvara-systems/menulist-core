/**
 * Backfill missing `platformSummary/projects_{storeId}` documents from the
 * canonical project collection (`projects/{tenantId}/{storeId}/{projectId}`).
 *
 * This is intentionally conservative:
 * - dry-run by default; pass `--write` to mutate Firestore
 * - skips stores with no canonical project docs instead of creating menus
 * - writes only lightweight summary/routing data, never menu body data
 * - uses the canonical summary writer helper so the storage shape stays aligned
 * - carries valid historical publish truth into both project summary and store
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-public-routing-project-summaries.ts --project-id menulist-qa --store-id 17
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-public-routing-project-summaries.ts --project-id menulist-qa --store-id 17 --write --confirm-project menulist-qa
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { buildSummaryProjectsBatchPayload } from '../src/lib/firestore/summaryProjectsWriter';
import {
    allocateProjectBackfillSlug,
    deriveProjectBackfillBaseSlug,
    isReservedProjectBackfillSlug,
    slugifyProjectBackfillValue,
} from './backfill-project-slugs';

const args = process.argv.slice(2);
const MAX_STORE_LIMIT = 1_500;
let db: FirebaseFirestore.Firestore;

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    if (index === -1) return null;
    return args[index + 1] || null;
}

function getRequiredProjectId(): string {
    const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running the public-routing summary backfill.');
    }
    return projectId;
}

function resolveText(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const localized = value as Record<string, unknown>;
        const preferred = localized.en || localized.en_US || localized.default;
        if (typeof preferred === 'string' && preferred.trim()) return preferred.trim();
        const first = Object.values(localized).find((entry) => typeof entry === 'string' && entry.trim());
        if (typeof first === 'string' && first.trim()) return first.trim();
    }
    return fallback;
}

function normalizeTimestamp(value: unknown): Timestamp | null {
    if (!value) return null;
    try {
        let millis: number | null = null;
        if (value instanceof Date) {
            millis = value.getTime();
        } else if (typeof value === 'string') {
            millis = Date.parse(value);
        } else if (typeof value === 'number') {
            millis = value;
        } else if (typeof value === 'object') {
            const timestamp = value as {
                _seconds?: number;
                seconds?: number;
                toMillis?: () => number;
            };
            if (typeof timestamp.toMillis === 'function') millis = timestamp.toMillis();
            else if (typeof timestamp.seconds === 'number') millis = timestamp.seconds * 1000;
            else if (typeof timestamp._seconds === 'number') millis = timestamp._seconds * 1000;
        }
        if (millis === null || !Number.isFinite(millis) || millis <= 0) return null;
        return Timestamp.fromMillis(millis);
    } catch {
        return null;
    }
}

function makeSlug(
    projectId: string,
    data: Record<string, unknown>,
    claimedSlugs: Set<string>,
): string {
    const rawExisting = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
    const normalizedExisting = slugifyProjectBackfillValue(rawExisting);
    if (rawExisting) {
        if (normalizedExisting !== rawExisting || isReservedProjectBackfillSlug(rawExisting)) {
            throw new Error(`Canonical project ${projectId} has an invalid slug; repair canonical truth before rebuilding its summary.`);
        }
        if (claimedSlugs.has(rawExisting)) {
            throw new Error(`Canonical project ${projectId} has a duplicate slug; repair canonical truth before rebuilding its summary.`);
        }
        claimedSlugs.add(rawExisting);
        return rawExisting;
    }

    const base = deriveProjectBackfillBaseSlug(projectId, data);
    const slug = allocateProjectBackfillSlug(base, projectId, claimedSlugs);
    claimedSlugs.add(slug);
    return slug;
}

function buildSummary(
    projectId: string,
    data: Record<string, unknown>,
    markDefault: boolean,
    claimedSlugs: Set<string>,
): Record<string, unknown> {
    const name = data.name || { en: projectId.includes('-default-') ? 'Menu' : resolveText(data.name, 'Menu') };
    const description = data.description;
    const specialMenu = data._specialMenu
        && typeof data._specialMenu === 'object'
        && !Array.isArray(data._specialMenu)
        ? data._specialMenu as Record<string, unknown>
        : null;
    const lastPublishedAt = normalizeTimestamp(data.lastPublishedAt);
    return Object.fromEntries(Object.entries({
        name,
        ...(description !== undefined ? { description } : {}),
        ...(data.projectImage !== undefined ? { projectImage: data.projectImage } : {}),
        ...(data.businessCategory !== undefined ? { businessCategory: data.businessCategory } : {}),
        ...(data.businessType !== undefined ? { businessType: data.businessType } : {}),
        ...(lastPublishedAt ? { lastPublishedAt } : {}),
        active: data.active !== false,
        isDefault: data.isDefault === true || markDefault,
        slug: makeSlug(projectId, data, claimedSlugs),
        ...(Array.isArray(data.previousSlugs) ? { previousSlugs: data.previousSlugs } : {}),
        ...(specialMenu ? {
            isSpecialMenu: true,
            specialMenuDisplayName: specialMenu.displayName || data.name || name,
            specialMenuStatus: specialMenu.status || 'scheduled',
            specialMenuStartsAt: specialMenu.startsAt,
            specialMenuEndsAt: specialMenu.endsAt,
            specialMenuMode: specialMenu.mode,
            specialMenuBaseProjectId: specialMenu.baseProjectId,
        } : {}),
    }).filter(([, value]) => value !== undefined));
}

function isBlocked(value: Record<string, unknown>): boolean {
    const blockDetails = value.blockDetails;
    return value.blocked === true
        || value.tenantBlocked === true
        || (
            blockDetails != null
            && typeof blockDetails === 'object'
            && !Array.isArray(blockDetails)
            && (blockDetails as Record<string, unknown>).blocked === true
        );
}

async function loadStores() {
    const storeId = getArg('--store-id');
    if (storeId) {
        if (!/^[1-9]\d*$/.test(storeId)) throw new Error('--store-id must be a positive numeric document ID.');
        const snap = await db.collection('stores').doc(String(storeId)).get();
        return snap.exists ? [snap] : [];
    }
    let query: FirebaseFirestore.Query = db.collection('stores');
    const tenantId = getArg('--tenant-id');
    if (tenantId) {
        if (!/^[1-9]\d*$/.test(tenantId)) throw new Error('--tenant-id must be a positive numeric document ID.');
        query = query.where('tenantId', '==', Number(tenantId));
    }
    const limitArg = getArg('--limit');
    if (limitArg) {
        const limit = Number(limitArg);
        if (!Number.isSafeInteger(limit) || limit <= 0 || limit > MAX_STORE_LIMIT) {
            throw new Error(`--limit must be a positive integer no greater than ${MAX_STORE_LIMIT}.`);
        }
        query = query.limit(limit);
    }
    const snapshot = await query.get();
    return snapshot.docs;
}

async function main() {
    const projectId = getRequiredProjectId();
    const write = hasFlag('--write');
    const storeId = getArg('--store-id');
    const tenantId = getArg('--tenant-id');
    const allStores = hasFlag('--all-stores');
    const scopeCount = Number(Boolean(storeId)) + Number(Boolean(tenantId)) + Number(allStores);
    if (scopeCount !== 1) {
        throw new Error('Pass exactly one of --store-id, --tenant-id, or --all-stores.');
    }
    if (write && getArg('--confirm-project') !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId}.`);
    }
    if (write && hasFlag('--force') && !hasFlag('--confirm-force')) {
        throw new Error('Refusing forced overwrite: pass --confirm-force after reviewing the target summaries.');
    }
    if (!getApps().length) initializeApp({ projectId });
    db = getFirestore();

    const stores = await loadStores();
    let scannedStores = 0;
    let skippedNoProjects = 0;
    let skippedExistingSummary = 0;
    let skippedInactiveOrBlocked = 0;
    let writtenStores = 0;
    let candidateStores = 0;

    console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);

    for (const storeDoc of stores) {
        scannedStores += 1;
        const store = storeDoc.data() || {};
        const storeId = String(store.storeId ?? storeDoc.id);
        const tenantId = store.tenantId;
        if (store.active === false || isBlocked(store)) {
            skippedInactiveOrBlocked += 1;
            continue;
        }
        if (tenantId == null) {
            console.log(`[skip] store=${storeId}: missing tenantId`);
            continue;
        }

        const summaryRef = db.collection('platformSummary').doc(`projects_${storeId}`);
        const existingSummary = await summaryRef.get();
        if (existingSummary.exists && !hasFlag('--force')) {
            skippedExistingSummary += 1;
            continue;
        }

        const projectsSnap = await db.collection('projects').doc(String(tenantId)).collection(storeId).get();
        const projectDocs = projectsSnap.docs.filter((doc) => {
            const data = doc.data() || {};
            return data.deleted !== true;
        });
        if (projectDocs.length === 0) {
            skippedNoProjects += 1;
            console.log(`[skip] store=${storeId} tenant=${tenantId}: no canonical projects`);
            continue;
        }

        candidateStores += 1;
        const activeRegular = projectDocs.filter((doc) => {
            const data = doc.data() || {};
            return data.active !== false && data._specialMenu == null;
        });
        const hasExplicitDefault = projectDocs.some((doc) => doc.data()?.isDefault === true);
        const fallbackDefaultId = activeRegular[0]?.id || projectDocs[0]?.id || '';
        const summaries: Record<string, Record<string, unknown>> = {};
        const claimedSlugs = new Set<string>();
        let latestPublishedAt: Timestamp | null = null;
        for (const projectDoc of [...projectDocs].sort((left, right) => left.id.localeCompare(right.id))) {
            const projectData = projectDoc.data() || {};
            const projectPublishedAt = projectData.active === false
                ? null
                : normalizeTimestamp(projectData.lastPublishedAt);
            if (projectPublishedAt && (!latestPublishedAt || projectPublishedAt.toMillis() > latestPublishedAt.toMillis())) {
                latestPublishedAt = projectPublishedAt;
            }
            summaries[projectDoc.id] = buildSummary(
                projectDoc.id,
                projectData,
                !hasExplicitDefault && projectDoc.id === fallbackDefaultId,
                claimedSlugs,
            );
        }

        const payload = {
            lastUpdated: FieldValue.serverTimestamp(),
            ...buildSummaryProjectsBatchPayload(summaries),
        };
        const projectIds = Object.keys(summaries).join(', ');
        console.log(`${write ? '[write]' : '[dry]'} store=${storeId} tenant=${tenantId}: ${projectDocs.length} project(s) -> ${projectIds}`);
        if (write) {
            const batch = db.batch();
            batch.set(summaryRef, payload, { merge: true });
            if (latestPublishedAt) {
                batch.set(storeDoc.ref, {
                    lastPublishedAt: latestPublishedAt,
                }, { merge: true });
            }
            await batch.commit();
            writtenStores += 1;
        }
    }

    console.log(JSON.stringify({
        ok: true,
        write,
        scannedStores,
        candidateStores,
        writtenStores,
        skippedNoProjects,
        skippedExistingSummary,
        skippedInactiveOrBlocked,
    }, null, 2));
}

main().catch((error) => {
    const message = error instanceof Error ? error.message.slice(0, 240) : 'Public-routing summary backfill failed.';
    console.error('public_routing_summary_backfill_failed', message);
    process.exit(1);
});
