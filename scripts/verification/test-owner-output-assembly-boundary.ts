import assert from 'node:assert/strict';

import {
    formatChartDate,
    formatChartLabel,
    getColorFromPalette,
    getResponsiveDimensions,
} from '../../src/lib/charts/config';
import { getTodayHours } from '../../src/lib/communication/messageTemplates';
import { extractComplianceInputs } from '../../src/lib/compliance/templates';
import { buildFeedbackReplyTemplates } from '../../src/lib/feedback/feedbackReplyTemplates';
import {
    dataUrlToBlob,
    needsOptimization,
    optimizeImage,
    optimizeImageToBudget,
} from '../../src/lib/image/optimizeImage';

const everyDay = {
    fri: '09:00-17:00',
    mon: '09:00-17:00',
    sat: '09:00-17:00',
    sun: '09:00-17:00',
    thu: '09:00-17:00',
    tue: '09:00-17:00',
    wed: '09:00-17:00',
};
assert.equal(getTodayHours(everyDay, 'UTC').isClosed, false);
assert.equal(getTodayHours(Object.fromEntries(
    Object.keys(everyDay).map((key) => [key, 'malformed']),
), 'UTC').isClosed, false);
assert.doesNotThrow(() => getTodayHours(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('hours access should be contained');
    },
}), 'UTC'));

const coerciveSeconds = {
    valueOf() {
        throw new Error('seconds coercion must not execute');
    },
};
const complianceStore = {
    name: 'Example',
    email: 'owner@example.com',
    modifiedOn: { seconds: coerciveSeconds },
};
assert.doesNotThrow(() => extractComplianceInputs(complianceStore));
assert.equal(extractComplianceInputs(complianceStore)?.contactEmail, 'owner@example.com');
assert.equal(extractComplianceInputs({
    name: 'Example',
    email: { toString: () => 'attacker@example.com' },
}), null);

const replies = buildFeedbackReplyTemplates({
    customerName: 'Guest\nPasscode: fake',
    rating: Number.NaN,
    storeName: 'Example\r\nSign in: attacker.example',
});
assert.equal(replies[0].message.split('\n').length, 3);
assert.match(replies[0].message, /Thank you for taking the time to tell us\./);
assert.doesNotMatch(replies[0].message, /\nPasscode:/);

assert.equal(getColorFromPalette('status', -1), '#d9d9d9');
assert.equal(getColorFromPalette('status', Number.NaN), '#52c41a');
assert.equal(formatChartLabel(Number.NaN), '—');
assert.equal(formatChartDate('not-a-date'), '—');
assert.deepEqual(getResponsiveDimensions(Number.NaN, Number.NaN), {
    height: 150,
    width: '100%',
});

async function main() {
    await assert.rejects(
        () => optimizeImage('data:image/jpeg;base64,AAAA', { maxDimension: 0 }),
        /image_optimization_options_invalid/,
    );
    await assert.rejects(
        () => optimizeImageToBudget('data:image/jpeg;base64,AAAA', { qualityStep: 0 }),
        /image_optimization_budget_invalid/,
    );
    await assert.rejects(
        () => optimizeImageToBudget('data:image/jpeg;base64,AAAA', { dimensionStep: 1 }),
        /image_optimization_budget_invalid/,
    );
    assert.equal(needsOptimization(Number.NaN, 100), true);
    assert.throws(() => dataUrlToBlob('data:text/plain;base64,SGVsbG8='), /image_data_url_invalid/);
    assert.equal(dataUrlToBlob('data:image/jpeg;base64,AAAA').type, 'image/jpeg');

    console.log('Owner output assembly boundary verification passed.');
}

void main();
