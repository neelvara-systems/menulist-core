import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { TranslationAPIParams } from './types';
import { normalizeTranslationMap } from '@lib/ai/translationOutput';
import {
    getBoundedTranslationStringContext,
    getTranslationLanguageLogContext,
    getTranslationScopeLogContext,
    logTranslationFailure,
} from './utils/translationDiagnostics';

const MENU_TRANSLATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type MenuTranslationApiResponse = {
    data?: unknown;
    remainingBalance?: unknown;
    transaction?: unknown;
};

async function getTranslations({ inputJson, targetLang, sourceLang, action, projectId, fileId }: TranslationAPIParams): Promise<Record<string, string> | null> {
    const normalizedAction = action;
    const translationKeyCount = inputJson && typeof inputJson === 'object' ? Object.keys(inputJson).length : 0;
    let responseStatus: number | undefined;

    try {
        const payload = {
            inputJson,
            targetLang,
            sourceLang,
            action: normalizedAction,
            projectId,
            fileId
        }
        const response = await fetch('/api/translations', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        responseStatus = response.status;

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error('translation_request_failed');
        }

        const responseJson = await readAiServiceResponseJson<MenuTranslationApiResponse>(response, {
            context: {
                ...getTranslationScopeLogContext(projectId, fileId),
                ...getTranslationLanguageLogContext(targetLang?.code, sourceLang?.code),
                ...getBoundedTranslationStringContext('action', normalizedAction),
                translationKeyCount,
                responseStatus,
            },
            invalidFailureCode: 'menu_translation_response_invalid',
            maxBytes: MENU_TRANSLATION_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'menu_translation_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        if (data && typeof data === 'object' && !Array.isArray(data) && 'translations' in data) {
            const translations = (data as { translations?: unknown }).translations;
            return normalizeTranslationMap(translations, Object.keys(inputJson));
        }
        return normalizeTranslationMap(data, Object.keys(inputJson));

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logTranslationFailure('menu_translation_api_request_failed', error, {
            ...getTranslationScopeLogContext(projectId, fileId),
            ...getTranslationLanguageLogContext(targetLang?.code, sourceLang?.code),
            ...getBoundedTranslationStringContext('action', normalizedAction),
            translationKeyCount,
            responseStatus,
        });
        return null; // Return original strings if API call fails
    }
}

export default getTranslations;
