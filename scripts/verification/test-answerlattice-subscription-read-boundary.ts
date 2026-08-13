import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import {
    getAnswerlatticeSubscriptionTimestampMillis,
    isAnswerlatticeSubscriptionCurrent,
    projectActiveAnswerlatticeSubscriptionForRead,
    projectAnswerlatticeSubscriptionForRead,
} from '../../src/lib/answerlattice/subscriptionReadBoundary';

const scope = { tenantId: 7, storeId: 9 };
const baseSubscription = {
    pId: 'AL',
    productId: 'AL',
    tId: scope.tenantId,
    tenantId: scope.tenantId,
    sId: scope.storeId,
    storeId: scope.storeId,
    status: 'active',
    paymentProvider: 'razorpay',
    billingHistory: ['pay_Answerlattice123', 'pay_Answerlattice456'],
    planType: 'MONTH',
    currency: 'INR',
    amount: 1_200,
    quantity: 1,
    monthlyCreditsAllowance: 100,
    monthlyCredits: 80,
    topUpCredits: 20,
    totalPaymentsNeededCount: 12,
    totalPaymentsMadeCount: 2,
    planId: 'answerlattice_pro',
    planName: 'Answerlattice Pro',
    cycleEndDate: { seconds: 2_000_000_000, nanoseconds: 0 },
};

const projected = projectAnswerlatticeSubscriptionForRead(
    baseSubscription,
    'sub_Exact123',
    scope.tenantId,
    scope.storeId,
);
assert(projected);
assert.equal(projected.amount, 1_200);
assert.equal(projected.monthlyCredits, 80);
assert.equal(isAnswerlatticeSubscriptionCurrent(projected, 1_900_000_000_000), true);
assert.equal(isAnswerlatticeSubscriptionCurrent(projected, 2_100_000_000_000), false);

for (const [field, value] of [
    ['amount', '1200'],
    ['quantity', '1'],
    ['monthlyCreditsAllowance', '100'],
    ['monthlyCredits', '80'],
    ['topUpCredits', '20'],
    ['totalPaymentsMadeCount', '2'],
] as const) {
    assert.equal(
        projectAnswerlatticeSubscriptionForRead(
            { ...baseSubscription, [field]: value },
            'sub_Exact123',
            scope.tenantId,
            scope.storeId,
        ),
        null,
        `${field} must not use numeric coercion`,
    );
}

assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, cycleEndDate: { seconds: '2000000000', nanoseconds: 0 } },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'timestamp seconds must be exact numbers',
);
for (const field of ['cycleStartDate', 'renewsOn', 'subscriptionStartDate', 'pastDueSinceAt'] as const) {
    assert.equal(
        projectAnswerlatticeSubscriptionForRead(
            { ...baseSubscription, [field]: { seconds: '1700000000', nanoseconds: 0 } },
            'sub_Exact123',
            scope.tenantId,
            scope.storeId,
        ),
        null,
        `${field} must pass the same exact timestamp boundary`,
    );
}
assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        {
            ...baseSubscription,
            statuses: [{
                status: 'active',
                timestamp: { seconds: '1700000000', nanoseconds: 0 },
                amount: 1_200,
                currency: 'INR',
                remark: 'Activated',
            }],
        },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'malformed lifecycle history timestamps must not reach later append operations',
);
let paymentMethodAccessorRead = false;
const accessorBackedPaymentMethod = {};
Object.defineProperty(accessorBackedPaymentMethod, 'type', {
    enumerable: true,
    get() {
        paymentMethodAccessorRead = true;
        throw new Error('must not execute');
    },
});
assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, paymentMethod: accessorBackedPaymentMethod },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
);
assert.equal(paymentMethodAccessorRead, false, 'nested payment accessors must not execute');
assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, tenantId: 8 },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'conflicting persisted scope must fail closed',
);
assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, status: 'ACTIVE' },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'unknown status values must fail closed',
);
assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, totalPaymentsMadeCount: 13 },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'paid cycles cannot exceed required cycles',
);

let accessorRead = false;
const accessorBacked = { ...baseSubscription };
Object.defineProperty(accessorBacked, 'monthlyCredits', {
    enumerable: true,
    get() {
        accessorRead = true;
        throw new Error('must not execute');
    },
});
assert.equal(
    projectAnswerlatticeSubscriptionForRead(
        accessorBacked,
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
);
assert.equal(accessorRead, false, 'persisted accessors must not execute');

const firestoreTimestamp = Timestamp.fromMillis(1_700_000_000_123);
assert.equal(
    getAnswerlatticeSubscriptionTimestampMillis(firestoreTimestamp),
    1_700_000_000_123,
    'Firestore Timestamp instances must retain exact millisecond projection',
);
assert.equal(
    getAnswerlatticeSubscriptionTimestampMillis(AdminTimestamp.fromMillis(1_700_000_000_456)),
    1_700_000_000_456,
    'Admin Timestamp instances must retain exact millisecond projection',
);

const cancelledWithoutEnd = projectAnswerlatticeSubscriptionForRead(
    { ...baseSubscription, status: 'cancelled', cycleEndDate: null },
    'sub_Exact123',
    scope.tenantId,
    scope.storeId,
);
assert(cancelledWithoutEnd);
assert.equal(isAnswerlatticeSubscriptionCurrent(cancelledWithoutEnd), false);

const completed = projectAnswerlatticeSubscriptionForRead(
    { ...baseSubscription, status: 'completed' },
    'sub_Exact123',
    scope.tenantId,
    scope.storeId,
);
assert(completed, 'terminal subscriptions must remain available to exact direct-ID lifecycle readers');
assert.equal(isAnswerlatticeSubscriptionCurrent(completed), false);

assert.equal(
    projectActiveAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, billingHistory: [] },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'provider active without captured payment evidence cannot authorize paid work',
);

assert.equal(
    projectActiveAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, status: 'trialing' },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'unsupported case-folded or legacy status strings cannot authorize paid work',
);
assert.equal(
    projectActiveAnswerlatticeSubscriptionForRead(
        {
            ...baseSubscription,
            subscriptionEndDate: { seconds: 1_800_000_000, nanoseconds: 0 },
        },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
        1_900_000_000_000,
    ),
    null,
    'the earliest exact persisted end boundary must stop paid work',
);
assert.equal(
    projectActiveAnswerlatticeSubscriptionForRead(
        { ...baseSubscription, subscriptionEndDate: '2099-01-01T00:00:00.000Z' },
        'sub_Exact123',
        scope.tenantId,
        scope.storeId,
    ),
    null,
    'string dates cannot authorize paid work',
);

console.log('Answerlattice subscription read boundary passed.');
