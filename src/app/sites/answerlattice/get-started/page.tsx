import { Metadata } from 'next';
import { headers } from 'next/headers';
import { LuArrowRight, LuFileInput } from 'react-icons/lu';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import OnboardingForm from './OnboardingForm';

export const metadata: Metadata = {
    title: 'Get Started',
    description: 'Create your AnswerLattice workspace, add your app, invite the first team members, teach AnswerLattice from starter sources, pick pages where users need help, and get a widget key for page-aware support.',
    alternates: { canonical: '/get-started' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const CRITERIA = [
    { label: 'Your SaaS app is live, beta, or close to launch', description: 'A working product with billing, onboarding, settings, release notes, or other user-facing flows to support.' },
    { label: 'You know the first support questions', description: 'The same setup, billing, role, release, or error questions already appear, or are predictable before launch.' },
    { label: 'You have starter support material', description: 'Docs, FAQs, changelogs, support notes, screenshots, recordings, or common answers AnswerLattice can learn from.' },
    { label: 'You can install one script', description: 'You can add the widget, allow domains, block routes, and pass safe page context.' },
    { label: 'You want answer approval', description: 'You want to approve answers before they become official support guidance.' },
];

const FIRST_SESSION = [
    'Add company and product name',
    'Create your AnswerLattice workspace',
    'Invite the first team members or confirm owner-only access',
    'Get your widget key',
    'Seed starter surfaces for key product pages',
    'Teach AnswerLattice from selected links, docs, FAQs, screenshots, recordings, or support macros',
    'Verify widget install and page context',
    'Review the first approved answers',
];

export default function AnswerlatticeGetStartedPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/get-started" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="text-center">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Get Started</p>
                            <h1 className="mb-4 max-w-full text-4xl font-bold sm:text-5xl">
                                Create your AnswerLattice workspace.
                            </h1>
                            <p className="mb-12 max-w-full text-lg leading-relaxed text-[#a0a0c0]">
                                Sign in with Google, add your app, invite the people who need access, pick the pages where users need help, and get a widget key for your first support layer.
                            </p>
                        </div>

                        <PageProofStrip
                            className="mb-10"
                            items={[
                                { label: 'First session', value: 'Workspace, team, product pages, widget key' },
                                { label: 'Best input', value: 'Docs, FAQs, owner notes, screenshots, recordings, recurring questions' },
                                { label: 'Go-live rule', value: 'Review answers and verify widget context before relying on live support' },
                            ]}
                        />

                        <div className="mb-10 rounded-[1.5rem] border border-teal-300/20 bg-teal-400/[0.055] p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-200/15 bg-teal-300/[0.08] text-teal-100">
                                        <LuFileInput aria-hidden size={20} />
                                    </span>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Have a repo, docs, website, screenshots, or owner notes?</h2>
                                        <p className="mt-1 text-sm leading-relaxed text-[#d6d6ef]">
                                            Run pre-onboarding first so AnswerLattice starts with cleaner source truth.
                                        </p>
                                    </div>
                                </div>
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/pre-onboarding"
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                                >
                                    Prepare inputs
                                    <LuArrowRight aria-hidden size={15} />
                                </AnswerlatticeLink>
                            </div>
                        </div>

                        <div className="grid w-full gap-8 md:grid-cols-2">
                            {/* Left: criteria */}
                            <div>
                                <h2 className="mb-6 text-xl font-semibold">AnswerLattice is a good fit when</h2>
                                <div className="space-y-4">
                                    {CRITERIA.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-[10px] text-teal-300">
                                                {i + 1}
                                            </span>
                                            <div>
                                                <div className="text-sm font-medium text-white">{item.label}</div>
                                                <div className="text-xs text-[#6b6b8a]">{item.description}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Self-service signup form */}
                            <OnboardingForm />
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-3 text-xl font-semibold">What you need before signup</h2>
                        <p className="mb-6 text-sm leading-relaxed text-[#a0a0c0]">
                            You do not need a full help center to start. Bring your best notes, recurring questions, setup instructions, release updates, screenshots, or short support recordings. The Pre-Onboarding Kit can organize those sources before you upload them.
                        </p>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-300">First session checklist</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {FIRST_SESSION.map((item, index) => (
                                    <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#101028] p-3">
                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-[11px] font-bold text-teal-200">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm leading-relaxed text-[#d6d6ef]">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <p className="text-sm text-[#6b6b8a]">
                        Not ready to apply?{' '}
                        <AnswerlatticeLink basePath={basePath} href="/product" className="text-teal-300 hover:text-teal-200">
                            Learn more about how AnswerLattice works
                        </AnswerlatticeLink>
                    </p>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
