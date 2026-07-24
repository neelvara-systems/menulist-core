import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import AnswerlatticeLink from '../../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../../components/PageStructuredData';
import PageProofStrip from '../../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Founder Support Launch Kit',
    description: 'A bounded AnswerLattice launch workflow for preparing product sources, generating and reviewing ten product-specific support questions, installing the widget, and measuring confirmed resolution.',
    alternates: { canonical: '/resources/founder-launch-kit' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch {
        return '';
    }
}

const STEPS = [
    ['Prepare source truth', 'Use the Pre-Onboarding Kit with the product material you already have. Keep blocked sources and private data out.'],
    ['Generate the product-specific ten', 'Choose one prepared intake. AnswerLattice creates ten editable questions and draft answers with source evidence, applicability, risk, and missing-evidence warnings.'],
    ['Review and approve the answer path', 'Correct every draft in Knowledge Intake. Use Governance for canonical approval, or keep explicit no-answer and escalation behavior when evidence is insufficient.'],
    ['Run deterministic checks', 'Run canonical-only Answer Tests first. They verify the expected answer route without calling an AI provider.'],
    ['Install and verify', 'Confirm the widget script, allowed origin, blocked routes, safe page context, and product-page behavior.'],
    ['Measure the outcome', 'Track explicit Solved and Still need help responses. Treat no escalation as a routing metric, not proof of resolution.'],
    ['Review weekly', 'Use drift, repeated misses, release checks, and owner-confirmed Support Board work to keep approved answers current.'],
] as const;

const TOOL_PACKAGES = [
    ['Codex', '/pre-onboarding/codex.md'],
    ['Cursor', '/pre-onboarding/cursor.md'],
    ['Claude Code', '/pre-onboarding/claude-code.md'],
    ['Replit', '/pre-onboarding/replit.md'],
    ['Lovable', '/pre-onboarding/lovable.md'],
] as const;

export default async function AnswerlatticeFounderLaunchKitPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/resources/founder-launch-kit" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="border-b border-white/[0.06] px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Founder support launch kit</p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Make the first ten support questions trustworthy before launch traffic grows.
                    </h1>
                    <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">
                        This path reduces setup to one practical outcome: prepared product sources, ten product-specific reviewed questions, approved answer routes, a verified widget, and explicit end-user resolution feedback.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink basePath={basePath} href="/pre-onboarding" className="rounded-xl border border-white/[0.1] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white">
                            Prepare product inputs
                        </AnswerlatticeLink>
                        <AnswerlatticeLink basePath={basePath} href="/get-started" className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">
                            Create workspace
                        </AnswerlatticeLink>
                    </div>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'First scope', value: 'Ten product-specific priority questions' },
                            { label: 'Authority', value: 'Owner-approved answer truth' },
                            { label: 'Outcome', value: 'Explicit resolution and recontact evidence' },
                        ]}
                    />
                </section>

                <section className="border-b border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-3xl font-bold text-white">The launch workflow</h2>
                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {STEPS.map(([title, description], index) => (
                                <article key={title} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5">
                                    <span className="text-xs font-semibold text-teal-200">Step {index + 1}</span>
                                    <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-3xl font-bold text-white">Start from your AI building environment</h2>
                        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#a0a0c0]">
                            Each Markdown package adds a short tool-specific start to the same master safety and review contract. These are workflow guides, not product integrations.
                        </p>
                        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {TOOL_PACKAGES.map(([label, href]) => (
                                <AnswerlatticeLink key={href} basePath={basePath} href={href} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-teal-300/25 hover:text-white">
                                    {label} package
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
                        <article className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">For one founder</p>
                            <h2 className="mt-3 text-2xl font-bold text-white">Prove one product before expanding.</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">Use real product sources and historical questions. Measure review time, answer correctness, explicit resolution, and recontact before adding broader automation.</p>
                        </article>
                        <article className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">For studios</p>
                            <h2 className="mt-3 text-2xl font-bold text-white">Keep one workspace per product.</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">Reuse the operating checklist, not customer truth. Every client keeps separate sources, widget credentials, permissions, questions, answers, and proof consent.</p>
                            <AnswerlatticeLink basePath={basePath} href="/contact" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-white/[0.1] px-4 py-2 text-sm font-semibold text-[#d6d6ef] transition hover:border-teal-300/25 hover:text-white">
                                Discuss a studio rollout
                            </AnswerlatticeLink>
                        </article>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
