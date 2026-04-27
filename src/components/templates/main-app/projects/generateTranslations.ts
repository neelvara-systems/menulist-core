import { languageActionType } from './types/api.types';
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { TranslationAPIParams } from './types';

async function getTranslations({ inputJson, targetLang, sourceLang, action, projectId, fileId }: TranslationAPIParams): Promise<Record<string, string>> {
    try {
        const normalizedAction = (languageActionType as Record<string, string>)[action] || action;
        const payload = {
            inputJson,
            targetLang,
            sourceLang,
            action: normalizedAction,
            projectId,
            fileId
        }
        const response = await fetch('/api/translations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        return data?.translations || data || null;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        console.error('Error calling translation API:', error);
        return null; // Return original strings if API call fails
    }
}

export default getTranslations;
