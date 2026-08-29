import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
import { AnswerlatticeHubDiagram } from './AnswerlatticeFlowDiagram';
import AnswerlatticeLink from './AnswerlatticeLink';
import AnswerlatticePageStructuredData from './PageStructuredData';
import PageHero from './PageHero';
import SectionHeader from './SectionHeader';

export type SeoLandingPageProps = {
    eyebrow: string;
    title: string;
    description: string;
    problem: string;
    question: string;
    genericAnswer: string;
    answerlatticeAnswer: string;
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
    answerlatticeAnswer,
    ownerReview,
    setupSteps,
    primaryCta,
    secondaryCta,
    basePath = '',
    canonicalPath,
}: SeoLandingPageProps) {
    const diagramId = `al-seo-${(canonicalPath || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const visibleSetupSteps = setupSteps.slice(0, 6);

    return (
        <main className="al-page-flow">
            {canonicalPath ? <AnswerlatticePageStructuredData path={canonicalPath} /> : null}
            <PageHero
                eyebrow={eyebrow}
                title={title}
                description={description}
                basePath={basePath}
                actions={[
                    {
                        label: primaryCta,
                        href: '/early-access',
                        variant: 'primary',
                        event: 'seo_page_cta_clicked',
                    },
                    {
                        label: secondaryCta || 'See 60-sec demo',
                        href: '/demo',
                        variant: 'secondary',
                        event: 'seo_page_cta_clicked',
                        eventLabel: secondaryCta || 'try_demo',
                    },
                ]}
                proofClassName="max-w-5xl"
                proofItems={[
                    { label: 'Support context', value: 'Route, feature, workflow, role, and plan hints guide relevant help.' },
                    { label: 'Support path', value: 'Approved answers and owner answers come before fallback.' },
                    { label: 'Safety boundary', value: 'Screenshots are user-attached; context never decides workspace identity.' },
                ]}
            />

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Support path"
                        title={question}
                        description="See how AnswerLattice uses reviewed knowledge, safe page context, owner review, and fallback to give the user a useful next step."
                    />
                    <AnswerlatticeHubDiagram
                        idPrefix={`${diagramId}-question`}
                        inputLabel="Before AnswerLattice"
                        outputLabel="With AnswerLattice"
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
                                title: 'Reviewed support',
                                detail: answerlatticeAnswer,
                            },
                            {
                                title: 'Owner review',
                                detail: ownerReview,
                            },
                        ]}
                    />
                </div>
            </section>

            <section className="al-linear-proof border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Setup path"
                        title="Turn what you already know into reviewed support."
                        description="The setup path turns scattered product material and page context into customer-facing support only after owner review."
                    />
                    <div className="al-linear-proof__grid al-linear-proof__grid--compact">
                        <article className="al-linear-proof__copy" data-answerlattice-reveal>
                            <p className="al-linear-proof__kicker">01 / Support setup</p>
                            <h3>Start with the support material you already have.</h3>
                            <p>
                                Docs, product pages, FAQ notes, tickets, and repeated replies become a reviewable setup path instead of scattered founder work.
                            </p>
                            <div className="al-linear-proof__chips">
                                {setupSteps.slice(0, 4).map((step) => (
                                    <span key={step}>{step}</span>
                                ))}
                            </div>
                        </article>

                        <div className="al-linear-proof__visual" data-answerlattice-reveal>
                            <div className="al-linear-proof__mode-stack">
                                {visibleSetupSteps.map((step, index) => (
                                    <article key={step} className="al-linear-proof__mode">
                                        <span className="al-linear-proof__card-index">{String(index + 1).padStart(2, '0')}</span>
                                        <div>
                                            <h3>{step}</h3>
                                                <p>
                                                    {index === 0
                                                        ? 'Create the support workspace and map it to the product.'
                                                        : index === visibleSetupSteps.length - 1
                                                          ? 'Use missing answers and feedback to improve the next support pass.'
                                                      : 'Keep this setup step tied to reviewed support material and product pages.'}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <SectionHeader
                        className="mb-8"
                        eyebrow="Explore AnswerLattice"
                        title="The same loop across setup, widget, hosted help, tickets, and review."
                        description="Each product area has a dedicated page so founders, support teams, product teams, and engineers can evaluate the part they care about first."
                    />
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {ANSWERLATTICE_PRODUCT_AREAS.map((area) => (
                            <AnswerlatticeLink
                                key={area.href}
                                basePath={basePath}
                                href={area.href}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-teal-300/25 hover:bg-teal-500/[0.04]"
                            >
                                <h3 className="text-base font-semibold text-white">{area.label}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{area.description}</p>
                            </AnswerlatticeLink>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                    Turn this support gap into a reviewed AnswerLattice setup.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0]">
                    Start with the demo, then prepare scattered product material so the first workspace has pages, docs, FAQs, and owner-approved answers to review.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/pre-onboarding"
                        className="rounded-xl border border-teal-300/20 bg-teal-400/[0.055] px-6 py-3 text-sm font-semibold text-teal-100 transition hover:border-teal-300/35 hover:bg-teal-400/[0.08]"
                    >
                        Prepare inputs first
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/early-access"
                        className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                    >
                        Request early access
                    </AnswerlatticeLink>
                </div>
            </section>
        </main>
    );
}
