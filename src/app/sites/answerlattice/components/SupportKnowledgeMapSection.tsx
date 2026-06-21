import AnswerlatticeLogoMark from './AnswerlatticeLogoMark';
import SectionHeader from './SectionHeader';

type SupportKnowledgeMapSectionProps = {
    context?: 'home' | 'product';
};

const SOURCE_INPUTS = [
    {
        label: 'What you add',
        detail: 'Scattered product links, docs, files, tickets, FAQs, custom owner answers, changelogs, screenshots, short recordings, notes, and common answers.',
    },
    {
        label: 'Where users ask',
        detail: 'Billing, onboarding, settings, integrations, releases, and error screens.',
    },
    {
        label: 'What users get',
        detail: 'Approved answers, owner answers, related help, or a ticket path.',
    },
];

const OUTPUT_SURFACES = [
    {
        label: 'What you review',
        detail: 'Missed questions, stale answers, and draft improvements.',
    },
    {
        label: 'Hosted help and owner answers',
        detail: 'Public docs, FAQs, release notes, custom owner answers, and approved answers come from structured support knowledge.',
    },
    {
        label: 'Review and approval queue',
        detail: 'Signals become human-reviewed improvements instead of silent support debt.',
    },
];

const CORE_SIGNALS = ['Approved first', 'Fallback tracked', 'Review loop'];

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
                        ? 'One reviewed source behind every support surface.'
                        : 'Turn sources, app screens, and support answers into one map.'}
                    description="Add the product knowledge already scattered across public pages, docs, files, tickets, FAQs, custom owner answers, release notes, screenshots, short support recordings, notes, and common answers. AnswerLattice maps it to the pages where users ask for help, then serves approved answers or owner answers before fallback."
                />

                <div className="al-support-map" data-answerlattice-reveal>
                    <svg className="al-support-map__paths al-support-map__paths--desktop" viewBox="0 0 1000 420" aria-hidden="true" focusable="false">
                        <path className="al-support-map__path" d="M344 122 C396 122 408 210 461 210" />
                        <path className="al-support-map__path" d="M344 232 C390 232 408 210 461 210" />
                        <path className="al-support-map__path" d="M344 343 C396 343 408 210 461 210" />
                        <path className="al-support-map__path" d="M539 210 C592 210 650 122 720 122" />
                        <path className="al-support-map__path" d="M539 210 C592 210 656 232 720 232" />
                        <path className="al-support-map__path" d="M539 210 C592 210 650 343 720 343" />
                        <path className="al-map-pulse al-map-pulse-delay-0" pathLength={1} d="M344 122 C396 122 408 210 461 210" />
                        <path className="al-map-pulse al-map-pulse-delay-1" pathLength={1} d="M344 232 C390 232 408 210 461 210" />
                        <path className="al-map-pulse al-map-pulse-delay-2" pathLength={1} d="M344 343 C396 343 408 210 461 210" />
                        <path className="al-map-pulse al-map-pulse-output-0" pathLength={1} d="M539 210 C592 210 650 122 720 122" />
                        <path className="al-map-pulse al-map-pulse-output-1" pathLength={1} d="M539 210 C592 210 656 232 720 232" />
                        <path className="al-map-pulse al-map-pulse-output-2" pathLength={1} d="M539 210 C592 210 650 343 720 343" />
                    </svg>
                    <svg className="al-support-map__paths al-support-map__paths--mobile" viewBox="0 0 360 780" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                        <path className="al-support-map__path" d={MOBILE_INPUT_PATH} />
                        <path className="al-support-map__path" d={MOBILE_OUTPUT_PATH} />
                        <path className="al-map-pulse al-map-pulse-delay-1" pathLength={1} d={MOBILE_INPUT_PATH} />
                        <path className="al-map-pulse al-map-pulse-output-1" pathLength={1} d={MOBILE_OUTPUT_PATH} />
                    </svg>

                    <div className="al-support-map__column" aria-label="Support knowledge inputs">
                        <div className="al-support-map__label">Inputs</div>
                        {SOURCE_INPUTS.map((item) => (
                            <article key={item.label} className="al-support-map__card">
                                <span className="al-support-map__card-dot" aria-hidden="true" />
                                <div>
                                    <h3>{item.label}</h3>
                                    <p>{item.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="al-support-map__center" aria-label="AnswerLattice support layer">
                        <div className="al-support-map__core">
                            <span className="al-support-map__ring al-support-map__ring--outer" />
                            <div className="al-support-map__mark">
                                <AnswerlatticeLogoMark height={42} idPrefix={`al-support-map-${context}`} />
                            </div>
                        </div>
                        <div className="al-support-map__core-copy">
                            <strong>Reviewed support layer</strong>
                            <div>
                                {CORE_SIGNALS.map((signal) => (
                                    <span key={signal}>{signal}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="al-support-map__column" aria-label="Support surfaces and review outputs">
                        <div className="al-support-map__label">Outputs</div>
                        {OUTPUT_SURFACES.map((item, index) => (
                            <article key={item.label} className={`al-support-map__card al-support-map__card--output al-map-destination-pulse al-map-card-output-arrival-${index}`}>
                                <span className="al-support-map__card-dot" aria-hidden="true" />
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
                        ['Not a static docs site', 'Answers stay tied to product pages, releases, and support gaps.'],
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
