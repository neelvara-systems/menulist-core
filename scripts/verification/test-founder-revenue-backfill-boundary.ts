import assert from 'node:assert/strict';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  main,
  movementFromSubscription,
  movementFromTopup,
  movementsFromPaymentTransaction,
  readSourceDocuments,
  shouldReplaceFirstPayment,
  shouldReplaceLatestMovement,
  toBackfillDate,
} from '../backfill-founder-revenue-read-model';

function document(id: string, data: Record<string, unknown>): QueryDocumentSnapshot {
  return {
    data: () => data,
    id,
    ref: { path: `fixtures/${id}` },
  } as unknown as QueryDocumentSnapshot;
}

function query(documents: QueryDocumentSnapshot[]): Query {
  let limit = documents.length;
  let startIndex = 0;
  const value = {
    get: async () => {
      const docs = documents.slice(startIndex, startIndex + limit);
      return { docs, size: docs.length };
    },
    limit: (nextLimit: number) => {
      limit = nextLimit;
      return value;
    },
    orderBy: () => value,
    startAfter: (cursor: QueryDocumentSnapshot) => {
      startIndex = documents.findIndex((candidate) => candidate.id === cursor.id) + 1;
      return value;
    },
  };
  return value as unknown as Query;
}

const scope = {
  pId: 'ML',
  productId: 'ML',
  sId: 22,
  storeId: 22,
  tId: 11,
  tenantId: 11,
};
const occurredAt = new Date('2026-07-01T05:30:00.000Z');

assert.equal(toBackfillDate({ toDate: () => occurredAt })?.toISOString(), occurredAt.toISOString());
assert.equal(toBackfillDate({ toDate: () => '2026-07-01' }), null);
assert.equal(toBackfillDate({ toDate: () => { throw new Error('bad timestamp'); } }), null);
assert.equal(toBackfillDate('July 1, 2026'), null);
assert.equal(toBackfillDate('2026-07-01T05:30:00.000Z')?.toISOString(), occurredAt.toISOString());
assert.equal(shouldReplaceLatestMovement(
  { latestMovementAt: new Date('2026-07-02T05:30:00.000Z'), latestMovementId: 'later' },
  occurredAt,
  'earlier',
), false);
assert.equal(shouldReplaceLatestMovement(
  { latestMovementAt: new Date('2026-06-30T05:30:00.000Z'), latestMovementId: 'earlier' },
  occurredAt,
  'later',
), true);
assert.equal(shouldReplaceFirstPayment({ paymentAt: new Date('2026-06-30T05:30:00.000Z') }, occurredAt), false);
assert.equal(shouldReplaceFirstPayment({ paymentAt: new Date('2026-07-02T05:30:00.000Z') }, occurredAt), true);

const validTopup = movementFromTopup(document('topup-ok', {
  ...scope,
  amount: 12_000,
  currency: 'INR',
  paidAt: occurredAt,
  providerPaymentId: 'pay_ok',
  status: 'paid',
}));
assert.equal(validTopup?.amountPaise, 12_000);
assert.equal(validTopup?.occurredAt.toISOString(), occurredAt.toISOString());
assert.equal(validTopup?.storeId, 22);
assert.equal(validTopup?.tenantId, 11);

assert.equal(movementFromTopup(document('topup-string-amount', {
  ...scope,
  amount: '12000',
  currency: 'INR',
  paidAt: occurredAt,
  status: 'paid',
})), null);
assert.equal(movementFromTopup(document('topup-object-status', {
  ...scope,
  amount: 12_000,
  currency: 'INR',
  paidAt: occurredAt,
  status: { toString: () => 'paid' },
})), null);
assert.equal(movementFromTopup(document('topup-no-date', {
  ...scope,
  amount: 12_000,
  currency: 'INR',
  status: 'paid',
})), null);

const validSubscription = movementFromSubscription(document('subscription-ok', {
  ...scope,
  amount: 120_000,
  currency: 'INR',
  planType: 'YEAR',
  quantity: 2,
  status: 'active',
  subscriptionStartDate: occurredAt,
}));
assert.equal(validSubscription?.amountPaise, 20_000);
assert.equal(validSubscription?.kind, 'new_mrr');

assert.equal(movementFromSubscription(document('subscription-array-quantity', {
  ...scope,
  amount: 120_000,
  currency: 'INR',
  planType: 'YEAR',
  quantity: [2],
  status: 'active',
  subscriptionStartDate: occurredAt,
})), null);
assert.equal(movementFromSubscription(document('subscription-no-date', {
  ...scope,
  amount: 120_000,
  currency: 'INR',
  status: 'active',
})), null);

assert.equal(movementsFromPaymentTransaction(document('payment-string-amount', {
  ...scope,
  amount: '12000',
  createdAt: occurredAt,
  currency: 'INR',
  event: 'order.paid',
})).length, 0);
assert.equal(movementsFromPaymentTransaction(document('payment-no-date', {
  ...scope,
  amount: 12_000,
  currency: 'INR',
  event: 'order.paid',
})).length, 0);
assert.equal(movementsFromPaymentTransaction(document('payment-bad-refund', {
  ...scope,
  amount: 12_000,
  amountRefunded: '5000',
  createdAt: occurredAt,
  currency: 'INR',
  event: 'payment.refunded',
})).length, 0);

async function run(): Promise<void> {
  const sourceDocuments = [
    document('1', {}),
    document('2', {}),
    document('3', {}),
    document('4', {}),
    document('5', {}),
  ];
  assert.deepEqual(
    await readSourceDocuments(query(sourceDocuments), 2, false),
    { documents: sourceDocuments.slice(0, 2), truncated: true },
  );
  assert.deepEqual(
    await readSourceDocuments(query(sourceDocuments), 2, true),
    { documents: sourceDocuments, truncated: false },
  );

  await assert.rejects(
    main(['--project-id', 'answerlattice-qa']),
    /non-MenuList project/,
  );
  await assert.rejects(
    main(['--project-id', 'menulist-qa', '--limit', '2.5']),
    /integer between 1 and 10000/,
  );
  await assert.rejects(
    main(['--project-id', 'menulist-qa', '--write', '--all-founder-revenue']),
    /pass --confirm-project menulist-qa/,
  );
  await assert.rejects(
    main(['--project-id', 'menulist-qa', '--project-id', 'menulist']),
    /Duplicate option: --project-id/,
  );

  console.log('Founder revenue backfill boundary tests passed.');
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
