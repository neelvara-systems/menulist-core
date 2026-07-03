import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const MENULIST_PUBLIC_CONTACT_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
export const MENULIST_PUBLIC_CONTACT_RESPONSE_SOURCE = 'menulist_public_contact';

export type MenulistPublicContactTopic = 'general' | 'demo' | 'multi-location' | 'pricing' | 'other';

export type MenulistPublicContactResponse = {
    accepted?: unknown;
    helpTopic?: unknown;
    source?: unknown;
    status?: unknown;
};

type PublicContactLogContext = Record<string, boolean | number | string | null | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const isAcceptedMenulistPublicContactResponse = (
    value: MenulistPublicContactResponse | null | undefined,
    expectedHelpTopic: MenulistPublicContactTopic,
): value is MenulistPublicContactResponse & {
    accepted: true;
    helpTopic: MenulistPublicContactTopic;
    source: typeof MENULIST_PUBLIC_CONTACT_RESPONSE_SOURCE;
    status: 'accepted';
} => (
    value?.accepted === true
    && value.source === MENULIST_PUBLIC_CONTACT_RESPONSE_SOURCE
    && value.status === 'accepted'
    && value.helpTopic === expectedHelpTopic
);

export const readMenulistPublicContactResponseJson = async (
    response: Response,
    parseFailureCode: string,
    context: PublicContactLogContext,
): Promise<MenulistPublicContactResponse | null> => {
    try {
        const payload = await readJsonResponseWithLimit<unknown>(
            response,
            MENULIST_PUBLIC_CONTACT_RESPONSE_JSON_MAX_BYTES,
        );
        return isRecord(payload) ? payload : null;
    } catch (error) {
        logRuntimeFailure(parseFailureCode, error, {
            ...context,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: MENULIST_PUBLIC_CONTACT_RESPONSE_JSON_MAX_BYTES,
        });
        return null;
    }
};

export const logInvalidMenulistPublicContactResponse = (
    invalidResponseCode: string,
    value: MenulistPublicContactResponse | null | undefined,
    expectedHelpTopic: MenulistPublicContactTopic,
    context: PublicContactLogContext,
) => {
    logRuntimeFailure(invalidResponseCode, new Error(invalidResponseCode), {
        ...context,
        accepted: value?.accepted === true,
        hasExpectedHelpTopic: value?.helpTopic === expectedHelpTopic,
        hasExpectedSource: value?.source === MENULIST_PUBLIC_CONTACT_RESPONSE_SOURCE,
        hasAcceptedStatus: value?.status === 'accepted',
    });
};
