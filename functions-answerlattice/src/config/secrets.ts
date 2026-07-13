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
    SMTP_HOST: defineSecret('ANSWERLATTICE_SMTP_HOST'),
    SMTP_PORT: defineSecret('ANSWERLATTICE_SMTP_PORT'),
    SMTP_USER: defineSecret('ANSWERLATTICE_SMTP_USER'),
    SMTP_PASS: defineSecret('ANSWERLATTICE_SMTP_PASS'),
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
    WORKFLOW_INTEGRATIONS: [
        ANSWERLATTICE_SECRETS.SMTP_HOST,
        ANSWERLATTICE_SECRETS.SMTP_PORT,
        ANSWERLATTICE_SECRETS.SMTP_USER,
        ANSWERLATTICE_SECRETS.SMTP_PASS,
    ],
};

export function readAnswerlatticeCronSecret(): string {
    try {
        return ANSWERLATTICE_SECRETS.CRON_SECRET.value()
            || process.env.ANSWERLATTICE_CRON_SECRET
            || '';
    } catch {
        return process.env.ANSWERLATTICE_CRON_SECRET || '';
    }
}
