import assert from 'node:assert/strict';

import {
    isAnswerlatticeHostedHelpCandidateHostname,
    normalizeHostedHelpDomain,
} from '@constant/answerlattice/hostedHelp';
import {
    normalizeHostedHelpConfig,
    normalizeHostedHelpDomainVerification,
    parseHostedHelpConfigSaveInput,
} from '@lib/answerlattice/hostedHelpConfig';
import {
    buildHostedHelpArticlePath,
    normalizeHostedHelpArticleSlug,
    resolveHostedHelpPublicRoute,
    resolveHostedHelpRequestDomain,
} from '@lib/answerlattice/hostedHelpRequest';
import { resolveAnswerlatticeHostedHelpRegistryScope } from '@lib/answerlattice/hostedHelpServer';

assert.equal(normalizeHostedHelpDomain('https://HELP.example.com/path'), 'help.example.com');
assert.equal(normalizeHostedHelpDomain('help.example.com:443'), 'help.example.com');
assert.equal(normalizeHostedHelpDomain('localhost'), null);
assert.equal(isAnswerlatticeHostedHelpCandidateHostname('help.example.com'), true);
assert.equal(isAnswerlatticeHostedHelpCandidateHostname('www.docs.example.com'), true);
assert.equal(isAnswerlatticeHostedHelpCandidateHostname('care.example.com'), false);

const config = normalizeHostedHelpConfig({
    enabled: true,
    domains: ['docs.example.com', 'help.example.com', 'docs.example.com'],
    primaryDomain: 'missing.example.com',
    title: 'Product Help',
    description: 'Reviewed public product guidance.',
});
assert.deepEqual(config.domains, ['docs.example.com', 'help.example.com']);
assert.equal(config.primaryDomain, 'docs.example.com');
assert.equal(config.enabled, true);
assert.equal(normalizeHostedHelpConfig({ enabled: true, domains: [] }).enabled, false);
assert.deepEqual(resolveAnswerlatticeHostedHelpRegistryScope({ pId: 'AL', tId: 11, sId: 22 }), {
    tenantId: 11,
    storeId: 22,
});
assert.equal(resolveAnswerlatticeHostedHelpRegistryScope({ pId: 'AL', productId: 'ML', tId: 11, sId: 22 }), null);
assert.equal(resolveAnswerlatticeHostedHelpRegistryScope({ pId: 'AL', tId: 11, tenantId: 12, sId: 22 }), null);
assert.equal(resolveAnswerlatticeHostedHelpRegistryScope({ pId: 'AL', tId: 11, sId: 22, storeId: 23 }), null);

const saveConfig = parseHostedHelpConfigSaveInput({
    enabled: true,
    domains: ['docs.example.com'],
    primaryDomain: 'docs.example.com',
    title: 'Product Help',
    description: 'Reviewed public product guidance.',
    showFaqs: true,
    showChangelog: true,
    noIndex: false,
});
assert.equal(saveConfig.primaryDomain, 'docs.example.com');
assert.throws(() => parseHostedHelpConfigSaveInput('invalid'));
assert.throws(() => parseHostedHelpConfigSaveInput({ enabled: false }));
assert.throws(() => parseHostedHelpConfigSaveInput({
    ...saveConfig,
    domains: ['https://docs.example.com/path'],
}));
assert.throws(() => parseHostedHelpConfigSaveInput({
    ...saveConfig,
    unexpected: true,
}));

const verification = normalizeHostedHelpDomainVerification({
    misconfigured: false,
    secret: 'must-not-cross-the-boundary',
    verificationRecords: [
        { type: 'TXT', domain: '_vercel.example.com', value: 'verify-value', token: 'secret' },
        null,
    ],
    configuredBy: [
        { type: 'CNAME', name: 'help', value: 'cname.vercel-dns.com' },
    ],
});
assert.deepEqual(verification, {
    misconfigured: false,
    verificationRecords: [{ type: 'TXT', domain: '_vercel.example.com', value: 'verify-value' }],
    configuredBy: [{ type: 'CNAME', name: 'help', value: 'cname.vercel-dns.com' }],
});
assert.equal(JSON.stringify(verification).includes('secret'), false);
assert.equal(normalizeHostedHelpDomainVerification({ verificationRecords: new Array(25).fill({ type: 'TXT', value: 'x' }) }).verificationRecords.length, 20);

assert.equal(normalizeHostedHelpArticleSlug('articles/getting-started'), 'getting-started');
assert.equal(normalizeHostedHelpArticleSlug('guides/setup'), 'guides/setup');
assert.equal(normalizeHostedHelpArticleSlug('guides/%2E%2E/setup'), '');
assert.equal(normalizeHostedHelpArticleSlug('guide%3Fpreview=true'), '');
assert.equal(normalizeHostedHelpArticleSlug('%E0%A4%A'), '');
assert.equal(normalizeHostedHelpArticleSlug('x'.repeat(301)), '');
assert.equal(buildHostedHelpArticlePath('guides/setup'), '/articles/guides%2Fsetup');

assert.deepEqual(resolveHostedHelpPublicRoute([], { showFaqs: true, showChangelog: true }), {
    view: 'home',
    canonicalPath: '/',
});
assert.deepEqual(resolveHostedHelpPublicRoute(['docs'], { showFaqs: true, showChangelog: true }), {
    view: 'docs',
    canonicalPath: '/docs',
});
assert.deepEqual(resolveHostedHelpPublicRoute(['articles', 'guides', 'setup'], { showFaqs: true, showChangelog: true }), {
    view: 'article',
    articleSlug: 'guides/setup',
    canonicalPath: '/articles/guides%2Fsetup',
});
assert.equal(resolveHostedHelpPublicRoute(['faq'], { showFaqs: false, showChangelog: true }), null);
assert.equal(resolveHostedHelpPublicRoute(['changelog', 'extra'], { showFaqs: true, showChangelog: true }), null);
assert.equal(resolveHostedHelpPublicRoute(['unknown'], { showFaqs: true, showChangelog: true }), null);

assert.equal(resolveHostedHelpRequestDomain({
    host: 'help.example.com',
    queryDomain: 'docs.other.com',
    isDevelopmentRewrite: false,
    isDevelopmentRuntime: false,
}), 'help.example.com');
assert.equal(resolveHostedHelpRequestDomain({
    host: 'localhost:3000',
    queryDomain: 'docs.example.com',
    isDevelopmentRewrite: true,
    isDevelopmentRuntime: true,
}), 'docs.example.com');
assert.equal(resolveHostedHelpRequestDomain({
    host: 'localhost:3000',
    queryDomain: 'docs.example.com',
    isDevelopmentRewrite: false,
    isDevelopmentRuntime: true,
}), 'localhost');

console.log('Answerlattice hosted Help Center contracts passed.');
