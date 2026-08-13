/**
 * Menu extraction Gemini client.
 *
 * This credential pool is intentionally separate from the shared MenuList AI
 * pool so text/File API extraction cannot rotate onto an image credential.
 * QA stores the synthetic-only free-project key under the same secret name;
 * production must use a paid key from the governed production project.
 */

import { createAIGateway } from "./ai/aiGateway";
import { KeyManager } from "./ai/keyManager";
import { firestoreAdmin } from "./firebaseAdmin";
import {
    createFirestoreGeminiSpendAdmission,
    getGeminiSpendLimitMicroUsd,
} from "./sharedData/geminiSpendPolicy";

const menuExtractionKeyManager = new KeyManager([
    ['MENULIST_GEMINI_TEXT_AI_KEY'],
] as const);

const menuExtractionSpendAdmission = createFirestoreGeminiSpendAdmission({
    getFirestore: () => firestoreAdmin,
    limitMicroUsd: getGeminiSpendLimitMicroUsd('menulist', process.env),
    product: 'menulist',
});

export const menuExtractionGenAIClient = createAIGateway(
    menuExtractionKeyManager,
    menuExtractionSpendAdmission,
);
