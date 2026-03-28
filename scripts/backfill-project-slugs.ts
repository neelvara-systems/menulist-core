/**
 * Migration Script: Backfill Project Slugs
 * 
 * One-time script to add `slug` field to all existing projects
 * in projectsSummary documents that don't already have one.
 * 
 * URL Routing Architecture — Phase 2
 * @see __docs__/url-routing-architecture/url-routing-architecture_impl.md
 * 
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/backfill-project-slugs.ts
 * 
 * Safety:
 * - Idempotent: skips projects that already have a slug
 * - Dry-run by default: set DRY_RUN=false to actually write
 * - Logs all changes for audit trail
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS or service account)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Reserved project slugs (must match src/constants/reservedSlugs.ts)
const RESERVED_PROJECT_SLUGS = [
    'menu', 'info', 'about', 'contact', 'reviews', 'photos', 'gallery',
    'offers', 'updates', 'order', 'book', 'events', 'jobs', 'careers',
    'screen', 'feedback', 'admin', 'api', 'settings', 'dashboard',
    'login', 'signup', 'auth', 'webhook', 'health', 'status',
    'sitemap', 'robots', 'manifest', 'sw', '_next', '_client',
];

function slugify(text: string): string {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isReserved(slug: string): boolean {
    return RESERVED_PROJECT_SLUGS.includes(slug.toLowerCase());
}

const DRY_RUN = process.env.DRY_RUN !== 'false';

async function backfillSlugs() {
    console.log(`\n=== Backfill Project Slugs ===`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (writing to Firestore)'}`);
    console.log('');

    // Get all platformSummary docs that match projects_* pattern
    const summaryCollection = db.collection('platformSummary');
    const allDocs = await summaryCollection.listDocuments();

    const projectsDocs = allDocs.filter(d => d.id.startsWith('projects_'));
    console.log(`Found ${projectsDocs.length} projectsSummary documents\n`);

    let totalProjects = 0;
    let updatedProjects = 0;
    let skippedProjects = 0;

    for (const docRef of projectsDocs) {
        const doc = await docRef.get();
        if (!doc.exists) continue;

        const data = doc.data();
        const projects = data?.projects;
        if (!projects || typeof projects !== 'object') continue;

        const updates: Record<string, any> = {};

        for (const [projectId, projectData] of Object.entries(projects)) {
            totalProjects++;
            const proj = projectData as any;

            // Skip if already has a slug
            if (proj.slug) {
                skippedProjects++;
                continue;
            }

            // Generate slug from name
            let slug = slugify(proj.name || 'untitled');
            if (isReserved(slug)) {
                slug = `${slug}-menu`;
            }

            if (!slug) {
                console.log(`  SKIP: ${projectId} — no valid slug from name "${proj.name}"`);
                skippedProjects++;
                continue;
            }

            updates[`projects.${projectId}.slug`] = slug;
            updatedProjects++;
            console.log(`  ${DRY_RUN ? '[DRY]' : '[WRITE]'} ${doc.id}/${projectId}: "${proj.name}" → slug="${slug}"`);
        }

        // Write updates if any
        if (Object.keys(updates).length > 0 && !DRY_RUN) {
            await docRef.update(updates);
            console.log(`  ✅ Updated ${Object.keys(updates).length} projects in ${doc.id}`);
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total projects scanned: ${totalProjects}`);
    console.log(`Projects updated: ${updatedProjects}`);
    console.log(`Projects skipped (already had slug): ${skippedProjects}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN — no changes written' : 'LIVE — changes written to Firestore'}`);

    if (DRY_RUN && updatedProjects > 0) {
        console.log(`\nTo apply changes, run with: DRY_RUN=false npx ts-node scripts/backfill-project-slugs.ts`);
    }
}

backfillSlugs()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
