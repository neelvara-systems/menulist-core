import { Metadata } from 'next';
import { headers } from 'next/headers';
import {
    LuArrowRight,
    LuBookOpen,
    LuCheck,
    LuDatabase,
    LuFileText,
    LuShieldCheck,
} from 'react-icons/lu';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import { AnswerlatticeSequenceDiagram } from '../components/AnswerlatticeFlowDiagram';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import AnswerlatticePreOnboardingPromptModal from './PromptModal';

export const metadata: Metadata = {
    title: 'Pre-Onboarding Kit | AnswerLattice',
    description:
        'Use an AI coding agent to prepare product website links, docs, owner notes, policies, support questions, and screenshot rules before AnswerLattice onboarding.',
    alternates: { canonical: '/pre-onboarding' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch {
        return '';
    }
}

const OUTPUTS = [
    {
        title: 'Source inputs',
        description: 'Product context, workflows, support topics, website truth, policy boundaries, and source evidence maps.',
        icon: LuFileText,
    },
    {
        title: 'Upload skeletons',
        description: 'Manifest and AnswerLattice add-source payloads that match the generated source files.',
        icon: LuDatabase,
    },
    {
        title: 'Support tests',
        description: 'Owner-style questions that prove AnswerLattice can answer routine support and escalate risky topics.',
        icon: LuBookOpen,
    },
    {
        title: 'Screenshot rules',
        description: 'Asset slots, demo walkthrough briefs, capture plan, scrub level, and approval gates before public website use.',
        icon: LuShieldCheck,
    },
];

const SOURCE_MODES = [
    'Repo and website',
    'Multi-product repo',
    'Website only',
    'Docs only',
    'Owner notes and screenshots',
    'Mixed source bundle',
];

const SAFETY_ITEMS = [
    'No secrets, tokens, cookies, or service accounts.',
    'No payment details, raw logs, or private customer records.',
    'No legal, privacy, refund, or security claims without approved source wording.',
    'No guarantee that every AI IDE can inspect every private repo, login-only app, website, recording, or file.',
    'Unavailable sources must be marked pending instead of treated as covered.',
    'No live support until sources, product surfaces, widget context, and test questions pass.',
];

export default function AnswerlatticePreOnboardingPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/pre-onboarding" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="al-primary-radial-page relative overflow-hidden border-b border-white/[0.06] px-4 py-20 sm:px-6 lg:py-24">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                        <div>
                            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-300">Pre-Onboarding Kit</p>
                            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                                Prepare AnswerLattice before setup starts.
                            </h1>
                            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                                Give your AI coding agent one prompt. It turns the product sources you actually have - repo, docs, website links, API specs, support exports, owner notes, policies, recordings, or screenshots - into an AnswerLattice-ready upload package.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/pre-onboarding/guide"
                                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                                >
                                    Read the full guide
                                </AnswerlatticeLink>
                                <AnswerlatticePreOnboardingPromptModal
                                    basePath={basePath}
                                    buttonClassName="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                                    buttonLabel="Open the agent prompt"
                                />
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/get-started"
                                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                                >
                                    Start AnswerLattice setup
                                </AnswerlatticeLink>
                            </div>
                            <PageProofStrip
                                className="mt-8"
                                items={[
                                    { label: 'Input modes', value: 'Repo, website, docs, owner notes, screenshots, mixed sources' },
                                    { label: 'Output', value: 'Reviewed source package, upload skeletons, support tests, asset rules' },
                                    { label: 'Boundary', value: 'Prepares inputs; does not publish official answers' },
                                ]}
                            />
                        </div>

                        <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                            <div className="overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-[#101028] text-white">
                                <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.025] px-5 py-4">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-[#8ea0c0]">Agent output</span>
                                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">Review ready</span>
                                </div>
                                <div className="space-y-3 p-5">
                                    {[
                                        'standardized source inputs',
                                        'api-payloads/*.jsonl',
                                        'production-onboarding/*.csv',
                                        'asset-inputs/screenshot plan',
                                    ].map((item, index) => (
                                        <div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm text-[#d6d6ef]">{item}</span>
                                            {index < 3 ? (
                                                <LuArrowRight aria-hidden size={15} className="ml-auto text-[#8ea0c0]" />
                                            ) : (
                                                <LuCheck aria-hidden size={15} className="ml-auto text-emerald-300" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="What it prepares"
                            title="Structured source truth before AnswerLattice intake."
                            description="The prompt does the preparation work outside AnswerLattice, then leaves the owner with a reviewed package to upload."
                        />
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {OUTPUTS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article key={item.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
                                        <span className="al-primary-accent-text flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05]">
                                            <Icon aria-hidden size={20} />
                                        </span>
                                        <h2 className="mt-5 text-lg font-bold text-white">{item.title}</h2>
                                        <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{item.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
                        {[
                            ['Owner guide', '/pre-onboarding/owner-guide.md', 'What to prepare, how to run the prompt, how to review the generated folder, and when to enable live support.'],
                            ['Agent guide', '/pre-onboarding/agent-guide.md', 'Rules for the AI IDE: source-first inspection, missing-source handling, validation, and confidence language.'],
                            ['Full guide', '/pre-onboarding/guide', 'A human-readable runbook for repo, website-only, docs-only, owner-notes, and early-product paths.'],
                        ].map(([title, href, description]) => (
                            <AnswerlatticeLink
                                key={href}
                                basePath={basePath}
                                href={href}
                                className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-teal-300/25 hover:bg-teal-400/[0.055]"
                            >
                                <h2 className="text-lg font-bold text-white">{title}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{description}</p>
                                <span className="mt-5 inline-block text-xs font-semibold text-teal-200">Open</span>
                            </AnswerlatticeLink>
                        ))}
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Workflow"
                            title="From scattered product material to reviewed intake inputs."
                            description="The agent prepares the package. AnswerLattice still reviews drafts before anything becomes live support."
                        />
                        <AnswerlatticeSequenceDiagram
                            idPrefix="al-pre-onboarding-flow"
                            splitAfter={3}
                            items={[
                                { title: 'Paste prompt', detail: 'Run the master prompt in a repo, docs workspace, website brief, or owner-notes workspace.' },
                                { title: 'Inspect sources', detail: 'Check website pages, docs, app routes, policies, support flows, and screenshots.' },
                                { title: 'Create package', detail: 'Generate source files, payloads, product surfaces, support tests, and asset rules.' },
                                { title: 'Owner review', detail: 'Remove private data, fix inaccuracies, and approve what can enter AnswerLattice.' },
                                { title: 'Upload to AnswerLattice', detail: 'Use Knowledge Intake to create review drafts from the prepared source set.' },
                                { title: 'Enable support', detail: 'Go live only after answers, surfaces, widget context, and test questions pass.' },
                            ]}
                        />
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Source modes"
                            title="It adapts to the product material you have."
                            description="A full repo is useful, but not mandatory. The prompt keeps AnswerLattice inputs structured while marking unavailable sources instead of guessing."
                        />
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            {SOURCE_MODES.map((mode) => (
                                <div key={mode} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm font-semibold text-[#d6d6ef]">
                                    {mode}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Safety boundary</p>
                            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">The prompt prepares inputs. It does not publish authority.</h2>
                            <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                                Pre-onboarding makes the first AnswerLattice intake cleaner, but it only covers sources the agent can actually read. AnswerLattice still requires source review, owner approval, and production checks before answering live users.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {SAFETY_ITEMS.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuShieldCheck aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-teal-200" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-5xl rounded-[2rem] border border-teal-500/20 bg-teal-500/[0.055] p-6 text-center sm:p-10">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-200">Start before onboarding</p>
                        <h2 className="text-3xl font-bold text-white sm:text-4xl">Give AnswerLattice better source truth on day one.</h2>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#d6d6ef]">
                            Use the prompt first, review the output, then upload the selected sources into AnswerLattice Knowledge Intake.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <AnswerlatticePreOnboardingPromptModal
                                basePath={basePath}
                                buttonClassName="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                                buttonLabel="Open prompt"
                            />
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/product/knowledge-intake"
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                See Knowledge Intake
                            </AnswerlatticeLink>
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
