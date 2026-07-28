import assert from 'node:assert/strict';
import {
    getAnswerlatticeGovernanceTabFromPathname,
    getAnswerlatticeTeamTabFromPathname,
    getAnswerlatticeWidgetTabFromPathname,
} from '../../src/constants/answerlattice/navigations';
import { buildCampaignCueAuthLaunchUrl } from '../../src/constants/campaigncue/routes';

const authUrl = new URL(buildCampaignCueAuthLaunchUrl(
    'https://menulist.ai/signin',
    'https://campaigncue.com/app?tab=assets&filter=ready',
));
assert.equal(authUrl.origin, 'https://menulist.ai');
assert.equal(authUrl.pathname, '/signin');
assert.equal(authUrl.searchParams.get('product'), 'campaigncue');
assert.equal(
    authUrl.searchParams.get('callbackUrl'),
    'https://campaigncue.com/app?tab=assets&filter=ready',
);

const authUrlWithExistingQuery = new URL(buildCampaignCueAuthLaunchUrl(
    'https://menulist.ai/signin?source=campaign',
    '/campaigncue/app',
));
assert.equal(authUrlWithExistingQuery.searchParams.get('source'), 'campaign');
assert.equal(authUrlWithExistingQuery.searchParams.get('product'), 'campaigncue');
assert.equal(authUrlWithExistingQuery.searchParams.get('callbackUrl'), '/campaigncue/app');

assert.equal(
    getAnswerlatticeGovernanceTabFromPathname('/answerlattice/governance/answers'),
    'answers',
);
assert.equal(
    getAnswerlatticeWidgetTabFromPathname('/answerlattice/widget/hosted-help'),
    'hosted-help',
);
assert.equal(
    getAnswerlatticeTeamTabFromPathname('/answerlattice/team/roles'),
    'roles',
);

for (const malformedPath of [
    '/answerlattice/governance/%',
    '/answerlattice/widget/%E0%A4%A',
    '/answerlattice/team/%ZZ',
]) {
    assert.doesNotThrow(() => {
        getAnswerlatticeGovernanceTabFromPathname(malformedPath);
        getAnswerlatticeWidgetTabFromPathname(malformedPath);
        getAnswerlatticeTeamTabFromPathname(malformedPath);
    });
}
assert.equal(getAnswerlatticeGovernanceTabFromPathname('/answerlattice/governance/%'), null);
assert.equal(getAnswerlatticeWidgetTabFromPathname('/answerlattice/widget/%E0%A4%A'), null);
assert.equal(getAnswerlatticeTeamTabFromPathname('/answerlattice/team/%ZZ'), null);

console.log('Product route constant regression tests passed.');
