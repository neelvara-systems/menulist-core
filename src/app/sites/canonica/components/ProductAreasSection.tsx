import { CANONICA_PRODUCT_AREAS } from '../productAreas';
import CanonicaLink from './CanonicaLink';

const AREA_PROOF: Record<string, string> = {
    'Launch Setup': 'Workspace, product profile, starter knowledge, surfaces, widget key, and activation readiness.',
    'Page-Aware Widget': 'Safe page context, allowed origins, blocked routes, hosted help, and approved answers before fallback.',
    'Support Control': 'Docs, FAQ, changelog, tickets, conversations, and weekly review output from one support layer.',
    'Knowledge Governance': 'Ontology, canonical answers, drift, signal mutation, coverage, and trust/readiness metrics.',
};

export default function ProductAreasSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-t border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.10),transparent_36%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                            Product areas
                        </p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                            Explore Canonica the way buyers evaluate it.
                        </h2>
                    </div>
                    <p className="text-base leading-relaxed text-[#a0a0c0]">
                        Like a real product suite, each Canonica capability has its own job and its own page. Start with setup, understand the widget, then evaluate support control and governance.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {CANONICA_PRODUCT_AREAS.map((area, index) => (
                        <CanonicaLink
                            key={area.href}
                            basePath={basePath}
                            href={area.href}
                            className={`group rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-indigo-400/30 hover:bg-indigo-500/[0.055] ${
                                index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                            }`}
                        >
                            <div className="mb-8 flex items-center justify-between gap-4">
                                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#8f8faa]">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="text-xs font-semibold text-indigo-300 transition group-hover:text-white">
                                    View
                                </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white">{area.label}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{area.description}</p>
                            <p className="mt-6 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-[#6f6f90]">
                                {AREA_PROOF[area.label]}
                            </p>
                        </CanonicaLink>
                    ))}
                </div>
            </div>
        </section>
    );
}
