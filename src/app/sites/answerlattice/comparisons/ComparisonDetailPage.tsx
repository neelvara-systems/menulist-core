import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import { getAnswerlatticeComparison } from '../publicContent';

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AnswerlatticeComparisonDetailPage({ comparisonPath }: { comparisonPath: string }) {
    const basePath = getBasePath();
    const comparison = getAnswerlatticeComparison(comparisonPath);

    if (!comparison) {
        return null;
    }

    return (
        <>
            <AnswerlatticePageStructuredData path={comparison.path} />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">
                        {comparison.eyebrow}
                    </p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        {comparison.heroTitle}
                    </h1>
                    <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">
                        {comparison.heroDescription}
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            data-answerlattice-event="comparison_demo_clicked"
                            data-answerlattice-label={comparison.title}
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >
                            See page-aware demo
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/comparisons"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            Back to comparisons
                        </AnswerlatticeLink>
                    </div>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'Claim scope', value: 'Category comparison, not vendor ranking' },
                            { label: 'Answer path', value: 'Approved answers before fallback' },
                            { label: 'Boundary', value: 'No fake ratings, logos, or guaranteed outcomes' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
                        <article className="rounded-[1.5rem] border border-teal-300/20 bg-teal-400/[0.055] p-6">
                            <h2 className="text-2xl font-semibold text-white">Choose AnswerLattice when</h2>
                            <ul className="mt-5 space-y-3">
                                {comparison.answerlatticeFit.map((item) => (
                                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#d6d6ef]">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                        <article className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-6">
                            <h2 className="text-2xl font-semibold text-white">Choose another tool when</h2>
                            <ul className="mt-5 space-y-3">
                                {comparison.otherFit.map((item) => (
                                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#a0a0c0]">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b6b8a]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="Decision table"
                            title="Compare by operating model, not by hype."
                            description="The useful question is where the source of authority lives: a chat response, a ticket queue, a document page, or a reviewed support knowledge layer."
                        />
                        <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.06]">
                            <div className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-white/[0.06] bg-white/[0.04] text-xs font-semibold uppercase tracking-widest text-[#a0a0c0]">
                                <div className="p-4">Question</div>
                                <div className="border-l border-white/[0.06] p-4">Conventional path</div>
                                <div className="border-l border-white/[0.06] p-4 text-teal-200">AnswerLattice path</div>
                            </div>
                            {comparison.tableRows.map((row) => (
                                <div key={row.label} className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-white/[0.06] last:border-b-0">
                                    <div className="p-4 text-sm font-semibold text-white">{row.label}</div>
                                    <div className="border-l border-white/[0.06] p-4 text-sm leading-relaxed text-[#a0a0c0]">{row.conventional}</div>
                                    <div className="border-l border-white/[0.06] p-4 text-sm leading-relaxed text-[#d6d6ef]">{row.answerlattice}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-4xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="FAQ"
                            title="What this comparison does and does not claim."
                        />
                        <div className="space-y-4">
                            {comparison.faq.map((item) => (
                                <article key={item.question} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                    <h2 className="text-lg font-semibold text-white">{item.question}</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{item.answer}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
