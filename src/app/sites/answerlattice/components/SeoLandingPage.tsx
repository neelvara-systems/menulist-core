import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
import { AnswerlatticeHubDiagram, AnswerlatticeSequenceDiagram } from './AnswerlatticeFlowDiagram';
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
                        href: '/get-started',
                        variant: 'primary',
                        event: 'seo_page_cta_clicked',
                    },
                    {
                        label: secondaryCta || 'See demo',
                        href: '/demo',
                        variant: 'secondary',
                        event: 'seo_page_cta_clicked',
                        eventLabel: secondaryCta || 'try_demo',
                    },
                ]}
                proofClassName="max-w-5xl"
                proofItems={[
                    { label: 'Page context', value: 'Route, feature, workflow, role, and plan hints guide the answer.' },
                    { label: 'Answer order', value: 'Approved answers and owner answers before fallback.' },
                    { label: 'Safety boundary', value: 'Screenshots are user-attached; context never decides workspace identity.' },
                ]}
            />

            <section className="border-t border-white/[0.06] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Question flow"
                        title={question}
                        description="AnswerLattice turns a generic support gap into a reviewed answer that matches the current product page."
                    />
                    <AnswerlatticeHubDiagram
                        idPrefix={`${diagramId}-question`}
                        inputLabel="Before AnswerLattice"
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
                                title: 'AnswerLattice answer',
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

            <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Setup path"
                        title="Reviewed support stays the authority."
                        description="The setup path keeps source material, page context, and owner approval connected before answers become official."
                    />
                    <AnswerlatticeSequenceDiagram
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
                    Start with the demo, then prepare source material so the first workspace has pages, docs, FAQs, and owner-approved answers to review.
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
                        href="/get-started"
                        className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                    >
                        Start support setup
                    </AnswerlatticeLink>
                </div>
            </section>
        </main>
    );
}
