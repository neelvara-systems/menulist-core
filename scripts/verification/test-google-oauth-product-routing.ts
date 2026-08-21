import assert from 'node:assert/strict';
import {
    resolveGoogleOAuthCredentialProduct,
    resolveGoogleOAuthRuntimeConfig,
} from '../../src/lib/auth/googleOAuthRuntime';
import { resolveMonitoringProductId } from '../../src/lib/monitoring/sentryShared';

const env = {
    ANSWERLATTICE_GOOGLE_CLIENT_ID: 'answerlattice-client',
    ANSWERLATTICE_GOOGLE_CLIENT_SECRET: 'answerlattice-secret',
    GOOGLE_CLIENT_ID: 'menulist-client',
    GOOGLE_CLIENT_SECRET: 'menulist-secret',
};

for (const hostname of ['canonica.app', 'www.canonica.app', 'answerlattice.com', 'www.answerlattice.com']) {
    assert.equal(resolveGoogleOAuthCredentialProduct(hostname), 'answerlattice');
    assert.deepEqual(resolveGoogleOAuthRuntimeConfig(hostname, env), {
        clientId: 'answerlattice-client',
        clientSecret: 'answerlattice-secret',
        configured: true,
        product: 'answerlattice',
    });
}

for (const hostname of ['app.menulist.digital', 'app.menulist.ai', 'localhost:3000', 'invalid host']) {
    assert.equal(resolveGoogleOAuthCredentialProduct(hostname), 'menulist');
    assert.deepEqual(resolveGoogleOAuthRuntimeConfig(hostname, env), {
        clientId: 'menulist-client',
        clientSecret: 'menulist-secret',
        configured: true,
        product: 'menulist',
    });
}

assert.deepEqual(resolveGoogleOAuthRuntimeConfig('canonica.app', {
    ...env,
    ANSWERLATTICE_GOOGLE_CLIENT_SECRET: '',
}), {
    clientId: 'answerlattice-client',
    clientSecret: '',
    configured: false,
    product: 'answerlattice',
});

assert.equal(resolveMonitoringProductId('https://canonica.app/get-started'), 'answerlattice');
assert.equal(resolveMonitoringProductId('https://app.menulist.digital/dashboard'), 'menulist');
assert.equal(resolveMonitoringProductId('not a URL'), null);

console.log('Google OAuth product routing checks passed.');
