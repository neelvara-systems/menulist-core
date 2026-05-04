import syncMissingBusinessCopyTranslations from '../services/ai/businessCopy/syncMissingBusinessCopyTranslations';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export async function assertBusinessCopyTranslationRepair(): Promise<void> {
    let capturedInputJson: Record<string, string> | null = null;
    let capturedTargetLanguages: string[] = [];

    const repaired = await syncMissingBusinessCopyTranslations({
        includePwaShortName: false,
        projectId: '14-mn8d5jbz-15',
        storeDetails: {
            activeLanguages: ['en', 'hi', 'mr'],
            defaultLanguage: 'en',
            metaDescription: { en: 'Enjoy breakfast and coffee.' },
            metaTitle: { en: 'Habibis | Breakfast' },
            publicPresence: {
                descriptor: { en: 'Breakfast and coffee' },
                knownFor: { en: 'Trendy smoothies' },
            },
            pwaSettings: {
                pwaShortName: { en: 'Habibis' },
            },
            storeId: 15,
            tagline: { en: 'Fresh breakfast all day' },
        },
        translateBatch: async ({ inputJson, targetLang }) => {
            capturedInputJson = inputJson;
            capturedTargetLanguages = targetLang.map((language) => language.code);

            return {
                hi: {
                    descriptor: 'नाश्ता और कॉफी',
                    knownFor: 'ट्रेंडी स्मूदी',
                    metaDescription: '',
                    metaTitle: 'हबीबीज़ | नाश्ता',
                    tagline: 'दिनभर ताज़ा नाश्ता',
                },
                mr: {
                    descriptor: 'नाश्ता आणि कॉफी',
                    knownFor: 'ट्रेंडी स्मूदीज',
                    metaDescription: 'नाश्ता आणि कॉफीचा आनंद घ्या.',
                    metaTitle: 'हबीबीज | नाश्ता',
                    tagline: 'दिवसभर ताजे नाश्ते',
                },
            };
        },
    });

    assert(capturedInputJson !== null, 'Repair flow should send a translation payload');
    assert(!('pwaShortName' in (capturedInputJson || {})), 'PWA short name should be excluded when the feature is disabled');
    assert(capturedTargetLanguages.join(',') === 'hi,mr', 'Repair flow should request only the missing target languages');
    assert(repaired?.metaDescription?.hi === undefined, 'Missing translated keys should remain unset instead of inventing data');
    assert(repaired?.metaDescription?.mr === 'नाश्ता आणि कॉफीचा आनंद घ्या.', 'Valid translated fields should be merged into the result');

    let capturedWithPwa: Record<string, string> | null = null;
    await syncMissingBusinessCopyTranslations({
        includePwaShortName: true,
        projectId: '14-mn8d5jbz-15',
        storeDetails: {
            activeLanguages: ['en', 'hi'],
            defaultLanguage: 'en',
            metaDescription: { en: 'Enjoy breakfast and coffee.' },
            metaTitle: { en: 'Habibis | Breakfast' },
            publicPresence: {
                descriptor: { en: 'Breakfast and coffee' },
                knownFor: { en: 'Trendy smoothies' },
            },
            pwaSettings: {
                pwaShortName: { en: 'Habibis' },
            },
            storeId: 15,
            tagline: { en: 'Fresh breakfast all day' },
        },
        translateBatch: async ({ inputJson, targetLang }) => {
            capturedWithPwa = inputJson;
            return Object.fromEntries(targetLang.map((language) => [language.code, {
                descriptor: 'descriptor',
                knownFor: 'knownFor',
                metaDescription: 'metaDescription',
                metaTitle: 'metaTitle',
                pwaShortName: 'Habibis',
                tagline: 'tagline',
            }]));
        },
    });

    assert(Boolean(capturedWithPwa?.pwaShortName), 'PWA short name should be included when the feature is enabled');
}

if (typeof require !== 'undefined' && require.main === module) {
    void assertBusinessCopyTranslationRepair().then(() => {
        // eslint-disable-next-line no-console
        console.log('✓ Business copy repair logic passed verification');
    });
}
