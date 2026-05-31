import { CanonicaSequenceDiagram } from './CanonicaFlowDiagram';
import SectionHeader from './SectionHeader';

const SETUP_STEPS = [
    {
        number: '01',
        title: 'Add your product',
        detail: 'Create the Canonica workspace with company, product, and support details.',
        outcome: 'Workspace ready',
    },
    {
        number: '02',
        title: 'Pick 2-5 pages where users get stuck',
        detail: 'Start with billing, onboarding, settings, team, release, or integration screens.',
        outcome: 'Pages mapped',
    },
    {
        number: '03',
        title: 'Teach Canonica from links, docs, files, or media',
        detail: 'Use selected public pages, support notes, FAQs, release updates, supported files, screenshots, or short support recordings instead of building a blank help center.',
        outcome: 'Drafts prepared',
    },
    {
        number: '04',
        title: 'Install the widget',
        detail: 'Copy one script, allow your domains, block sensitive routes, and verify page context.',
        outcome: 'Runtime checked',
    },
    {
        number: '05',
        title: 'Review the first approved answers',
        detail: 'Drafts and support gaps stay review work before they become official answers.',
        outcome: 'Answers reviewed',
    },
];

export default function SetupFunnelSection() {
    return (
        <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="First-session setup"
                    title="Set up the first support layer in one session."
                    description="The setup flow stays founder-friendly: add the app, pick the important pages, import what exists, install the widget, then review what users should see first."
                />
                <CanonicaSequenceDiagram
                    idPrefix="cn-setup-funnel"
                    splitAfter={3}
                    items={SETUP_STEPS.map((step) => ({
                        title: step.title,
                        detail: step.detail,
                        meta: step.outcome,
                    }))}
                />
            </div>
        </section>
    );
}
