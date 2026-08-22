import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    ANSWERLATTICE_WIDGET_TABS,
    getAnswerlatticeGovernanceTabFromPathname,
    getAnswerlatticeTeamTabFromPathname,
    getAnswerlatticeWidgetTabFromPathname,
} from '../../src/constants/answerlattice/navigations';
import { buildCampaignCueAuthLaunchUrl } from '../../src/constants/campaigncue/routes';

const authUrl = new URL(buildCampaignCueAuthLaunchUrl(
    'https://app.menulist.ai/signin',
    'https://campaigncue.com/app?tab=assets&filter=ready',
));
assert.equal(authUrl.origin, 'https://app.menulist.ai');
assert.equal(authUrl.pathname, '/signin');
assert.equal(authUrl.searchParams.get('product'), 'campaigncue');
assert.equal(
    authUrl.searchParams.get('callbackUrl'),
    'https://campaigncue.com/app?tab=assets&filter=ready',
);

const authUrlWithExistingQuery = new URL(buildCampaignCueAuthLaunchUrl(
    'https://app.menulist.ai/signin?source=campaign',
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

// The public embed owns /widget/[apiKey]. These static aliases ensure clean
// product-host dashboard navigation cannot interpret a management tab as a key.
for (const tab of Object.values(ANSWERLATTICE_WIDGET_TABS)) {
    assert.equal(
        existsSync(resolve(process.cwd(), `src/app/(answerlattice)/widget/${tab}/page.tsx`)),
        true,
        `Missing authenticated clean-path alias for /widget/${tab}`,
    );
}

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
