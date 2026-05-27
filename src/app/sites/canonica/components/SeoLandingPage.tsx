import { CANONICA_PRODUCT_AREAS } from '../productAreas';
import { CanonicaHubDiagram, CanonicaSequenceDiagram } from './CanonicaFlowDiagram';
import CanonicaLink from './CanonicaLink';
import CanonicaPageStructuredData from './PageStructuredData';

export type SeoLandingPageProps = {
    eyebrow: string;
    title: string;
    description: string;
    problem: string;
    question: string;
    genericAnswer: string;
    canonicaAnswer: string;
    ownerReview: string;
    setupSteps: string[];
    primaryCta: string;
    secondaryCta?: string;
    basePath?: string;
    canonicalPath?: string;
};

export default function SeoLandingPage({
    eyebrow,
    title,
    description,
    problem,
    question,
    genericAnswer,
    canonicaAnswer,
    ownerReview,
    setupSteps,
    primaryCta,
    secondaryCta,
    basePath = '',
    canonicalPath,
}: SeoLandingPageProps) {
    const diagramId = `cn-seo-${(canonicalPath || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    return (
        <main className="pt-16">
            {canonicalPath ? <CanonicaPageStructuredData path={canonicalPath} /> : null}
            <section className="px-6 py-24 text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">{eyebrow}</p>
                <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">{description}</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        data-canonica-event="seo_page_cta_clicked"
                        data-canonica-label={secondaryCta || 'try_demo'}
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        {secondaryCta || 'Try page-aware demo'}
                    </CanonicaLink>
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        data-canonica-event="seo_page_cta_clicked"
                        data-canonica-label={primaryCta}
                        className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                    >
                        {primaryCta}
                    </CanonicaLink>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Question flow</p>
                            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{question}</h2>
                        </div>
                        <p className="text-base leading-relaxed text-[#a0a0c0]">
                            Canonica turns a generic support gap into a reviewed answer that matches the current product page.
                        </p>
                    </div>
                    <CanonicaHubDiagram
                        idPrefix={`${diagramId}-question`}
                        inputLabel="Before Canonica"
                        outputLabel="Reviewed output"
                        inputs={[
                            {
                                title: 'Problem',
                                detail: problem,
                            },
                            {
                                title: 'Generic answer',
                                detail: genericAnswer,
                            },
                        ]}
                        outputs={[
                            {
                                title: 'Canonica answer',
                                detail: canonicaAnswer,
                            },
                            {
                                title: 'Owner review',
                                detail: ownerReview,
                            },
                        ]}
                    />
                </div>
            </section>

            <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-10 max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Setup path</p>
                        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Approved knowledge stays the authority.</h2>
                        <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">{ownerReview}</p>
                    </div>
                    <CanonicaSequenceDiagram
                        idPrefix={`${diagramId}-setup`}
                        splitAfter={Math.ceil(setupSteps.length / 2)}
                        items={setupSteps.map((step, index) => ({
                            title: `Step ${index + 1}`,
                            detail: step,
                        }))}
                    />
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8 max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Explore Canonica</p>
                        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                            The same loop across setup, widget, support, and governance.
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">
                            Each product area has a dedicated page so founders, support teams, product teams, and engineers can evaluate the part they care about first.
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {CANONICA_PRODUCT_AREAS.map((area) => (
                            <CanonicaLink
                                key={area.href}
                                basePath={basePath}
                                href={area.href}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-teal-300/25 hover:bg-teal-500/[0.04]"
                            >
                                <h3 className="text-base font-semibold text-white">{area.label}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{area.description}</p>
                            </CanonicaLink>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
