const SETUP_STEPS = [
    {
        number: '01',
        title: 'Sign in with Google',
        detail: 'Create the Canonica account without a sales call.',
        outcome: 'Account created',
        className: 'xl:col-span-5',
    },
    {
        number: '02',
        title: 'Add company and product name',
        detail: 'Canonica creates the workspace and product account bridge.',
        outcome: 'Workspace ready',
        className: 'xl:col-span-3',
    },
    {
        number: '03',
        title: 'Choose support-heavy pages',
        detail: 'Start with billing, onboarding, settings, team, release, or integration screens.',
        outcome: 'Surfaces mapped',
        className: 'xl:col-span-4',
    },
    {
        number: '04',
        title: 'Import starter knowledge',
        detail: 'Use docs, FAQs, release notes, setup guides, and common support answers.',
        outcome: 'Knowledge imported',
        className: 'xl:col-span-3',
    },
    {
        number: '05',
        title: 'Copy one widget script',
        detail: 'Install the script and keep the raw widget key safe after it is shown once.',
        outcome: 'Widget key issued',
        className: 'xl:col-span-3',
    },
    {
        number: '06',
        title: 'Verify install',
        detail: 'Allowed origins, blocked routes, hosted help domain, and page context are checked from the dashboard.',
        outcome: 'Runtime checked',
        className: 'xl:col-span-3',
    },
    {
        number: '07',
        title: 'Review approved answers',
        detail: 'Drafts and support gaps become owner-reviewed canonical answers, not auto-published truth.',
        outcome: 'Truth governed',
        className: 'xl:col-span-3',
    },
];

export default function SetupFunnelSection() {
    return (
        <section className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">10-minute setup path</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                            The first session is a launch checklist, not a configuration maze.
                        </h2>
                    </div>
                    <p className="text-base leading-relaxed text-[#a0a0c0]">
                        Canonica’s self-service flow creates the beta workspace, widget key, product surfaces, and activation command center so founders can see the path from setup to first approved answers.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                    {SETUP_STEPS.map((step) => (
                        <article
                            key={step.number}
                            className={`group relative min-h-[13rem] overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-[#101028] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-[#14142e] ${step.className}`}
                        >
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1eceff]/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div className="inline-flex rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-300">
                                    {step.number}
                                </div>
                                <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#8f8faa]">
                                    {step.outcome}
                                </span>
                            </div>
                            <h3 className="max-w-sm text-lg font-semibold leading-snug text-white">{step.title}</h3>
                            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#9090ad]">{step.detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
