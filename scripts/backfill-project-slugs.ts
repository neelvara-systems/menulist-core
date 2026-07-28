/**
 * Backfill missing project slugs in platformSummary/projects_{storeId}.
 *
 * Dry-run is the default. Write mode requires an exact Firebase project,
 * matching confirmation, and either one store or an explicit all-stores flag.
 *
 * Usage:
 *   npx tsx scripts/backfill-project-slugs.ts --project-id menulist-qa --store-id 42
 *   npx tsx scripts/backfill-project-slugs.ts --project-id menulist-qa --store-id 42 --write --confirm-project menulist-qa
 *   npx tsx scripts/backfill-project-slugs.ts --project-id menulist-qa --all-stores --write --confirm-project menulist-qa
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const PROJECT_SUMMARY_PREFIX = 'projects_';
const PROJECT_SLUG_MAX_LENGTH = 80;
const SAFE_SUMMARY_SEGMENT = /^(?!__proto__$|constructor$|prototype$).+$/;

// Standalone copy of the active project namespace in
// src/constants/reservedSlugs.ts. The regression gate below keeps it aligned.
const RESERVED_PROJECT_SLUGS = new Set([
    'info', 'about', 'contact', 'reviews', 'photos', 'gallery',
    'offers', 'updates', 'order', 'book', 'events', 'jobs', 'careers',
    'screen', 'feedback', 'admin', 'api', 'settings', 'dashboard',
    'login', 'signup', 'auth', 'webhook', 'health', 'status',
    'sitemap', 'robots', 'manifest', 'sw', '_next', 'client',
    'customerapp', 'pwa', 'campaigncue',
]);

export function isReservedProjectBackfillSlug(value: string): boolean {
    return RESERVED_PROJECT_SLUGS.has(value.trim().toLowerCase());
}

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function getRequiredProjectId(): string {
    const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running the project-slug backfill.');
    }
    return projectId;
}

export function slugifyProjectBackfillValue(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, PROJECT_SLUG_MAX_LENGTH);
}

function resolveProjectName(value: unknown): string {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const localized = value as Record<string, unknown>;
    for (const candidate of [localized.en, localized.en_US, localized.default, ...Object.values(localized)]) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    return '';
}

export function deriveProjectBackfillBaseSlug(projectId: string, project: Record<string, unknown>): string {
    let slug = slugifyProjectBackfillValue(resolveProjectName(project.name))
        || slugifyProjectBackfillValue(projectId)
        || 'menu';
    if (isReservedProjectBackfillSlug(slug)) slug = `${slug}-menu`;
    return slug.slice(0, PROJECT_SLUG_MAX_LENGTH);
}

export function allocateProjectBackfillSlug(baseSlug: string, projectId: string, claimed: Set<string>): string {
    if (!claimed.has(baseSlug)) return baseSlug;
    const suffix = slugifyProjectBackfillValue(projectId).slice(-24) || 'copy';
    const suffixLength = suffix.length + 1;
    const base = baseSlug.slice(0, PROJECT_SLUG_MAX_LENGTH - suffixLength).replace(/-+$/g, '') || 'menu';
    const first = `${base}-${suffix}`;
    if (!claimed.has(first)) return first;

    for (let attempt = 2; attempt <= 100; attempt += 1) {
        const attemptSuffix = `-${suffix}-${attempt}`;
        const candidate = `${baseSlug.slice(0, PROJECT_SLUG_MAX_LENGTH - attemptSuffix.length).replace(/-+$/g, '') || 'menu'}${attemptSuffix}`;
        if (!claimed.has(candidate)) return candidate;
    }
    throw new Error(`Unable to allocate a unique slug for project ${projectId}.`);
}

export function projectBackfillSummaryMap(value: unknown): Record<string, Record<string, unknown>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: Record<string, Record<string, unknown>> = Object.create(null);
    for (const [projectId, project] of Object.entries(value)) {
        if (
            !SAFE_SUMMARY_SEGMENT.test(projectId)
            || !project
            || typeof project !== 'object'
            || Array.isArray(project)
        ) continue;
        result[projectId] = project as Record<string, unknown>;
    }
    return result;
}

async function loadProjectSummaryRefs(
    db: FirebaseFirestore.Firestore,
): Promise<FirebaseFirestore.DocumentReference[]> {
    const storeId = getArg('--store-id');
    if (storeId) {
        if (!/^[1-9]\d*$/.test(storeId)) throw new Error('--store-id must be a positive numeric document ID.');
        return [db.collection('platformSummary').doc(`${PROJECT_SUMMARY_PREFIX}${storeId}`)];
    }
    return (await db.collection('platformSummary').listDocuments())
        .filter((ref) => ref.id.startsWith(PROJECT_SUMMARY_PREFIX));
}

async function run(): Promise<void> {
    const projectId = getRequiredProjectId();
    const write = hasFlag('--write');
    const storeId = getArg('--store-id');
    const allStores = hasFlag('--all-stores');
    if (storeId && allStores) throw new Error('Use either --store-id or --all-stores, not both.');
    if (!storeId && !allStores) throw new Error('Pass --store-id or --all-stores before running the project-slug backfill.');
    if (write && getArg('--confirm-project') !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId}.`);
    }

    if (!getApps().length) initializeApp({ projectId });
    const db = getFirestore();
    const refs = await loadProjectSummaryRefs(db);
    let scanned = 0;
    let missing = 0;
    let assigned = 0;

    console.log(`Project: ${projectId}`);
    console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);
    console.log(`Scope: ${storeId ? `store ${storeId}` : 'all project summaries'}`);

    for (const ref of refs) {
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            missing += 1;
            continue;
        }
        const projects = projectBackfillSummaryMap(snapshot.data()?.projects);
        const claimed = new Set(
            Object.values(projects)
                .map((project) => typeof project.slug === 'string' ? project.slug.trim().toLowerCase() : '')
                .filter(Boolean),
        );
        const updates: Array<[FieldPath, string]> = [];

        for (const [summaryProjectId, project] of Object.entries(projects)) {
            scanned += 1;
            if (typeof project.slug === 'string' && project.slug.trim()) continue;
            const slug = allocateProjectBackfillSlug(
                deriveProjectBackfillBaseSlug(summaryProjectId, project),
                summaryProjectId,
                claimed,
            );
            claimed.add(slug);
            assigned += 1;
            updates.push([new FieldPath('projects', summaryProjectId, 'slug'), slug]);
            console.log(`${write ? '[write]' : '[dry]'} ${ref.id}/${summaryProjectId}: slug="${slug}"`);
        }

        if (write && updates.length > 0) {
            const updateArguments: unknown[] = [];
            for (const [path, slug] of updates) updateArguments.push(path, slug);
            await ref.update(...updateArguments as [FieldPath, unknown, ...unknown[]]);
        }
    }

    console.log(JSON.stringify({
        ok: true,
        write,
        summaryDocuments: refs.length,
        missingSummaryDocuments: missing,
        projectsScanned: scanned,
        slugsAssigned: assigned,
    }, null, 2));
}

if (require.main === module) {
    run().catch((error) => {
        const message = error instanceof Error ? error.message.slice(0, 240) : 'Project-slug backfill failed.';
        console.error('project_slug_backfill_failed', message);
        process.exitCode = 1;
    });
}
