import { AnswerlatticeSequenceDiagram } from './AnswerlatticeFlowDiagram';
import SectionHeader from './SectionHeader';

const STEPS = [
    {
        step: '1',
        title: 'Add product details',
        description: 'Create the workspace, add your product URL, support email, billing model, and the core app pages users ask about.',
        visual: '{ }',
    },
    {
        step: '2',
        title: 'Import starter knowledge',
        description: 'Upload docs, starter articles, FAQs, and repeated owner Q&A. Answerlattice keeps support working through fallback while it prepares governed answer and FAQ drafts.',
        visual: '✓',
    },
    {
        step: '3',
        title: 'Review approved answers',
        description: 'Answer drafts and product-structure candidates go to the review queue. Nothing becomes official without owner approval.',
        visual: '→',
    },
    {
        step: '4',
        title: 'Install page-aware support',
        description: 'Embed the widget, lock allowed origins, block sensitive routes, publish hosted help if needed, and pass route context so billing, onboarding, and settings pages get relevant help.',
        visual: '⚡',
    },
    {
        step: '5',
        title: 'Improve from support gaps',
        description: 'Repeated fallback, tickets, negative feedback, and private board notes become signal-to-knowledge tasks you can review each week.',
        visual: '↻',
    },
];

export default function HowItWorksSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    className="mb-16"
                    eyebrow="How it works"
                    title="Launch support without building a support team"
                />

                <AnswerlatticeSequenceDiagram
                    idPrefix="al-how-it-works"
                    splitAfter={3}
                    items={STEPS.map((item) => ({
                        title: item.title,
                        detail: item.description,
                    }))}
                />
            </div>
        </section>
    );
}
