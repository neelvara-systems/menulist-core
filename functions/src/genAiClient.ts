/**
 * Centralized Gemini AI Client with Multi-Key Rotation (Cloud Functions)
 * 
 * All Cloud Function AI operations import `genAIClient` from this file.
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
 * Configure multiple keys via Firebase secrets:
 *   GEMINI_AI_KEY    (required, primary)
 *   GEMINI_AI_KEY_2  (optional)
 *   GEMINI_AI_KEY_3  (optional)
 *   GEMINI_AI_KEY_4  (optional)
 * 
 * @see __docs__/ai-system-layer/README.md
 */

import { createAIGateway } from "./ai/aiGateway";
import { keyManager } from "./ai/keyManager";

export const genAIClient = createAIGateway(keyManager);