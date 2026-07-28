import assert from 'node:assert/strict';
import {
    buildFounderMonitorScopeKey,
    parseFounderMonitorSupportTicketScope,
    parseFounderOnboardingTransitionScope,
} from '../../functions/src/schedulers/founderMonitorScopeBoundary';

assert.deepEqual(
    parseFounderMonitorSupportTicketScope({
        pId: 'AL',
        productId: 'AL',
        tId: 10,
        tenantId: '10',
        sId: 20,
        storeId: '20',
    }),
    { tenantId: '10', storeId: '20' },
);
assert.equal(parseFounderMonitorSupportTicketScope({ pId: 'ML', tId: 10, sId: 20 }), null);
assert.equal(parseFounderMonitorSupportTicketScope({ pId: 'AL', productId: 'ML', tId: 10, sId: 20 }), null);
assert.equal(parseFounderMonitorSupportTicketScope({ pId: 'AL', tId: 10, tenantId: 11, sId: 20 }), null);
assert.equal(parseFounderMonitorSupportTicketScope({ pId: 'AL', tId: 10, sId: 20, storeId: 21 }), null);
assert.equal(parseFounderMonitorSupportTicketScope({ tId: 10, sId: 20 }), null);

assert.deepEqual(
    parseFounderOnboardingTransitionScope('20', {
        storeId: 20,
        sId: '20',
        tenantId: 10,
        tId: '10',
    }),
    { storeId: '20', tenantId: '10' },
);
assert.deepEqual(
    parseFounderOnboardingTransitionScope('20', {}),
    { storeId: '20', tenantId: null },
);
assert.equal(parseFounderOnboardingTransitionScope('20', { storeId: 21 }), null);
assert.equal(parseFounderOnboardingTransitionScope('20', { tenantId: 10, tId: 11 }), null);
assert.equal(parseFounderOnboardingTransitionScope('020', {}), null);
assert.equal(
    buildFounderMonitorScopeKey({ tenantId: '10', storeId: '20' }),
    '10:20',
);

console.log('Founder Monitor scope boundary tests passed.');
