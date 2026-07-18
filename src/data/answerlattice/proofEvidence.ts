export type AnswerlatticeProofExample = Readonly<{
    id: string;
    label: string;
    title: string;
    situation: string;
    answerlattice: string;
    outcome: string;
}>;

export type AnswerlatticeVerifiedProofEntry = Readonly<{
    id: string;
    publicLabel: string;
    verifiedOn: string;
    consentGrantedOn: string;
    consentScope: 'anonymous' | 'named';
    situation: string;
    answerlattice: string;
    outcome: string;
    measurementMethod: string;
    evidenceSummary: string;
    approvedClaims: string[];
    sourceRef: string;
}>;

export const ANSWERLATTICE_PROOF_EXAMPLES: AnswerlatticeProofExample[] = [
    {
        id: 'solo-saas-launch',
        label: 'Example - solo SaaS launch',
        title: 'Billing and onboarding repeat questions',
        situation: 'A founder ships an AI-built app with no support team. Early users repeat invoice, import, and invite questions.',
        answerlattice: 'Map billing, onboarding, and team settings surfaces. Import starter FAQs, support macros, and repeated replies. Install the widget and verify context.',
        outcome: 'Known questions receive approved answers. Missing answers become review work instead of disappearing into chat history.',
    },
    {
        id: 'release-heavy-product',
        label: 'Example - release-heavy product',
        title: 'Usage limit changes after a launch',
        situation: 'A product changes limits and users ask from billing, usage, and release pages why behavior changed.',
        answerlattice: 'Turn changelog entries into affected surfaces, FAQs, and approved-answer review work. Let stale answers and repeated misses surface review items.',
        outcome: 'The owner sees where support needs review after the release and can approve updated answers before they become official.',
    },
    {
        id: 'studio-workload',
        label: 'Example - studio workload',
        title: 'Multiple small apps need the same support pattern',
        situation: 'A studio launches several SaaS apps and needs repeatable install, surface templates, and safety controls.',
        answerlattice: 'Reuse quickstarts, starter templates, allowed origins, blocked routes, import packs, and the install verifier for each workspace.',
        outcome: 'Each product gets its own scoped support layer without hardcoded client assumptions or shared tenant leakage.',
    },
];

// Add entries only after evidence review and explicit public-use consent.
const VERIFIED_PROOF_ENTRIES: AnswerlatticeVerifiedProofEntry[] = [];

const isIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const isCompleteAnswerlatticeVerifiedProofEntry = (
    entry: AnswerlatticeVerifiedProofEntry,
): boolean => (
    Boolean(entry.id.trim())
    && Boolean(entry.publicLabel.trim())
    && isIsoDate(entry.verifiedOn)
    && isIsoDate(entry.consentGrantedOn)
    && Boolean(entry.situation.trim())
    && Boolean(entry.answerlattice.trim())
    && Boolean(entry.outcome.trim())
    && Boolean(entry.measurementMethod.trim())
    && Boolean(entry.evidenceSummary.trim())
    && entry.approvedClaims.length > 0
    && entry.approvedClaims.every(claim => Boolean(claim.trim()))
    && Boolean(entry.sourceRef.trim())
);

export const getAnswerlatticeVerifiedProofEntries = (): AnswerlatticeVerifiedProofEntry[] => (
    VERIFIED_PROOF_ENTRIES.filter(isCompleteAnswerlatticeVerifiedProofEntry)
);
