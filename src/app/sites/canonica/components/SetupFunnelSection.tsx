import { CanonicaSequenceDiagram } from './CanonicaFlowDiagram';

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
        title: 'Import FAQs, docs, changelogs, or common answers',
        detail: 'Use the material you already have instead of building a blank help center.',
        outcome: 'Knowledge seeded',
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
        <section className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">First-session setup</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                            Set up the first support layer in one session.
                        </h2>
                    </div>
                    <p className="text-base leading-relaxed text-[#a0a0c0]">
                        The setup flow stays founder-friendly: add the app, pick the important pages, import what exists, install the widget, then review what users should see first.
                    </p>
                </div>
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
