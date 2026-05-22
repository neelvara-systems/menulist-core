const TRUST_CONTROLS = [
    ['Widget keys stay protected', 'The raw key is shown once; Canonica stores secure lookup data and displays safe prefixes later.'],
    ['Allowed origins restrict runtime', 'Owners decide which product domains can load the widget config.'],
    ['Blocked routes keep sensitive screens clean', 'The widget can be hidden from pages such as billing checkout, admin-only areas, or Canonica help itself.'],
    ['Page context is bounded', 'Context carries route and workflow hints for support relevance, not secrets or trusted identity.'],
    ['Answers become authoritative after review', 'Drafts and mutation proposals stay reviewable before they become canonical answers.'],
    ['Workspace data stays scoped', 'Canonica keeps product, workspace, and user boundaries separate from MenuList and other client products.'],
];

export default function HomeTrustSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <div className="mb-10 max-w-3xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Security at a glance</p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl">Built for controlled support knowledge.</h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        These are the controls that matter during the first install: where the widget runs, what context it receives, and when an answer becomes authoritative.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {TRUST_CONTROLS.map(([title, detail]) => (
                        <article key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <h3 className="text-base font-semibold text-white">{title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-[#808099]">{detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
