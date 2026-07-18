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
 *   FIREBASE_PROJECT_ID=menulist-qa npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-public-routing-project-summaries.ts
 *   FIREBASE_PROJECT_ID=menulist-qa npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-public-routing-project-summaries.ts --store-id 17 --write
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { buildSummaryProjectsBatchPayload } from '../src/lib/firestore/summaryProjectsWriter';

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    admin.initializeApp(projectId ? { projectId } : undefined);
}

const db = admin.firestore();
const args = process.argv.slice(2);

const RESERVED_PROJECT_SLUGS = [
    'info',
    'about',
    'contact',
    'reviews',
    'photos',
    'gallery',
    'offers',
    'updates',
    'order',
    'book',
    'events',
    'jobs',
    'careers',
    'screen',
    'feedback',
    'admin',
    'api',
    'settings',
    'dashboard',
    'login',
    'signup',
    'auth',
    'webhook',
    'health',
    'status',
    'sitemap',
    'robots',
    'manifest',
    'sw',
    '_next',
    'client',
    'customerapp',
    'pwa',
    'campaigncue',
];

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    if (index === -1) return null;
    return args[index + 1] || null;
}

function slugify(value: unknown): string {
    return String(value || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
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

function normalizeTimestamp(value: unknown): FirebaseFirestore.Timestamp | null {
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
        return admin.firestore.Timestamp.fromMillis(millis);
    } catch {
        return null;
    }
}

function makeSlug(projectId: string, data: Record<string, any>): string {
    const existing = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
    if (existing) return existing;

    let slug = slugify(resolveText(data.name, projectId.includes('-default-') ? 'menu' : projectId));
    if (!slug) slug = slugify(projectId) || 'menu';
    if (RESERVED_PROJECT_SLUGS.includes(slug)) slug = `${slug}-menu`;
    return slug;
}

function buildSummary(projectId: string, data: Record<string, any>, markDefault: boolean): Record<string, any> {
    const name = data.name || { en: projectId.includes('-default-') ? 'Menu' : resolveText(data.name, 'Menu') };
    const description = data.description;
    const specialMenu = data._specialMenu && typeof data._specialMenu === 'object' ? data._specialMenu : null;
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
        slug: makeSlug(projectId, data),
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

function isBlocked(value: Record<string, any>): boolean {
    return value.blocked === true || value.tenantBlocked === true || value.blockDetails?.blocked === true;
}

async function loadStores() {
    const storeId = getArg('--store-id');
    if (storeId) {
        const snap = await db.collection('stores').doc(String(storeId)).get();
        return snap.exists ? [snap] : [];
    }
    let query: FirebaseFirestore.Query = db.collection('stores');
    const tenantId = getArg('--tenant-id');
    if (tenantId) query = query.where('tenantId', '==', Number(tenantId));
    const limit = getArg('--limit');
    if (limit) query = query.limit(Number(limit));
    const snapshot = await query.get();
    return snapshot.docs;
}

async function main() {
    const write = hasFlag('--write');
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
        const summaries: Record<string, Record<string, any>> = {};
        let latestPublishedAt: FirebaseFirestore.Timestamp | null = null;
        for (const projectDoc of projectDocs) {
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
    console.error(error);
    process.exit(1);
});
