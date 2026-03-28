import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { TranslationAPIParams } from './types';

async function getTranslations({ inputJson, targetLang, sourceLang, action, projectId, fileId }: TranslationAPIParams): Promise<Record<string, string>> {
    try {
        const payload = {
            inputJson,
            targetLang,
            sourceLang,
            action,
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
        return data?.translations || null;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        console.error('Error calling translation API:', error);
        return null; // Return original strings if API call fails
    }
}

export default getTranslations;