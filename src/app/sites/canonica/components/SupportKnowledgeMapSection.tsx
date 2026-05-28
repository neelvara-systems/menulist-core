import CanonicaLogoMark from './CanonicaLogoMark';
import SectionHeader from './SectionHeader';

type SupportKnowledgeMapSectionProps = {
    context?: 'home' | 'product';
};

const SOURCE_INPUTS = [
    {
        label: 'What you add',
        detail: 'Docs, FAQs, custom Q&A, changelogs, tickets, setup notes, and common answers.',
    },
    {
        label: 'Where users ask',
        detail: 'Billing, onboarding, settings, integrations, releases, and error screens.',
    },
    {
        label: 'What users get',
        detail: 'Approved page-aware answers, owner Q&A, related help, or a ticket path.',
    },
];

const OUTPUT_SURFACES = [
    {
        label: 'What you review',
        detail: 'Missed questions, stale answers, and draft improvements.',
    },
    {
        label: 'Hosted help and owner answers',
        detail: 'Public docs, FAQs, release notes, custom Q&A, and approved answers stay connected.',
    },
    {
        label: 'Review and approval queue',
        detail: 'Signals become human-reviewed improvements instead of silent support debt.',
    },
];

const MOBILE_INPUT_PATH = 'M180 305 C180 332 180 354 180 382';
const MOBILE_OUTPUT_PATH = 'M180 432 C180 468 180 528 180 573';

export default function SupportKnowledgeMapSection({
    context = 'home',
}: SupportKnowledgeMapSectionProps) {
    const isProduct = context === 'product';

    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    className="mb-12"
                    eyebrow="Support knowledge map"
                    title={isProduct
                        ? 'One governed source behind every support surface.'
                        : 'Turn your existing notes into support users can trust.'}
                    description="Add docs, FAQs, custom Q&A, release notes, setup guides, and common answers. Canonica connects them to the pages where users ask for help, then serves approved canonical or owner answers before fallback."
                />

                <div className="cn-support-map" data-canonica-reveal>
                    <svg className="cn-support-map__paths cn-support-map__paths--desktop" viewBox="0 0 1000 420" aria-hidden="true" focusable="false">
                        <path className="cn-support-map__path" d="M344 122 C396 122 408 210 461 210" />
                        <path className="cn-support-map__path" d="M344 232 C390 232 408 210 461 210" />
                        <path className="cn-support-map__path" d="M344 343 C396 343 408 210 461 210" />
                        <path className="cn-support-map__path" d="M539 210 C592 210 650 122 720 122" />
                        <path className="cn-support-map__path" d="M539 210 C592 210 656 232 720 232" />
                        <path className="cn-support-map__path" d="M539 210 C592 210 650 343 720 343" />
                        <path className="cn-map-pulse cn-map-pulse-delay-0" pathLength={1} d="M344 122 C396 122 408 210 461 210" />
                        <path className="cn-map-pulse cn-map-pulse-delay-1" pathLength={1} d="M344 232 C390 232 408 210 461 210" />
                        <path className="cn-map-pulse cn-map-pulse-delay-2" pathLength={1} d="M344 343 C396 343 408 210 461 210" />
                        <path className="cn-map-pulse cn-map-pulse-output-0" pathLength={1} d="M539 210 C592 210 650 122 720 122" />
                        <path className="cn-map-pulse cn-map-pulse-output-1" pathLength={1} d="M539 210 C592 210 656 232 720 232" />
                        <path className="cn-map-pulse cn-map-pulse-output-2" pathLength={1} d="M539 210 C592 210 650 343 720 343" />
                    </svg>
                    <svg className="cn-support-map__paths cn-support-map__paths--mobile" viewBox="0 0 360 780" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                        <path className="cn-support-map__path" d={MOBILE_INPUT_PATH} />
                        <path className="cn-support-map__path" d={MOBILE_OUTPUT_PATH} />
                        <path className="cn-map-pulse cn-map-pulse-delay-1" pathLength={1} d={MOBILE_INPUT_PATH} />
                        <path className="cn-map-pulse cn-map-pulse-output-1" pathLength={1} d={MOBILE_OUTPUT_PATH} />
                    </svg>

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

                    <div className="cn-support-map__center" aria-label="Canonica support layer">
                        <div className="cn-support-map__core">
                            <span className="cn-support-map__ring cn-support-map__ring--outer" />
                            <span className="cn-support-map__ring cn-support-map__ring--inner" />
                            <div className="cn-support-map__mark">
                                <CanonicaLogoMark height={42} idPrefix={`cn-support-map-${context}`} />
                            </div>
                        </div>
                    </div>

                    <div className="cn-support-map__column" aria-label="Support surfaces and governance outputs">
                        <div className="cn-support-map__label">Outputs</div>
                        {OUTPUT_SURFACES.map((item, index) => (
                            <article key={item.label} className={`cn-support-map__card cn-support-map__card--output cn-map-destination-pulse cn-map-card-output-arrival-${index}`}>
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
                        ['Not an autopilot', 'Drafts and improvements require review before becoming official.'],
                        ['Not a static docs site', 'Answers stay tied to app pages, releases, and support gaps.'],
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
