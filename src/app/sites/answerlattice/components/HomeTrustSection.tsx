import { AnswerlatticeStatusBoard } from './AnswerlatticeProofBlocks';
import SectionHeader from './SectionHeader';

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
        title: 'Keep approval before users see it',
        detail: 'Drafts and improvements stay reviewable before they become official answers.',
        tone: 'good' as const,
        rows: [['official answer', 'owner approved']] as Array<[string, string]>,
    },
    {
        status: 'bounded intake',
        title: 'Teach from sources without open-ended processing',
        detail: 'Knowledge intake is owner-triggered, capped, and keeps screenshots or media as extracted support text for review.',
        tone: 'neutral' as const,
        rows: [['media work', 'credit logged']] as Array<[string, string]>,
    },
    {
        status: 'compiled',
        title: 'Serve approved context safely',
        detail: 'Enabled readers can use bounded, versioned context while the widget stays on the controlled server path.',
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
        detail: 'AnswerLattice keeps product, workspace, and user boundaries separate for every client product.',
        tone: 'neutral' as const,
        rows: [['boundary', 'AnswerLattice workspace']] as Array<[string, string]>,
    },
];

export default function HomeTrustSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Security at a glance"
                    title="Safe page context, not secret data."
                    description="AnswerLattice only needs safe context like page, feature, workflow, plan, or role. Approved runtime context stays bounded and source-backed, while secrets, tokens, card data, private customer records, and unrelated personal data stay out."
                />
                <AnswerlatticeStatusBoard items={TRUST_CONTROLS} />
            </div>
        </section>
    );
}
