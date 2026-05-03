import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';

export function getPublicBusinessDescription(storeData: any, language?: string): string {
    const contentLanguage = language || storeData?.defaultLanguage || storeData?.activeLanguages?.[0] || storeData?.language || 'en';
    const publicDescriptor = getLocalizedText(
        storeData?.publicPresence?.descriptor,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.publicPresence?.descriptor, contentLanguage),
        '',
    ).trim();
    const publicKnownFor = getLocalizedText(
        storeData?.publicPresence?.knownFor,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.publicPresence?.knownFor, contentLanguage),
        '',
    ).trim();

    if (publicDescriptor && publicKnownFor && publicDescriptor !== publicKnownFor) {
        return `${publicDescriptor}. ${publicKnownFor}`;
    }

    return publicDescriptor || publicKnownFor || '';
}
