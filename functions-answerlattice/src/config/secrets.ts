/**
 * Answerlattice Cloud Function secret declarations.
 *
 * Product-prefixed secret names keep Answerlattice QA/prod operations separate from
 * MenuList secrets even when both products share one source repository.
 */

import { defineSecret } from 'firebase-functions/params';

export const ANSWERLATTICE_SECRETS = {
    CRON_SECRET: defineSecret('ANSWERLATTICE_CRON_SECRET'),
    GEMINI_AI_KEY: defineSecret('ANSWERLATTICE_GEMINI_AI_KEY'),
    GEMINI_AI_KEY_2: defineSecret('ANSWERLATTICE_GEMINI_AI_KEY_2'),
    GEMINI_AI_KEY_3: defineSecret('ANSWERLATTICE_GEMINI_AI_KEY_3'),
    GEMINI_AI_KEY_4: defineSecret('ANSWERLATTICE_GEMINI_AI_KEY_4'),
} as const;

export const ANSWERLATTICE_SECRET_GROUPS = {
    AI: [
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY_2,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY_3,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY_4,
    ],
    MANUAL_SCHEDULER: [ANSWERLATTICE_SECRETS.CRON_SECRET],
    MANUAL_SCHEDULER_WITH_AI: [
        ANSWERLATTICE_SECRETS.CRON_SECRET,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY_2,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY_3,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY_4,
    ],
};

export function readAnswerlatticeCronSecret(): string {
    try {
        return ANSWERLATTICE_SECRETS.CRON_SECRET.value()
            || process.env.ANSWERLATTICE_CRON_SECRET
            || process.env.CRON_SECRET
            || '';
    } catch {
        return process.env.ANSWERLATTICE_CRON_SECRET || process.env.CRON_SECRET || '';
    }
}
