import { ANSWERLATTICE_AI_ENV } from '@constant/answerlattice/ai';
import { createAIGateway } from '@lib/google/genAi/aiGateway';
import { KeyManager } from '@lib/google/genAi/keyManager';

const answerlatticeKeyManager = new KeyManager([
    [ANSWERLATTICE_AI_ENV.GEMINI_AI_KEY],
    [ANSWERLATTICE_AI_ENV.GEMINI_AI_KEY_2],
    [ANSWERLATTICE_AI_ENV.GEMINI_AI_KEY_3],
    [ANSWERLATTICE_AI_ENV.GEMINI_AI_KEY_4],
]);

export const answerlatticeGenAIClient = createAIGateway(answerlatticeKeyManager);
