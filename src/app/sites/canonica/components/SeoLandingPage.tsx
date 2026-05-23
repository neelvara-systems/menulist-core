import { CANONICA_PRODUCT_AREAS } from '../productAreas';
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
    return (
        <main className="pt-16">
            {canonicalPath ? <CanonicaPageStructuredData path={canonicalPath} /> : null}
            <section className="px-6 py-24 text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">{eyebrow}</p>
                <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">{description}</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        data-canonica-event="seo_page_cta_clicked"
                        data-canonica-label={primaryCta}
                        className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
                    >
                        {primaryCta}
                    </CanonicaLink>
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        data-canonica-event="seo_page_cta_clicked"
                        data-canonica-label={secondaryCta || 'try_demo'}
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        {secondaryCta || 'Try page-aware demo'}
                    </CanonicaLink>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Problem</p>
                        <h2 className="text-2xl font-semibold text-white">Why this breaks for small SaaS teams</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">{problem}</p>
                    </article>
                    <article className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-300">Example question</p>
                        <h2 className="text-2xl font-semibold text-white">{question}</h2>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Generic answer</div>
                                <p className="text-sm leading-relaxed text-[#a0a0c0]">{genericAnswer}</p>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-white p-4 text-[#1a1a2e]">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">Canonica answer</div>
                                <p className="text-sm leading-relaxed text-[#374151]">{canonicaAnswer}</p>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
                    <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Owner review</p>
                        <h2 className="text-2xl font-semibold text-white">Approved knowledge stays the authority.</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">{ownerReview}</p>
                    </article>
                    <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Setup steps</p>
                        <ol className="space-y-3">
                            {setupSteps.map((step, index) => (
                                <li key={step} className="flex gap-3 text-sm leading-relaxed text-[#d6d6ef]">
                                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-300">
                                        {index + 1}
                                    </span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    </article>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8 max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Explore Canonica</p>
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
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-indigo-400/25 hover:bg-indigo-500/[0.04]"
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
