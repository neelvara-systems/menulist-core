import { ANSWERLATTICE_AI_ENV } from '@constant/answerlattice/ai';
import { createAIGateway } from '@lib/google/genAi/aiGateway';
import { KeyManager } from '@lib/google/genAi/keyManager';
import {
    createFirestoreGeminiSpendAdmission,
    getGeminiSpendLimitMicroUsd,
} from '@data/shared/geminiSpendPolicy';
import { requireAnswerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';

const answerlatticeKeyManager = new KeyManager([
    [ANSWERLATTICE_AI_ENV.GEMINI_AI_KEY],
]);

const answerlatticeGeminiSpendAdmission = createFirestoreGeminiSpendAdmission({
    getFirestore: () => requireAnswerlatticeFirestoreAdmin(),
    limitMicroUsd: getGeminiSpendLimitMicroUsd('answerlattice', process.env),
    product: 'answerlattice',
});

export const answerlatticeGenAIClient = createAIGateway(
    answerlatticeKeyManager,
    answerlatticeGeminiSpendAdmission,
);
