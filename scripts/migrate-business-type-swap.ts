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

import * as admin from 'firebase-admin';
import { getBusinessCategory as getBusinessCategoryFromSharedData } from '../src/data/shared/businessTypes';

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
    if (!admin.apps.length) {
        admin.initializeApp({ projectId });
    }
    return admin.firestore();
}

// Known plan types that indicate the bug
const PLAN_TYPES = new Set(['B2C', 'B2B']);

function getBusinessCategory(businessType: string): string {
    return getBusinessCategoryFromSharedData(businessType) || 'specialty';
}

interface MigrationResult {
    collection: string;
    total: number;
    swapped: number;
    skipped: number;
    alreadyCorrect: number;
    errors: number;
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
        details: [],
    };

    const snapshot = await db.collection(collectionName).get();
    result.total = snapshot.size;

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const currentBusinessType = data.businessType || '';
        const currentBusinessIndustry = data.businessIndustry || '';

        // Case 1: businessType is 'B2C' or 'B2B' — THIS IS THE BUG
        if (PLAN_TYPES.has(currentBusinessType)) {
            // And businessIndustry has an actual type
            if (currentBusinessIndustry && !PLAN_TYPES.has(currentBusinessIndustry)) {
                const newBusinessType = currentBusinessIndustry;
                const newBusinessIndustry = currentBusinessType;
                const newBusinessCategory = getBusinessCategory(newBusinessType);

                result.details.push({
                    docId: doc.id,
                    action: 'SWAP',
                    before: {
                        businessType: currentBusinessType,
                        businessIndustry: currentBusinessIndustry,
                        businessCategory: data.businessCategory,
                    },
                    after: {
                        businessType: newBusinessType,
                        businessIndustry: newBusinessIndustry,
                        businessCategory: newBusinessCategory,
                    },
                });

                if (!DRY_RUN) {
                    batch.update(doc.ref, {
                        businessType: newBusinessType,
                        businessIndustry: newBusinessIndustry,
                        businessCategory: newBusinessCategory,
                    });
                    batchCount++;

                    if (batchCount >= WRITE_BATCH_LIMIT) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                    }
                }

                result.swapped++;
            } else {
                // businessType is B2C/B2B but businessIndustry is empty or also B2C/B2B
                // Can't determine actual type — skip
                result.details.push({
                    docId: doc.id,
                    action: 'SKIP_NO_ACTUAL_TYPE',
                    before: {
                        businessType: currentBusinessType,
                        businessIndustry: currentBusinessIndustry,
                    },
                });
                result.skipped++;
            }
        } else if (!PLAN_TYPES.has(currentBusinessType) && currentBusinessType) {
            // businessType is already an actual type (owner corrected, or new store)
            result.details.push({
                docId: doc.id,
                action: 'ALREADY_CORRECT',
                before: {
                    businessType: currentBusinessType,
                    businessIndustry: currentBusinessIndustry,
                    businessCategory: data.businessCategory,
                },
            });
            result.alreadyCorrect++;
        } else {
            result.details.push({
                docId: doc.id,
                action: 'SKIP_EMPTY',
                before: {
                    businessType: currentBusinessType,
                    businessIndustry: currentBusinessIndustry,
                },
            });
            result.skipped++;
        }
    }

    // Commit remaining batch
    if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
    }

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

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
