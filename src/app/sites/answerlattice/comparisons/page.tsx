import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import { ANSWERLATTICE_COMPARISONS } from '../publicContent';

export const metadata: Metadata = {
    title: 'Comparisons',
    description: 'Category comparisons for AnswerLattice against generic chatbots, helpdesks, and knowledge bases, with scoped claims and no unsupported competitor rankings.',
    alternates: { canonical: '/comparisons' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AnswerlatticeComparisonsPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/comparisons" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Comparisons</p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Compare support tools by where answer authority lives.
                    </h1>
                    <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">
                        AnswerLattice comparisons stay category-level and source-backed. They explain where AnswerLattice fits without ranking vendors, inventing review scores, or promising guaranteed outcomes.
                    </p>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'No fake ratings', value: 'No Review or AggregateRating schema' },
                            { label: 'No vendor claims', value: 'Generic category comparisons only' },
                            { label: 'Core boundary', value: 'Support knowledge layer, not helpdesk replacement' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="Comparison library"
                            title="Start with the category you are evaluating."
                            description="Each page keeps the same lens: approved answers, page-aware context, fallback, reviewable support gaps, and human-reviewed answer changes."
                        />
                        <div className="grid gap-4 md:grid-cols-3">
                            {ANSWERLATTICE_COMPARISONS.map((comparison) => (
                                <AnswerlatticeLink
                                    key={comparison.path}
                                    basePath={basePath}
                                    href={comparison.path}
                                    data-answerlattice-event="comparison_page_clicked"
                                    data-answerlattice-label={comparison.title}
                                    className="flex min-h-[18rem] flex-col justify-between rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-6 transition hover:border-teal-300/25 hover:bg-teal-400/[0.045]"
                                >
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-200">{comparison.eyebrow}</p>
                                        <h2 className="text-2xl font-semibold leading-tight text-white">{comparison.title}</h2>
                                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">{comparison.metaDescription}</p>
                                    </div>
                                    <span className="mt-6 text-sm font-semibold text-teal-200">Open comparison</span>
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
