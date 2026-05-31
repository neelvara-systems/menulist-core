/**
 * Answerlattice Cloud Function secret declarations.
 *
 * Product-prefixed secret names keep Answerlattice QA/prod operations separate from
 * MenuList secrets even when both products share one source repository.
 */

import { defineSecret } from 'firebase-functions/params';

export const ANSWERLATTICE_SECRETS = {
    CRON_SECRET: defineSecret('ANSWERLATTICE_CRON_SECRET'),
} as const;

export const ANSWERLATTICE_SECRET_GROUPS = {
    MANUAL_SCHEDULER: [ANSWERLATTICE_SECRETS.CRON_SECRET],
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
