import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
import { ANSWERLATTICE_SUPPORT_FEATURES } from '../productFeatures';
import AnswerlatticeLink from './AnswerlatticeLink';
import SectionHeader from './SectionHeader';

const AREA_PROOF: Record<string, string> = {
    'Set up support': 'Workspace, team access, product profile, starter knowledge, key product surfaces, widget key, and activation readiness.',
    'In-app help widget': 'Safe page context, allowed origins, blocked routes, hosted help, canonical answers, and owner FAQs before fallback.',
    'Help center and tickets': 'Docs, FAQ, owner-published changelog, ticket fallback, feedback, ratings, feature requests, Support Board, conversations, and weekly review output from one support layer.',
    'Review approved answers': 'Product structure, approved answers, stale-answer review, repeated questions, coverage, and readiness metrics.',
};

export default function ProductAreasSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="al-primary-radial-section border-t border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="What AnswerLattice gives you"
                    title="Support for the parts founders actually need first."
                    description="Start with setup, add the widget, publish help, and review missing answers. The deeper control-plane language stays available after the value is clear."
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {ANSWERLATTICE_PRODUCT_AREAS.map((area, index) => (
                        <AnswerlatticeLink
                            key={area.href}
                            basePath={basePath}
                            href={area.href}
                            className={`group rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-teal-300/30 hover:bg-teal-500/[0.055] ${
                                index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                            }`}
                        >
                            <div className="mb-8 flex items-center justify-between gap-4">
                                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#8f8faa]">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="text-xs font-semibold text-teal-200 transition group-hover:text-white">
                                    View
                                </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white">{area.label}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{area.description}</p>
                            <p className="mt-6 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-[#6f6f90]">
                                {AREA_PROOF[area.label]}
                            </p>
                        </AnswerlatticeLink>
                    ))}
                </div>

                <div className="mt-12 rounded-[1.75rem] border border-white/[0.08] bg-[#09091a]/55 p-5 sm:p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-300">
                                Product features
                            </p>
                            <h3 className="text-2xl font-bold text-white">Feature pages for setup and support operations.</h3>
                        </div>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/product"
                            className="text-sm font-semibold text-teal-200 transition hover:text-white"
                        >
                            View product overview
                        </AnswerlatticeLink>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => (
                            <AnswerlatticeLink
                                key={feature.href}
                                basePath={basePath}
                                href={feature.href}
                                className="al-primary-hover-surface rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition"
                            >
                                <h4 className="text-sm font-semibold text-white">{feature.label}</h4>
                                <p className="mt-2 text-xs leading-relaxed text-[#8f8faa]">{feature.heroBullets[0]}</p>
                            </AnswerlatticeLink>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
