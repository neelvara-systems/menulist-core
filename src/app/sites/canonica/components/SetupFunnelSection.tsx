const SETUP_STEPS = [
    ['01', 'Sign in with Google', 'Create the Canonica account without a sales call.'],
    ['02', 'Add company and product name', 'Canonica creates the workspace and product account bridge.'],
    ['03', 'Choose support-heavy pages', 'Start with billing, onboarding, settings, team, release, or integration screens.'],
    ['04', 'Import starter knowledge', 'Use docs, FAQs, release notes, setup guides, and common support answers.'],
    ['05', 'Copy one widget script', 'Install the script and keep the raw widget key safe after it is shown once.'],
    ['06', 'Verify install', 'Allowed origins, blocked routes, hosted help domain, and page context are checked from the dashboard.'],
    ['07', 'Review approved answers', 'Drafts and support gaps become owner-reviewed canonical answers, not auto-published truth.'],
];

export default function SetupFunnelSection() {
    return (
        <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
            <div className="mx-auto max-w-6xl">
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
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
                    {SETUP_STEPS.map(([number, title, detail]) => (
                        <article key={number} className="rounded-2xl border border-white/[0.06] bg-[#101028] p-4">
                            <div className="mb-4 inline-flex rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-300">
                                {number}
                            </div>
                            <h3 className="text-sm font-semibold text-white">{title}</h3>
                            <p className="mt-2 text-xs leading-relaxed text-[#808099]">{detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
