import type { FirebaseApp, FirebaseOptions } from 'firebase/app';

export type MenuListFirebaseClientBoundaryErrorCode =
    | 'INCOMPLETE_CONFIGURATION'
    | 'PROJECT_ID_MISMATCH'
    | 'EXISTING_APP_OPTIONS_MISMATCH';

export type MenuListFirebaseClientBoundaryResult = {
    errorCode: MenuListFirebaseClientBoundaryErrorCode | null;
    existingApp: FirebaseApp | null;
    valid: boolean;
};

const REQUIRED_OPTION_KEYS = ['apiKey', 'appId', 'projectId'] as const;
const AUTHORITY_OPTION_KEYS = [
    'apiKey',
    'appId',
    'authDomain',
    'databaseURL',
    'messagingSenderId',
    'projectId',
    'storageBucket',
] as const;

const hasNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const optionsMatch = (
    existingOptions: FirebaseOptions,
    configuredOptions: FirebaseOptions,
): boolean => AUTHORITY_OPTION_KEYS.every(
    (key) => (existingOptions[key] ?? undefined) === (configuredOptions[key] ?? undefined),
);

export const resolveMenuListFirebaseClientBoundary = ({
    configuredOptions,
    existingDefaultApp,
    expectedProjectId,
}: {
    configuredOptions: FirebaseOptions;
    existingDefaultApp?: FirebaseApp | null;
    expectedProjectId: string;
}): MenuListFirebaseClientBoundaryResult => {
    if (
        !hasNonEmptyString(expectedProjectId)
        || !REQUIRED_OPTION_KEYS.every((key) => hasNonEmptyString(configuredOptions[key]))
    ) {
        return {
            errorCode: 'INCOMPLETE_CONFIGURATION',
            existingApp: null,
            valid: false,
        };
    }

    if (configuredOptions.projectId !== expectedProjectId) {
        return {
            errorCode: 'PROJECT_ID_MISMATCH',
            existingApp: null,
            valid: false,
        };
    }

    if (existingDefaultApp && !optionsMatch(existingDefaultApp.options, configuredOptions)) {
        return {
            errorCode: 'EXISTING_APP_OPTIONS_MISMATCH',
            existingApp: null,
            valid: false,
        };
    }

    return {
        errorCode: null,
        existingApp: existingDefaultApp || null,
        valid: true,
    };
};
