/**
 * Canonica Cloud Function secret declarations.
 *
 * Product-prefixed secret names keep Canonica QA/prod operations separate from
 * MenuList secrets even when both products share one source repository.
 */

import { defineSecret } from 'firebase-functions/params';

export const CANONICA_SECRETS = {
    CRON_SECRET: defineSecret('CANONICA_CRON_SECRET'),
} as const;

export const CANONICA_SECRET_GROUPS = {
    MANUAL_SCHEDULER: [CANONICA_SECRETS.CRON_SECRET],
};

export function readCanonicaCronSecret(): string {
    try {
        return CANONICA_SECRETS.CRON_SECRET.value()
            || process.env.CANONICA_CRON_SECRET
            || process.env.CRON_SECRET
            || '';
    } catch {
        return process.env.CANONICA_CRON_SECRET || process.env.CRON_SECRET || '';
    }
}
