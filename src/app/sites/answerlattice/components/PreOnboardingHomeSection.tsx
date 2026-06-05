import { LuArrowRight, LuClipboardCheck, LuFileInput, LuShieldCheck } from 'react-icons/lu';
import AnswerlatticeLink from './AnswerlatticeLink';
import SectionHeader from './SectionHeader';

const PRE_ONBOARDING_STEPS = [
    {
        icon: LuFileInput,
        title: 'Give the agent real sources',
        description: 'Repo, docs, website pages, API specs, support exports, owner notes, screenshots, or recordings.',
    },
    {
        icon: LuClipboardCheck,
        title: 'Create the intake package',
        description: 'The prompt prepares source files, support questions, product surfaces, asset briefs, and upload skeletons.',
    },
    {
        icon: LuShieldCheck,
        title: 'Review before AnswerLattice learns',
        description: 'Private data stays out, risky claims stay gated, and blocked sources remain pending.',
    },
];

export default function PreOnboardingHomeSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="al-primary-radial-left border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Source preparation"
                    title="Use the Pre-Onboarding Kit when your sources are scattered."
                    description="This stays visible, but lower in the story: founders first understand the product value, then use the kit to package repo context, docs, website pages, owner notes, screenshots, recordings, and support questions before setup."
                />

                <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
                    <div className="flex flex-col justify-between rounded-[1.5rem] border border-teal-300/20 bg-teal-400/[0.055] p-6">
                        <div>
                            <div className="mb-5 inline-flex rounded-full border border-teal-200/20 bg-teal-300/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-teal-100">
                                Preparation entry
                            </div>
                            <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                                One page for the prompt, guide, source rules, and safety boundary.
                            </h3>
                            <p className="mt-4 text-sm leading-relaxed text-[#d6d6ef]">
                                Owners can use the human page. Agents and IDEs can use the raw Markdown prompt and companion guides when they need machine-readable instructions.
                            </p>
                        </div>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/pre-onboarding"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:bg-teal-800"
                            >
                                Open Pre-Onboarding Kit
                                <LuArrowRight aria-hidden size={16} />
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/pre-onboarding/guide"
                                className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.035] px-5 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                Read the guide
                            </AnswerlatticeLink>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {PRE_ONBOARDING_STEPS.map((step) => {
                            const Icon = step.icon;
                            return (
                                <article key={step.title} className="rounded-[1.5rem] border border-white/[0.08] bg-[#101028]/75 p-5">
                                    <span className="al-primary-accent-text flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05]">
                                        <Icon aria-hidden size={20} />
                                    </span>
                                    <h3 className="mt-5 text-lg font-semibold leading-snug text-white">{step.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{step.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
