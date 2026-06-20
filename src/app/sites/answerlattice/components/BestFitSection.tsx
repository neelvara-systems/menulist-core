import { AnswerlatticeDecisionGrid } from './AnswerlatticeProofBlocks';
import SectionHeader from './SectionHeader';

const FIT_DECISIONS = [
    {
        title: 'Live or launch-ready product',
        detail: 'Your SaaS app or digital product is live, in beta, or close to launch, and the key user flows need clear support.',
        label: 'fit',
        tone: 'good' as const,
    },
    {
        title: 'Expected support questions',
        detail: 'You already see recurring questions, or you can predict the setup, billing, onboarding, settings, release, or error questions users will ask.',
        label: 'fit',
        tone: 'good' as const,
    },
    {
        title: 'Changing knowledge',
        detail: 'Docs, FAQs, changelogs, setup notes, or support answers exist, but they are scattered or stale.',
        label: 'fit',
        tone: 'good' as const,
    },
    {
        title: 'Review before users see it',
        detail: 'You want in-app AI help, but official answers still need owner approval.',
        label: 'fit',
        tone: 'good' as const,
    },
    {
        title: 'Helpdesk replacement',
        detail: 'AnswerLattice does not replace a full human inbox, agent routing system, or helpdesk workflow suite.',
        label: 'not fit',
        tone: 'caution' as const,
    },
    {
        title: 'No support source yet',
        detail: 'A product with no working app, launch path, docs, notes, screenshots, FAQs, or starter knowledge has nothing useful to govern yet.',
        label: 'not fit',
        tone: 'caution' as const,
    },
    {
        title: 'Auto-publish expectations',
        detail: 'Generated answers should not become official without review.',
        label: 'not fit',
        tone: 'caution' as const,
    },
    {
        title: 'One-off questions only',
        detail: 'If the same issues never repeat, an answer layer is heavier than the problem.',
        label: 'maybe later',
        tone: 'neutral' as const,
    },
];

export default function BestFitSection() {
    return (
        <section className="px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Best fit"
                    title="Best for founders preparing support early."
                    description="AnswerLattice fits live, beta, and near-launch SaaS apps where users need clear help for billing, onboarding, settings, integrations, releases, or errors."
                />
                <AnswerlatticeDecisionGrid items={FIT_DECISIONS} />
            </div>
        </section>
    );
}
