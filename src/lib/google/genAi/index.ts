/**
 * Centralized Gemini AI Client with Multi-Key Rotation
 * 
 * MenuList/default app API routes import `genAIClient` from this file.
 * Separate products create scoped gateways with their own credential pools.
 * The gateway transparently handles:
 * - Multi-key rotation on 429 (rate limit) errors
 * - Exponential backoff retry for server errors
 * - Key health tracking with cooldown periods
 * 
 * Usage remains identical — no call-site changes needed:
 *   genAIClient.models.generateContent({ model, contents, config })
 *   genAIClient.models.embedContent({ model, contents })
 *   genAIClient.models.generateImages({ model, prompt, config })
 *   genAIClient.files.upload({ file, config })
 * 
 * Configure multiple keys via environment variables:
 *   GEMINI_AI_KEY    (required, primary)
 *   GEMINI_AI_KEY_2  (optional)
 *   GEMINI_AI_KEY_3  (optional)
 *   GEMINI_AI_KEY_4  (optional)
 * 
 * @see __docs__/ai-system-layer/README.md
 */

import { createAIGateway } from "./aiGateway";
import { KeyManager } from "./keyManager";
import {
    createFirestoreGeminiSpendAdmission,
    getGeminiSpendLimitMicroUsd,
} from "@data/shared/geminiSpendPolicy";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";

const menulistGeminiSpendAdmission = createFirestoreGeminiSpendAdmission({
    getFirestore: () => firestoreAdmin,
    limitMicroUsd: getGeminiSpendLimitMicroUsd('menulist', process.env),
    product: 'menulist',
});

export const genAIClient = createAIGateway(new KeyManager(), menulistGeminiSpendAdmission);
