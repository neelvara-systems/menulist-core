import {
    isExpectedCampaignCueProjectId,
    resolveCampaignCueFirebaseMode,
} from '@lib/firebase/campaigncueConfig';

const assert = (condition: unknown, message: string): void => {
    if (!condition) throw new Error(message);
};

assert(
    resolveCampaignCueFirebaseMode({
        defaultProjectId: 'menulist',
        nodeEnv: 'production',
        override: 'shared',
        productProjectId: 'campaigncue',
    }) === 'separate',
    'Production must reject an explicit shared CampaignCue Firebase override',
);
assert(
    resolveCampaignCueFirebaseMode({
        defaultProjectId: 'campaigncue-qa',
        nodeEnv: 'production',
        override: 'shared',
        productProjectId: 'campaigncue-qa',
    }) === 'separate',
    'Production must stay dedicated even when the default project happens to match',
);
assert(
    resolveCampaignCueFirebaseMode({
        defaultProjectId: 'menulist-qa',
        nodeEnv: 'development',
        override: 'shared',
        productProjectId: 'campaigncue-qa',
    }) === 'shared',
    'Explicit local shared-mode compatibility must remain available',
);
assert(
    resolveCampaignCueFirebaseMode({
        defaultProjectId: 'campaigncue-qa',
        nodeEnv: 'development',
        productProjectId: 'campaigncue-qa',
    }) === 'shared',
    'A matching local default project may reuse the local app',
);
assert(isExpectedCampaignCueProjectId('campaigncue-qa', 'campaigncue-qa'), 'Exact project must pass');
assert(!isExpectedCampaignCueProjectId('menulist-qa', 'campaigncue-qa'), 'Cross-product project must fail');
assert(!isExpectedCampaignCueProjectId(' campaigncue-qa ', 'campaigncue-qa'), 'Whitespace project must fail');
assert(!isExpectedCampaignCueProjectId({ toString: () => 'campaigncue-qa' }, 'campaigncue-qa'), 'Coercible project must fail');

console.log('CampaignCue Firebase config boundary tests passed.');
