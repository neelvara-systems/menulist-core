/**
 * Centralized Gemini AI Client (Cloud Functions)
 * 
 * All Cloud Function AI operations import `genAIClient` from this file.
 * The gateway transparently handles:
 * - Exponential backoff retry for server errors
 * - Primary-key health tracking with cooldown periods
 * 
 * Usage remains identical — no call-site changes needed:
 *   genAIClient.models.generateContent({ model, contents, config })
 *   genAIClient.models.embedContent({ model, contents })
 *   genAIClient.models.generateImages({ model, prompt, config })
 *   genAIClient.files.upload({ file, config })
 * 
 * Configure the primary key via Firebase Secret Manager:
 *   GEMINI_AI_KEY    (required, primary)
 * Menu extraction uses the separately bound MENULIST_GEMINI_TEXT_AI_KEY.
 * 
 * @see __docs__/ai-system-layer/README.md
 */

import { createAIGateway } from "./ai/aiGateway";
import { keyManager } from "./ai/keyManager";
import {
    createFirestoreGeminiSpendAdmission,
    getGeminiSpendLimitMicroUsd,
} from "./sharedData/geminiSpendPolicy";
import { firestoreAdmin } from "./firebaseAdmin";

const menulistGeminiSpendAdmission = createFirestoreGeminiSpendAdmission({
    getFirestore: () => firestoreAdmin,
    limitMicroUsd: getGeminiSpendLimitMicroUsd('menulist', process.env),
    product: 'menulist',
});

export const genAIClient = createAIGateway(keyManager, menulistGeminiSpendAdmission);
