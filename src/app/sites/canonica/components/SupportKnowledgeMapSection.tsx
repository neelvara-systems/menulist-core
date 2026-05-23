import CanonicaLogoMark from './CanonicaLogoMark';

type SupportKnowledgeMapSectionProps = {
    context?: 'home' | 'product';
};

const SOURCE_INPUTS = [
    {
        label: 'Docs and FAQs',
        detail: 'Starter help content, short answers, and product explanations.',
    },
    {
        label: 'Releases and product pages',
        detail: 'Changelog entries plus safe route, workflow, plan, and role context.',
    },
    {
        label: 'Tickets and feedback',
        detail: 'Fallback cases, repeated misses, low-confidence answers, and user signals.',
    },
];

const OUTPUT_SURFACES = [
    {
        label: 'Page-aware widget',
        detail: 'Users get support that matches the exact product surface they are on.',
    },
    {
        label: 'Hosted help and approved answers',
        detail: 'Public docs, FAQs, release notes, and canonical answers stay connected.',
    },
    {
        label: 'Review and governance queue',
        detail: 'Signals become human-reviewed improvements instead of silent support debt.',
    },
];

export default function SupportKnowledgeMapSection({
    context = 'home',
}: SupportKnowledgeMapSectionProps) {
    const isProduct = context === 'product';

    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-12 max-w-3xl text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Support knowledge map
                    </p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                        {isProduct
                            ? 'One governed source behind every support surface.'
                            : 'Product knowledge goes in. Accurate support comes out.'}
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                        Canonica connects product knowledge, page context, fallback tickets, and feedback into one control plane. The output is not another disconnected help widget; it is reviewed support truth across the places users ask for help.
                    </p>
                </div>

                <div className="cn-support-map" data-canonica-reveal>
                    <div className="cn-support-map__column" aria-label="Support knowledge inputs">
                        <div className="cn-support-map__label">Inputs</div>
                        {SOURCE_INPUTS.map((item) => (
                            <article key={item.label} className="cn-support-map__card">
                                <span className="cn-support-map__card-dot" aria-hidden="true" />
                                <div>
                                    <h3>{item.label}</h3>
                                    <p>{item.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="cn-support-map__center" aria-label="Canonica support knowledge control plane">
                        <div className="cn-support-map__core">
                            <div className="cn-support-map__mark">
                                <CanonicaLogoMark height={38} idPrefix={`cn-support-map-${context}`} />
                            </div>
                            <div>
                                <p>Canonica</p>
                                <h3>Support Knowledge Control Plane</h3>
                                <span>Canonical-first. Human-approved. Drift-aware.</span>
                            </div>
                        </div>
                    </div>

                    <div className="cn-support-map__column" aria-label="Support surfaces and governance outputs">
                        <div className="cn-support-map__label">Outputs</div>
                        {OUTPUT_SURFACES.map((item) => (
                            <article key={item.label} className="cn-support-map__card cn-support-map__card--output">
                                <span className="cn-support-map__card-dot" aria-hidden="true" />
                                <div>
                                    <h3>{item.label}</h3>
                                    <p>{item.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="mx-auto mt-8 grid max-w-5xl gap-3 text-sm text-[#8f8faa] md:grid-cols-3">
                    {[
                        ['Not a helpdesk replacement', 'Tickets stay fallback and signals, not the center of the product.'],
                        ['Not an autopilot', 'Drafts and mutation proposals require review before becoming authoritative.'],
                        ['Not a static docs site', 'Answers stay tied to product surfaces, releases, and support gaps.'],
                    ].map(([title, detail]) => (
                        <article key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                            <h3 className="font-semibold text-white">{title}</h3>
                            <p className="mt-2 leading-relaxed">{detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
