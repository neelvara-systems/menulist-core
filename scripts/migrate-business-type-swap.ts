/**
 * ONE-TIME MIGRATION: Swap businessType ↔ businessIndustry values
 * 
 * Problem: During onboarding, `userType` ('B2C'/'B2B') was stored as `store.businessType`,
 * and the actual business type (e.g., 'Restaurant') was stored as `store.businessIndustry`.
 * The field names are semantically swapped from their intended meaning.
 * 
 * Fix: Swap the values so:
 *   - store.businessType = actual type (e.g., 'Restaurant', 'Salon')
 *   - store.businessIndustry = plan type ('B2C' or 'B2B')
 *   - store.businessCategory = correctly derived from actual businessType
 * 
 * Safety:
 *   - Only swaps if businessType is exactly 'B2C' or 'B2B'
 *   - Only swaps if businessIndustry has an actual type (not 'B2C'/'B2B')
 *   - Skips stores where owner already corrected businessType via Settings
 *   - Dry run mode by default; pass `--write` to apply
 *   - Live mode requires explicit project and broad-scope confirmation
 * 
 * Usage:
 *   npx tsx scripts/migrate-business-type-swap.ts --project-id menulist-qa
 *   npx tsx scripts/migrate-business-type-swap.ts --project-id menulist-qa --write --confirm-project menulist-qa --all-stores-and-tenants
 * 
 * @see __docs__/business-type-data-model/README.md
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { getBusinessCategory as getBusinessCategoryFromSharedData } from '../src/data/shared/businessTypes';
import { parsePlatformStoreSummary } from '../src/data/shared/storeSummaryBoundary';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--write');
const WRITE_BATCH_LIMIT = 400;

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    if (index === -1) return null;
    return args[index + 1] || null;
}

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getRequiredProjectId(): string {
    const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running business-type migration.');
    }
    return projectId;
}

function initializeFirestore(projectId: string): FirebaseFirestore.Firestore {
    if (!getApps().length) initializeApp({ projectId });
    return getFirestore();
}

// Known plan types that indicate the bug
const PLAN_TYPES = new Set(['B2C', 'B2B']);

function getBusinessCategory(businessType: string): string {
    return getBusinessCategoryFromSharedData(businessType) || 'specialty';
}

type BusinessTypeSwap = {
    businessType: string;
    businessIndustry: 'B2C' | 'B2B';
    businessCategory: string;
};

function normalizeBusinessClassification(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function buildBusinessTypeSwap(data: unknown): BusinessTypeSwap | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const source = data as Record<string, unknown>;
    const currentBusinessType = normalizeBusinessClassification(source.businessType);
    const currentBusinessIndustry = normalizeBusinessClassification(source.businessIndustry);
    if (
        !PLAN_TYPES.has(currentBusinessType)
        || !currentBusinessIndustry
        || PLAN_TYPES.has(currentBusinessIndustry)
    ) return null;

    return {
        businessType: currentBusinessIndustry,
        businessIndustry: currentBusinessType as 'B2C' | 'B2B',
        businessCategory: getBusinessCategory(currentBusinessIndustry),
    };
}

interface MigrationResult {
    collection: string;
    total: number;
    swapped: number;
    skipped: number;
    alreadyCorrect: number;
    errors: number;
    summarySynced: number;
    summaryMissing: number;
    details: Array<{
        docId: string;
        action: string;
        before: { businessType: string; businessIndustry: string; businessCategory?: string };
        after?: { businessType: string; businessIndustry: string; businessCategory: string };
    }>;
}

async function migrateCollection(db: FirebaseFirestore.Firestore, collectionName: string): Promise<MigrationResult> {
    const result: MigrationResult = {
        collection: collectionName,
        total: 0,
        swapped: 0,
        skipped: 0,
        alreadyCorrect: 0,
        errors: 0,
        summarySynced: 0,
        summaryMissing: 0,
        details: [],
    };

    const storesSummaryRef = collectionName === 'stores'
        ? db.collection('platformSummary').doc('storesSummary')
        : null;
    const storesSummarySnapshot = storesSummaryRef ? await storesSummaryRef.get() : null;
    const storesSummary = parsePlatformStoreSummary(
        storesSummarySnapshot?.exists ? storesSummarySnapshot.data() : undefined,
    );
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    do {
        let query: FirebaseFirestore.Query = db.collection(collectionName)
            .orderBy(FieldPath.documentId())
            .limit(WRITE_BATCH_LIMIT);
        if (cursor) query = query.startAfter(cursor);
        const snapshot = await query.get();
        if (snapshot.empty) break;
        result.total += snapshot.size;
        const batch = db.batch();
        let batchCount = 0;
        const summaryPatch: Record<string, Record<string, unknown>> = Object.create(null);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const currentBusinessType = normalizeBusinessClassification(data.businessType);
            const currentBusinessIndustry = normalizeBusinessClassification(data.businessIndustry);
            const swap = buildBusinessTypeSwap(data);

            // Case 1: businessType is 'B2C' or 'B2B' — THIS IS THE BUG
            if (PLAN_TYPES.has(currentBusinessType)) {
            // And businessIndustry has an actual type
                if (swap) {

                    if (result.details.length < 5) {
                        result.details.push({
                            docId: doc.id,
                            action: 'SWAP',
                            before: {
                                businessType: currentBusinessType,
                                businessIndustry: currentBusinessIndustry,
                                businessCategory: normalizeBusinessClassification(data.businessCategory) || undefined,
                            },
                            after: swap,
                        });
                    }

                    if (!DRY_RUN) {
                        batch.update(doc.ref, swap);
                        batchCount++;
                    }
                    if (storesSummaryRef) {
                        const existingSummary = storesSummary[doc.id];
                        if (existingSummary) {
                            summaryPatch[doc.id] = {
                                ...existingSummary,
                                businessType: swap.businessType,
                                businessCategory: swap.businessCategory,
                            };
                            storesSummary[doc.id] = {
                                ...existingSummary,
                                businessType: swap.businessType,
                                businessCategory: swap.businessCategory,
                            };
                            result.summarySynced++;
                        } else {
                            result.summaryMissing++;
                        }
                    }

                    result.swapped++;
                } else {
                // businessType is B2C/B2B but businessIndustry is empty or also B2C/B2B
                // Can't determine actual type — skip
                    result.skipped++;
                }
            } else if (currentBusinessType) {
            // businessType is already an actual type (owner corrected, or new store)
                result.alreadyCorrect++;
            } else {
                result.skipped++;
            }
        }

        if (!DRY_RUN && batchCount > 0) {
            if (storesSummaryRef && Object.keys(summaryPatch).length > 0) {
                batch.set(storesSummaryRef, {
                    stores: summaryPatch,
                }, { merge: true });
            }
            await batch.commit();
        }
        cursor = snapshot.docs.length === WRITE_BATCH_LIMIT
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;
    } while (cursor);

    return result;
}

async function main() {
    const projectId = getRequiredProjectId();
    if (!DRY_RUN) {
        const confirmedProjectId = getArg('--confirm-project');
        if (confirmedProjectId !== projectId) {
            throw new Error(`Refusing write: pass --confirm-project ${projectId} to confirm the target Firebase project.`);
        }
        if (!hasFlag('--all-stores-and-tenants')) {
            throw new Error('Refusing write: pass --all-stores-and-tenants after reviewing dry-run output and Firestore backup state.');
        }
    }

    const db = initializeFirestore(projectId);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  MIGRATION: Swap businessType ↔ businessIndustry');
    console.log(`  PROJECT: ${projectId}`);
    console.log(`  MODE: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (writing to Firestore)'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Migrate stores
    console.log('📦 Migrating stores collection...');
    const storesResult = await migrateCollection(db, 'stores');
    printResult(storesResult);

    // Migrate tenants
    console.log('\n📦 Migrating tenants collection...');
    const tenantsResult = await migrateCollection(db, 'tenants');
    printResult(tenantsResult);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Stores:  ${storesResult.swapped} swapped, ${storesResult.alreadyCorrect} already correct, ${storesResult.skipped} skipped`);
    console.log(`  Tenants: ${tenantsResult.swapped} swapped, ${tenantsResult.alreadyCorrect} already correct, ${tenantsResult.skipped} skipped`);
    console.log(`  Mode:    ${DRY_RUN ? 'DRY RUN — no changes made' : 'LIVE — changes committed'}`);

    if (DRY_RUN) {
        console.log(`\n  To apply changes, rerun with: --write --confirm-project ${projectId} --all-stores-and-tenants`);
    }
}

function printResult(result: MigrationResult) {
    console.log(`  Total: ${result.total} | Swapped: ${result.swapped} | Already correct: ${result.alreadyCorrect} | Skipped: ${result.skipped}`);
    if (result.collection === 'stores') {
        console.log(`  Store summaries synced: ${result.summarySynced} | Missing summary entries: ${result.summaryMissing}`);
    }

    // Print first few swap details
    const swaps = result.details.filter(d => d.action === 'SWAP');
    if (swaps.length > 0) {
        console.log(`  Swap details (first 5):`);
        swaps.slice(0, 5).forEach(d => {
            console.log(`    ${d.docId}: "${d.before.businessType}" → "${d.after?.businessType}" (category: ${d.after?.businessCategory})`);
        });
        if (swaps.length > 5) {
            console.log(`    ... and ${swaps.length - 5} more`);
        }
    }
}

if (require.main === module) {
    main().catch((error) => {
        const message = error instanceof Error ? error.message.slice(0, 240) : 'Business-type migration failed.';
        console.error('business_type_swap_migration_failed', message);
        process.exitCode = 1;
    });
}
