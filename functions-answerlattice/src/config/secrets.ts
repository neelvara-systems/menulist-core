/**
 * Answerlattice Cloud Function secret declarations.
 *
 * Product-prefixed secret names keep Answerlattice QA/prod operations separate from
 * MenuList secrets even when both products share one source repository.
 */

import { defineSecret } from 'firebase-functions/params';

export const ANSWERLATTICE_OPTIONAL_PROVIDER_SECRETS_BOUND =
    process.env.ANSWERLATTICE_BIND_OPTIONAL_PROVIDER_SECRETS === 'true';

type AnswerlatticeSecretParam = ReturnType<typeof defineSecret>;

function defineOptionalProviderSecret(name: string): AnswerlatticeSecretParam | null {
    return ANSWERLATTICE_OPTIONAL_PROVIDER_SECRETS_BOUND ? defineSecret(name) : null;
}

export const ANSWERLATTICE_SECRETS = {
    CRON_SECRET: defineSecret('ANSWERLATTICE_CRON_SECRET'),
    GEMINI_AI_KEY: defineSecret('ANSWERLATTICE_GEMINI_AI_KEY'),
    PUBLIC_BUNDLE_SALT: defineSecret('ANSWERLATTICE_PUBLIC_BUNDLE_SALT'),
    SMTP_HOST: defineOptionalProviderSecret('ANSWERLATTICE_SMTP_HOST'),
    SMTP_PORT: defineOptionalProviderSecret('ANSWERLATTICE_SMTP_PORT'),
    SMTP_USER: defineOptionalProviderSecret('ANSWERLATTICE_SMTP_USER'),
    SMTP_PASS: defineOptionalProviderSecret('ANSWERLATTICE_SMTP_PASS'),
    RESEND_API_KEY: defineSecret('ANSWERLATTICE_RESEND_API_KEY'),
    RESEND_WEBHOOK_SECRET: defineSecret('ANSWERLATTICE_RESEND_WEBHOOK_SECRET'),
    WHATSAPP_PHONE_NUMBER_ID: defineOptionalProviderSecret('ANSWERLATTICE_WHATSAPP_PHONE_NUMBER_ID'),
    WHATSAPP_ACCESS_TOKEN: defineOptionalProviderSecret('ANSWERLATTICE_WHATSAPP_ACCESS_TOKEN'),
    WHATSAPP_APP_SECRET: defineOptionalProviderSecret('ANSWERLATTICE_WHATSAPP_APP_SECRET'),
    WHATSAPP_VERIFY_TOKEN: defineOptionalProviderSecret('ANSWERLATTICE_WHATSAPP_VERIFY_TOKEN'),
} as const;

function bindOptionalProviderSecrets(
    secrets: readonly (AnswerlatticeSecretParam | null)[],
): AnswerlatticeSecretParam[] {
    return secrets.filter((secret): secret is AnswerlatticeSecretParam => secret !== null);
}

export const ANSWERLATTICE_SECRET_GROUPS = {
    AI: [
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY,
    ],
    MANUAL_SCHEDULER: [ANSWERLATTICE_SECRETS.CRON_SECRET],
    MANUAL_SCHEDULER_WITH_AI: [
        ANSWERLATTICE_SECRETS.CRON_SECRET,
        ANSWERLATTICE_SECRETS.PUBLIC_BUNDLE_SALT,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY,
    ],
    NIGHTLY_WITH_AI: [
        ANSWERLATTICE_SECRETS.PUBLIC_BUNDLE_SALT,
        ANSWERLATTICE_SECRETS.GEMINI_AI_KEY,
    ],
    WORKFLOW_INTEGRATIONS: bindOptionalProviderSecrets([
        ANSWERLATTICE_SECRETS.SMTP_HOST,
        ANSWERLATTICE_SECRETS.SMTP_PORT,
        ANSWERLATTICE_SECRETS.SMTP_USER,
        ANSWERLATTICE_SECRETS.SMTP_PASS,
    ]),
    EMAIL_OS: bindOptionalProviderSecrets([
        ANSWERLATTICE_SECRETS.RESEND_API_KEY,
    ]),
    EMAIL_OS_WEBHOOK: [
        ANSWERLATTICE_SECRETS.RESEND_WEBHOOK_SECRET,
    ],
    WHATSAPP_OS_WEBHOOK: bindOptionalProviderSecrets([
        ANSWERLATTICE_SECRETS.WHATSAPP_APP_SECRET,
        ANSWERLATTICE_SECRETS.WHATSAPP_VERIFY_TOKEN,
    ]),
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
