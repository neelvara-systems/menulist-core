import { computeBusinessCopyCoverageCore } from '../services/ai/businessCopy/translationCoverageCore';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function findField(report: ReturnType<typeof computeBusinessCopyCoverageCore>, key: string) {
    const field = report.fields.find((entry) => entry.key === key);
    assert(field, `Missing field "${key}" in coverage report`);
    return field;
}

export function assertBusinessCopyCoverageCore(): void {
    const legacyReport = computeBusinessCopyCoverageCore({
        fields: [
            { key: 'displayName', value: 'Habibis Restaurant' },
            { key: 'descriptor', value: '' },
        ],
        managedLanguages: ['en', 'hi', 'mr'],
        preferredLanguage: 'en',
    });

    assert(legacyReport.referenceLanguage === 'en', 'Legacy string content should use the preferred language as source');
    assert(legacyReport.repairableGapCount === 2, 'Legacy string content should surface two missing translation gaps');
    assert(findField(legacyReport, 'displayName').missingLanguages.join(',') === 'hi,mr', 'Legacy display name should be missing in hi and mr');
    assert(findField(legacyReport, 'descriptor').status === 'empty', 'Empty source content should remain empty');

    const driftReport = computeBusinessCopyCoverageCore({
        fields: [
            { key: 'displayName', value: { mr: 'हबीबीज', en: 'Habibis' } },
            { key: 'descriptor', value: { mr: 'नाश्ता, कॉफी आणि स्मूदीज' } },
        ],
        managedLanguages: ['en', 'hi', 'mr'],
        preferredLanguage: 'en',
    });

    assert(driftReport.referenceLanguage === 'en', 'Canonical English should remain the effective source language when present');
    assert(findField(driftReport, 'displayName').missingLanguages.join(',') === 'hi', 'Existing english coverage should not be marked missing');
    assert(findField(driftReport, 'descriptor').missingLanguages.join(',') === 'hi', 'Descriptor should treat English as canonical source and only repair the remaining target languages');

    const fullCoverageReport = computeBusinessCopyCoverageCore({
        fields: [
            { key: 'displayName', value: { en: 'Habibis', hi: 'हबीबीज', mr: 'हबीबीज' } },
            { key: 'metaTitle', value: { en: 'Habibis | Breakfast', hi: 'हबीबीज | नाश्ता', mr: 'हबीबीज | नाश्ता' } },
        ],
        managedLanguages: ['en', 'hi', 'mr'],
        preferredLanguage: 'en',
    });

    assert(fullCoverageReport.repairableGapCount === 0, 'Fully covered fields should report zero repairable gaps');
    assert(fullCoverageReport.missingFieldCount === 0, 'Fully covered fields should report zero missing fields');
}

if (typeof require !== 'undefined' && require.main === module) {
    assertBusinessCopyCoverageCore();
    // eslint-disable-next-line no-console
    console.log('✓ Business copy coverage logic passed verification');
}
