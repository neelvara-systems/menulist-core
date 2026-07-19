import assert from 'node:assert/strict';
import {
    normalizeStoredAnswerlatticeAdvancedBranding,
    parseAnswerlatticeAdvancedBranding,
} from '../../src/lib/answerlattice/advancedBrandingContracts';
import { ANSWERLATTICE_DEFAULT_BRANDING } from '../../src/types/answerlattice';

const validProfile = {
    companyName: ' Example SaaS ',
    logoUrl: 'https://cdn.example.com/logo.png',
    faviconUrl: 'https://cdn.example.com/favicon.ico',
    primaryColor: '#1677FF',
    accentColor: '#22C55E',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    headerBackground: '#F8FAFC',
    headerTextColor: '#0F172A',
    poweredByVisible: true,
    supportEmail: 'support@example.com',
    privacyPolicyUrl: 'https://example.com/privacy',
    termsUrl: 'https://example.com/terms',
};

const parsed = parseAnswerlatticeAdvancedBranding(validProfile);
assert.equal(parsed.companyName, 'Example SaaS');
assert.equal(parsed.primaryColor, '#1677ff');
assert.equal(parsed.accentColor, '#22c55e');
assert.equal(
    parseAnswerlatticeAdvancedBranding({
        ...validProfile,
        logoUrl: 'https://cdn.example.com/logo@2x.png?version=1',
    }).logoUrl,
    'https://cdn.example.com/logo@2x.png?version=1',
);

for (const invalid of [
    { ...validProfile, customCss: 'body { display: none; }' },
    { ...validProfile, fontFamily: 'url(https://attacker.example/font)' },
    { ...validProfile, logoUrl: 'http://cdn.example.com/logo.png' },
    { ...validProfile, logoUrl: 'https://user:secret@cdn.example.com/logo.png' },
    { ...validProfile, logoUrl: 'https://cdn.example.com/logo image.png' },
    { ...validProfile, privacyPolicyUrl: 'https://example.com/privacy#private' },
    { ...validProfile, primaryColor: 'blue' },
    { ...validProfile, supportEmail: 'not-an-email' },
    { ...validProfile, companyName: '' },
]) {
    assert.throws(() => parseAnswerlatticeAdvancedBranding(invalid));
}

assert.deepEqual(
    normalizeStoredAnswerlatticeAdvancedBranding({
        ...validProfile,
        customCss: '.unsafe {}',
    }),
    ANSWERLATTICE_DEFAULT_BRANDING,
);
assert.deepEqual(
    normalizeStoredAnswerlatticeAdvancedBranding(null),
    ANSWERLATTICE_DEFAULT_BRANDING,
);

const optionalFieldsOmitted = parseAnswerlatticeAdvancedBranding({
    companyName: 'Example',
    primaryColor: '#000000',
    poweredByVisible: false,
    logoUrl: undefined,
});
assert.equal('logoUrl' in optionalFieldsOmitted, false);

console.log('Answerlattice advanced branding contract tests passed');
