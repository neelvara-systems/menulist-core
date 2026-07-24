/**
 * Completes exact MenuList ownership aliases on safely classifiable legacy
 * payment_transactions or subscriptions rows. Dry-run is the default. Write
 * mode is restricted to MenuList projects and requires explicit project,
 * collection and collection-wide acknowledgement.
 *
 * Usage:
 *   npm run backfill:billing-record-product-identity -- --project-id menulist-qa --collection subscriptions
 *   npm run backfill:billing-record-product-identity -- --project-id menulist-qa --collection subscriptions --write --confirm-project menulist-qa --all-billing-records
 */
import * as admin from 'firebase-admin';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../src/constants/database';
import { classifyMenuListBillingRecordIdentityBackfill } from '../src/lib/billing/billingRecordProductIdentity';

const args = process.argv.slice(2);
const ALLOWED_PROJECTS = new Set(['menulist', 'menulist-qa']);
const ALLOWED_COLLECTIONS = new Set<string>([
    DB_COLLECTIONS.PAYMENT_TRANSACTIONS,
    DB_COLLECTIONS.SUBSCRIPTIONS,
]);
const PAGE_SIZE = 400;
const SOURCE = 'scripts/backfill-billing-record-product-identity';

const hasFlag = (name: string): boolean => args.includes(name);
const getArg = (name: string): string | null => {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
};

async function main(): Promise<void> {
    const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID || '';
    if (!ALLOWED_PROJECTS.has(projectId)) {
        throw new Error('Billing record identity backfill requires --project-id menulist-qa or menulist.');
    }
    const collectionName = getArg('--collection') || '';
    if (!ALLOWED_COLLECTIONS.has(collectionName)) {
        throw new Error('Pass --collection payment_transactions or subscriptions.');
    }

    const write = hasFlag('--write');
    if (write && getArg('--confirm-project') !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId} to confirm the target Firebase project.`);
    }
    if (write && !hasFlag('--all-billing-records')) {
        throw new Error('Refusing write: pass --all-billing-records after reviewing dry-run output and backup state.');
    }

    admin.initializeApp({ projectId });
    const db = admin.firestore();
    const collection = db.collection(collectionName);
    const stats: Record<string, number> = {
        scanned: 0,
        candidate: 0,
        updated: 0,
        already_exact: 0,
        skip_conflicting_or_other_product: 0,
        skip_unclassified_product: 0,
        skip_invalid_scope: 0,
    };
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    do {
        let pageQuery: FirebaseFirestore.Query = collection
            .orderBy(FieldPath.documentId())
            .limit(PAGE_SIZE);
        if (cursor) pageQuery = pageQuery.startAfter(cursor);
        const page = await pageQuery.get();
        if (page.empty) break;

        let batch = db.batch();
        let batchWrites = 0;
        for (const snapshot of page.docs) {
            stats.scanned += 1;
            const decision = classifyMenuListBillingRecordIdentityBackfill(snapshot.data() || {});
            stats[decision.status] += 1;
            if (decision.status !== 'candidate') continue;
            if (!write) continue;

            batch.update(snapshot.ref, {
                ...decision.update,
                productIdentityBackfillSource: SOURCE,
                productIdentityBackfilledAt: FieldValue.serverTimestamp(),
            });
            batchWrites += 1;
            if (batchWrites === PAGE_SIZE) {
                await batch.commit();
                stats.updated += batchWrites;
                batch = db.batch();
                batchWrites = 0;
            }
        }
        if (write && batchWrites > 0) {
            await batch.commit();
            stats.updated += batchWrites;
        }
        cursor = page.docs[page.docs.length - 1] || null;
        if (page.size < PAGE_SIZE) break;
    } while (cursor);

    process.stdout.write(`${JSON.stringify({ projectId, collection: collectionName, mode: write ? 'WRITE' : 'DRY RUN', ...stats }, null, 2)}\n`);
    if (!write) {
        process.stdout.write(`To apply after backup/review: --write --confirm-project ${projectId} --all-billing-records\n`);
    }
}

void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'billing_record_identity_backfill_failed'}\n`);
    process.exitCode = 1;
});
