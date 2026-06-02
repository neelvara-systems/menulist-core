import { AnswerlatticeDecisionGrid } from './AnswerlatticeProofBlocks';
import SectionHeader from './SectionHeader';

const FIT_DECISIONS = [
    {
        title: 'Live product',
        detail: 'Your SaaS app or digital product is live or close to launch, and users are already finding confusing screens.',
        label: 'fit',
        tone: 'good' as const,
    },
    {
        title: 'Repeated questions',
        detail: 'The same billing, onboarding, settings, release, or error questions appear more than once.',
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
        title: 'Review before authority',
        detail: 'You want page-aware AI help, but official answers still need owner approval.',
        label: 'fit',
        tone: 'good' as const,
    },
    {
        title: 'Helpdesk replacement',
        detail: 'Answerlattice does not replace a full human inbox, agent routing system, or helpdesk workflow suite.',
        label: 'not fit',
        tone: 'caution' as const,
    },
    {
        title: 'No support source yet',
        detail: 'A product with no live app and no starter knowledge has nothing useful to govern yet.',
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
                    title="Best for founders with real users and repeated questions."
                    description="Answerlattice fits SaaS apps and digital products where users get stuck on billing, onboarding, settings, integrations, releases, or errors."
                />
                <AnswerlatticeDecisionGrid items={FIT_DECISIONS} />
            </div>
        </section>
    );
}
