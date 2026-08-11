'use client';

import { useState } from 'react';
import { ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS } from '../answerlatticeWebsiteAssets';
import AnswerlatticeAssetImage from './AnswerlatticeAssetImage';
import SectionHeader from './SectionHeader';

type PreviewTab = 'Product setup' | 'Key product pages' | 'Widget install' | 'Feedback review' | 'Answer review';

const TABS: PreviewTab[] = ['Product setup', 'Key product pages', 'Widget install', 'Feedback review', 'Answer review'];

const CHAPTER_COPY: Record<PreviewTab, {
    kicker: string;
    title: string;
    description: string;
    proof: string[];
}> = {
    'Product setup': {
        kicker: 'Setup',
        title: 'Start with launch proof.',
        description: 'Show buyers that AnswerLattice begins with product profile, starter knowledge, mapped surfaces, widget verification, review summaries, and signal-source checks.',
        proof: ['Workspace ready', 'Sources in review', 'Proof visible'],
    },
    'Key product pages': {
        kicker: 'Surfaces',
        title: 'Map support to the pages where users ask.',
        description: 'The proof flow should make page context obvious: billing, onboarding, settings, releases, and error states all carry their own support coverage.',
        proof: ['Route aware', 'Coverage visible', 'Gaps ranked'],
    },
    'Widget install': {
        kicker: 'Widget',
        title: 'Keep the runtime controlled.',
        description: 'The install story stays serious: one script, allowed origins, blocked routes, bounded context, and controlled server delivery.',
        proof: ['Origin locked', 'Routes blocked', 'Context bounded'],
    },
    'Feedback review': {
        kicker: 'Signals',
        title: 'Turn user friction into review work.',
        description: 'Feedback is not a public roadmap promise. It stays private, surface-linked, and useful only when the owner chooses what should become support work.',
        proof: ['Private review', 'Board handoff', 'No auto-publish'],
    },
    'Answer review': {
        kicker: 'Review',
        title: 'Approve answers before users see them.',
        description: 'The final chapter reinforces the core doctrine: fallback can create draft improvements, but approved answers stay human-reviewed.',
        proof: ['Approved first', 'Stale answers visible', 'Owner approval'],
    },
};

function ProductPreviewFrame({
    id,
    tab,
}: {
    id: string;
    tab: PreviewTab;
}) {
    const asset = ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS[tab];

    return (
        <div id={id} className="w-full max-w-full rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
            <AnswerlatticeAssetImage
                asset={asset}
                assetSlotId="home.product-overview.feature-cards"
                assetRole={tab}
                className="rounded-[1.5rem] border border-white/[0.08]"
            />
        </div>
    );
}

export default function ProductPreviewSection() {
    const [activeTab, setActiveTab] = useState<PreviewTab>('Product setup');
    const activeChapter = CHAPTER_COPY[activeTab];

    return (
        <section className="al-primary-radial-proof relative border-y border-white/[0.06] px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Product proof"
                    title="Review the support loop before pricing."
                    description="A controlled product preview shows launch proof, mapped product pages, widget install, feedback review, and approved-answer review without turning the buyer journey into a flashy product tour."
                />

                <div className="mx-auto max-w-6xl">
                    <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2" role="tablist" aria-label="AnswerLattice product proof">
                        {TABS.map((tab, index) => {
                            const active = tab === activeTab;
                            const chapter = CHAPTER_COPY[tab];

                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-controls="answerlattice-product-preview"
                                    onClick={() => setActiveTab(tab)}
                                    className={`inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-left text-sm font-semibold transition ${
                                        active
                                            ? 'border-teal-300/35 bg-teal-400/[0.12] text-white shadow-lg shadow-teal-950/20'
                                            : 'border-transparent text-[#8f8faa] hover:border-white/[0.12] hover:bg-white/[0.035] hover:text-white'
                                    }`}
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-200">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span>{chapter.kicker}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-5 grid gap-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-200">{activeChapter.kicker}</div>
                            <h3 className="mt-2 text-xl font-bold leading-tight text-white">{activeChapter.title}</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#a0a0c0]">{activeChapter.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
                            {activeChapter.proof.map((item) => (
                                <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-[#d6d6ef]">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    <ProductPreviewFrame id="answerlattice-product-preview" tab={activeTab} />
                </div>

                    <div className="mt-6 grid gap-3 text-sm text-[#808099] md:grid-cols-3">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                            <div className="font-semibold text-white">Screens are mapped by surfaces</div>
                            <p className="mt-2">Articles, FAQs, changelogs, tickets, and widget answers share reviewed page and workflow context.</p>
                        </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Fallback becomes review work</div>
                        <p className="mt-2">Missed questions become signals and draft improvements instead of disappearing into chat history.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Runtime paths stay cost-aware</div>
                        <p className="mt-2">Compiled context and summaries reduce repeated reads in the real product; this website scene itself uses local tab state and no AnswerLattice data.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
