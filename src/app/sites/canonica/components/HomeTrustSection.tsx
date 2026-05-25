import { CanonicaStatusBoard } from './CanonicaProofBlocks';

const TRUST_CONTROLS = [
    {
        status: 'allowed origin',
        title: 'Run only on approved domains',
        detail: 'Owners decide which product domains can load widget config.',
        tone: 'good' as const,
        rows: [['source', 'workspace config']] as Array<[string, string]>,
    },
    {
        status: 'blocked route',
        title: 'Hide support from sensitive screens',
        detail: 'Payment, auth, admin, and other private routes can suppress the launcher.',
        tone: 'neutral' as const,
        rows: [['launcher', 'hidden when unsafe']] as Array<[string, string]>,
    },
    {
        status: 'safe context',
        title: 'Send page hints, not secrets',
        detail: 'Use page, feature, workflow, role, and plan names for relevance.',
        tone: 'good' as const,
        rows: [['never send', 'tokens or cards']] as Array<[string, string]>,
    },
    {
        status: 'review first',
        title: 'Keep approval before authority',
        detail: 'Drafts and improvements stay reviewable before they become official answers.',
        tone: 'good' as const,
        rows: [['official answer', 'owner approved']] as Array<[string, string]>,
    },
    {
        status: 'compiled',
        title: 'Serve approved context from bundles',
        detail: 'Ready widget context can load from versioned, public-safe bundles instead of repeated database scans.',
        tone: 'good' as const,
        rows: [['runtime path', 'cache first']] as Array<[string, string]>,
    },
    {
        status: 'fallback',
        title: 'Unknown questions become gaps',
        detail: 'Ticket fallback and feedback become support gaps instead of hidden chat noise.',
        tone: 'caution' as const,
        rows: [['next step', 'review queue']] as Array<[string, string]>,
    },
    {
        status: 'workspace scope',
        title: 'Product data stays separated',
        detail: 'Canonica keeps product, workspace, and user boundaries separate from MenuList and client products.',
        tone: 'neutral' as const,
        rows: [['boundary', 'Canonica workspace']] as Array<[string, string]>,
    },
];

export default function HomeTrustSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <div className="mb-10 max-w-3xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Security at a glance</p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl">Safe page context, not secret data.</h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica only needs safe context like page, feature, workflow, plan, or role. Approved runtime context can be served from compiled bundles, while secrets, tokens, card data, private customer records, and unrelated personal data stay out.
                    </p>
                </div>
                <CanonicaStatusBoard items={TRUST_CONTROLS} />
            </div>
        </section>
    );
}
