import { isLocalizedText } from '@lib/localization/text';

type PWASettingsUpdateInput = {
    enableInstallableApp?: boolean;
    promoteInstallation?: boolean;
    pwaShortName?: string | Record<string, string> | null;
};

export const buildPWASettingsUpdatePayload = (
    settings: PWASettingsUpdateInput,
    deleteSentinel: unknown,
): Record<string, unknown> => {
    const update: Record<string, unknown> = {};

    if (typeof settings.enableInstallableApp === 'boolean') {
        update['pwaSettings.enableInstallableApp'] = settings.enableInstallableApp;
    }
    if (typeof settings.promoteInstallation === 'boolean') {
        update['pwaSettings.promoteInstallation'] = settings.promoteInstallation;
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'pwaShortName')) {
        if (typeof settings.pwaShortName === 'string') {
            const normalized = settings.pwaShortName.trim().slice(0, 12);
            update['pwaSettings.pwaShortName'] = normalized || deleteSentinel;
        } else if (isLocalizedText(settings.pwaShortName)) {
            const normalized = Object.fromEntries(
                Object.entries(settings.pwaShortName)
                    .map(([language, value]) => [language, String(value || '').trim().slice(0, 12)])
                    .filter(([, value]) => value.length > 0),
            );
            update['pwaSettings.pwaShortName'] = Object.keys(normalized).length > 0
                ? normalized
                : deleteSentinel;
        } else if (settings.pwaShortName == null) {
            update['pwaSettings.pwaShortName'] = deleteSentinel;
        }
    }

    return update;
};
