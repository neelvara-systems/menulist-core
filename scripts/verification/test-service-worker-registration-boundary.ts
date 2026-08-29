import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    getServiceWorkerRegistrationScriptUrl,
    isExactServiceWorkerRegistration,
    type ServiceWorkerRegistrationIdentity,
} from '../../src/lib/pwa/serviceWorkerRegistration';

const targetScriptUrl = 'https://app.menulist.ai/serwist/sw.js';
const targetScope = 'https://app.menulist.ai/';
const registration = (
    scriptURL: string,
    scope = targetScope,
): ServiceWorkerRegistrationIdentity => ({
    active: { scriptURL },
    scope,
});

assert.equal(getServiceWorkerRegistrationScriptUrl(registration(targetScriptUrl)), targetScriptUrl);
assert.equal(isExactServiceWorkerRegistration(registration(targetScriptUrl), targetScriptUrl, targetScope), true);
assert.equal(
    isExactServiceWorkerRegistration(
        registration(targetScriptUrl, 'https://app.menulist.ai/projects/'),
        targetScriptUrl,
        targetScope,
    ),
    false,
    'a same-script registration at a narrowed scope must not satisfy the root worker contract',
);
assert.equal(
    isExactServiceWorkerRegistration(registration('https://app.menulist.ai/sw-customer.js'), targetScriptUrl, targetScope),
    false,
);

const registerSource = readFileSync(
    resolve(process.cwd(), 'src/components/ServiceWorkerRegister.tsx'),
    'utf8',
);
assert.ok(registerSource.includes('const pathname = usePathname();'));
assert.ok(registerSource.includes('}, [pathname]);'));
assert.ok(registerSource.includes('serviceWorkerReconciliationQueue'));
assert.ok(registerSource.includes('matchesTarget(reg, allowedTarget)'));
assert.ok(registerSource.includes("scope: MYCODEX_OWNER_SCOPE"));
assert.ok(registerSource.includes("scope: ANSWERLATTICE_PLATFORM_SCOPE"));
assert.ok(registerSource.includes('return [OWNER_SW_TARGET, MYCODEX_OWNER_SW_TARGET, ANSWERLATTICE_PLATFORM_SW_TARGET]'));
assert.ok(registerSource.includes("updateViaCache: 'none'"));

console.log('Service-worker registration boundary tests passed.');
