/**
 * Centralized Gemini AI Client with Multi-Key Rotation
 * 
 * MenuList/default app API routes import `genAIClient` from this file.
 * Separate products create scoped gateways with their own credential pools.
 * The gateway transparently handles:
 * - Bounded retry and provider health handling
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
 *   MENULIST_GEMINI_AI_KEY    (required, primary)
 *
 * Menu extraction uses MENULIST_GEMINI_TEXT_AI_KEY in Firebase Functions and
 * is intentionally outside this app-side shared pool.
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
