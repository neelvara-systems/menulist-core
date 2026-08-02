/**
 * Centralized Answerlattice Gemini client.
 *
 * All Answerlattice Functions AI operations import `answerlatticeGenAIClient`
 * from this file. The gateway uses Answerlattice-owned Gemini API keys and
 * keeps MenuList secrets out of Answerlattice runtime.
 */

import { createAIGateway } from './ai/aiGateway';
import { keyManager } from './ai/keyManager';
import {
    createFirestoreGeminiSpendAdmission,
    getGeminiSpendLimitMicroUsd,
} from './sharedData/geminiSpendPolicy';
import { firestoreAdmin } from './firebaseAdmin';

const answerlatticeGeminiSpendAdmission = createFirestoreGeminiSpendAdmission({
    getFirestore: () => firestoreAdmin,
    limitMicroUsd: getGeminiSpendLimitMicroUsd('answerlattice', process.env),
    product: 'answerlattice',
});

export const answerlatticeGenAIClient = createAIGateway(
    keyManager,
    answerlatticeGeminiSpendAdmission,
);
