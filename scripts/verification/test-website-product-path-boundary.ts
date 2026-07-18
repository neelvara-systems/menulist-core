import assert from 'node:assert/strict';
import {
    shouldPrefixWebsiteHref,
    withoutWebsiteBasePath,
    withWebsiteBasePath,
} from '../../src/components/website/shared/WebsiteProductPathProvider';

[
    '/',
    '/faq',
    '/invite#token',
    '/tools/qr-link-health-check',
    '/whatsapp?source=campaign',
    '/resources/menu-engineering',
    '/hi-IN/resources/menu-engineering',
    '/ar-SA/resources',
    '/es-ES/resources/official-menu-source',
].forEach((href) => assert.equal(shouldPrefixWebsiteHref(href), true, href));

[
    '/dashboard',
    '/fr-FR/resources/menu-engineering',
    '/ml/resources',
    'https://menulist.ai/resources',
    '//example.com/resources',
].forEach((href) => assert.equal(shouldPrefixWebsiteHref(href), false, href));

assert.equal(withWebsiteBasePath('/', '/ml'), '/ml');
assert.equal(withWebsiteBasePath('/faq', '/ml'), '/ml/faq');
assert.equal(withWebsiteBasePath('/tools?source=footer', '/ml/'), '/ml/tools?source=footer');
assert.equal(withWebsiteBasePath('/hi-IN/resources/menu-engineering', '/ml'), '/ml/hi-IN/resources/menu-engineering');
assert.equal(withWebsiteBasePath('/dashboard', '/ml'), '/dashboard');
assert.equal(withWebsiteBasePath('/resources', '//invalid'), '/resources');

assert.equal(withoutWebsiteBasePath('/ml', '/ml'), '/');
assert.equal(withoutWebsiteBasePath('/ml/tools', '/ml'), '/tools');
assert.equal(withoutWebsiteBasePath('/ml/hi-IN/resources', '/ml/'), '/hi-IN/resources');
assert.equal(withoutWebsiteBasePath('/mlegacy/resources', '/ml'), '/mlegacy/resources');
assert.equal(withoutWebsiteBasePath('/ml/resources', '//invalid'), '/ml/resources');

console.log('Website product path boundary tests passed.');
