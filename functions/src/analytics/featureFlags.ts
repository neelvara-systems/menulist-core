/**
 * Analytics feature flags for Cloud Functions.
 *
 * Keep paid analytics AI gated server-side. Frontend feature flags do not
 * protect Gemini spend because these calls run in scheduled functions.
 */

function readBooleanFlag(name: string, defaultValue = false): boolean {
    const value = String(process.env[name] || '').trim().toLowerCase();
    if (!value) return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(value);
}

export const ANALYTICS_FEATURE_FLAGS = {
    /**
     * Enables paid Gemini calls for owner-facing analytics wording:
     * - daily / weekly / monthly owner dashboard summaries
     * - owner action plan wording polish
     *
     * When false, deterministic scheduler/read-model fields still write.
     */
    ENABLE_OWNER_ANALYTICS_AI_SUMMARIES: readBooleanFlag('ENABLE_OWNER_ANALYTICS_AI_SUMMARIES', false),
};
