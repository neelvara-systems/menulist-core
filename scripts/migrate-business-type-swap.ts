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
 *   - Dry run mode by default (set DRY_RUN=false to apply)
 * 
 * Usage:
 *   DRY_RUN=true npx tsx scripts/migrate-business-type-swap.ts
 *   DRY_RUN=false npx tsx scripts/migrate-business-type-swap.ts
 * 
 * @see __docs__/business-type-data-model/README.md
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default: true (safe)

// Known plan types that indicate the bug
const PLAN_TYPES = new Set(['B2C', 'B2B']);

/**
 * Get business category from business type value
 * Mirrors: src/constants/common.ts:getBusinessCategory()
 */
const BUSINESS_TYPE_TO_CATEGORY: Record<string, string> = {
    'restaurant': 'food',
    'cafe': 'food',
    'cake shop': 'food',
    'bakery': 'food',
    'coffee shop': 'food',
    'specialty coffee shop': 'food',
    'ice cream shop': 'food',
    'spa': 'service',
    'salon': 'service',
    'pet grooming service': 'service',
    'pet grooming salon': 'service',
    'pet grooming studio': 'service',
    'cleaning services company': 'service',
    'car wash & detailing service': 'service',
    'landscaping service': 'service',
    'landscaping company': 'service',
    'fashion boutique': 'retail',
    'jewelry store': 'retail',
    'bookstore': 'retail',
    'electronics store': 'retail',
    'furniture store': 'retail',
    'luxury watch dealer': 'retail',
    'craft supply store': 'retail',
    'music store': 'retail',
    'shoe store': 'retail',
    'aquarium store': 'retail',
    'florist shop': 'retail',
    'handmade crafts': 'retail',
    'etsy shop': 'retail',
    'fitness equipment seller': 'retail',
    'real estate agent': 'professional',
    'real estate agency': 'professional',
    'law firm': 'professional',
    'financial advisor': 'professional',
    'wedding planner': 'professional',
    'event planning company': 'professional',
    'interior designer': 'professional',
    'life coach': 'professional',
    'personal development': 'professional',
    'travel agency': 'professional',
    'home renovation contractor': 'professional',
    'photography studio': 'creative',
    'photography tour operator': 'creative',
    'tattoo studio': 'creative',
    'art gallery': 'creative',
    'music school': 'creative',
    'makeup studio': 'creative',
    'handmade jewelry brand': 'creative',
    'furniture maker': 'creative',
    'florist': 'creative',
    'event decorator': 'creative',
    'tailoring shop': 'creative',
    'dental clinic': 'health',
    'yoga studio': 'health',
    'fitness bootcamp': 'health',
    'gym': 'health',
    'fitness center': 'health',
    'personal trainer': 'health',
    'spa resort': 'health',
    'martial arts academy': 'health',
    'veterinary clinic': 'health',
    'car dealership': 'specialty',
    'auto repair shop': 'specialty',
    '3d printing studio': 'specialty',
    'drone services company': 'specialty',
    'boutique hotel': 'specialty',
    "children's daycare": 'specialty',
    'daycare center': 'specialty',
    'coworking space': 'specialty',
    'bike rental shop': 'specialty',
};

function getBusinessCategory(businessType: string): string {
    return BUSINESS_TYPE_TO_CATEGORY[businessType.toLowerCase()] || 'specialty';
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

async function migrateCollection(collectionName: string): Promise<MigrationResult> {
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

    const batchSize = 400; // Firestore limit is 500, leave margin
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

                    if (batchCount >= batchSize) {
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
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  MIGRATION: Swap businessType ↔ businessIndustry');
    console.log(`  MODE: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '⚡ LIVE (writing to Firestore)'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Migrate stores
    console.log('📦 Migrating stores collection...');
    const storesResult = await migrateCollection('stores');
    printResult(storesResult);

    // Migrate tenants
    console.log('\n📦 Migrating tenants collection...');
    const tenantsResult = await migrateCollection('tenants');
    printResult(tenantsResult);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Stores:  ${storesResult.swapped} swapped, ${storesResult.alreadyCorrect} already correct, ${storesResult.skipped} skipped`);
    console.log(`  Tenants: ${tenantsResult.swapped} swapped, ${tenantsResult.alreadyCorrect} already correct, ${tenantsResult.skipped} skipped`);
    console.log(`  Mode:    ${DRY_RUN ? 'DRY RUN — no changes made' : 'LIVE — changes committed'}`);

    if (DRY_RUN) {
        console.log('\n  ⚠️  To apply changes, run with: DRY_RUN=false');
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
