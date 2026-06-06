export const ANSWERLATTICE_PUBLIC_BRAND = 'AnswerLattice';

export const ANSWERLATTICE_PUBLIC_DOMAIN_DECISION = {
    canonicalHost: 'answerlattice.com',
    previewHost: 'ecomsai.com',
    localPath: '/__answerlattice',
    publicBrand: ANSWERLATTICE_PUBLIC_BRAND,
    internalRouteSlug: 'answerlattice',
    decision:
        'AnswerLattice is the public brand for the existing runtime and public website. The production canonical host remains answerlattice.com; ecomsai.com stays preview/QA unless the deployment target matrix is intentionally changed.',
} as const;

export const ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS = {
    allowedClaims: [
        'safe page context',
        'approved answers before fallback',
        'safe page context',
        'reviewable support gaps',
        'human-reviewed answer changes',
        'support knowledge layer',
        'launch-ready support setup',
    ],
    forbiddenPhrases: [
        'Canonica',
        'AI-powered',
        'zero hallucinations',
        'never stale',
        'replaces your helpdesk',
        'fully autonomous support',
        'guaranteed ticket reduction',
        'guaranteed AI search visibility',
        'trusted by',
        'SOC 2',
        'GDPR compliant',
    ],
    forbiddenSchemaTypes: ['Review', 'AggregateRating'],
    privateRoutePrefixes: ['/answerlattice/', '/api/', '/widget/', '/signin', '/unauthorized'],
} as const;
