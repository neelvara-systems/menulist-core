import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import OnboardingForm from './OnboardingForm';

export const metadata: Metadata = {
    title: 'Get Started',
    description: 'Create your Canonica workspace, add your app, pick pages where users get stuck, and get a widget key for page-aware support.',
    alternates: { canonical: '/get-started' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const CRITERIA = [
    { label: 'Your SaaS app is live or close to launch', description: 'A product with real users, billing, onboarding, settings, or release notes.' },
    { label: 'Users ask repeated questions', description: 'The same setup, billing, role, release, or error questions appear more than once.' },
    { label: 'You have starter support material', description: 'Docs, FAQs, changelogs, support notes, or common answers Canonica can learn from.' },
    { label: 'You can install one script', description: 'You can add the widget, allow domains, block routes, and pass safe page context.' },
    { label: 'You want answer approval', description: 'You want to approve answers before they become official support guidance.' },
];

const FIRST_SESSION = [
    'Add company and product name',
    'Create your Canonica workspace',
    'Get your widget key',
    'Seed starter surfaces for key app pages',
    'Import first docs, FAQs, changelog, or support macros',
    'Verify widget install and page context',
    'Review the first approved answers',
];

export default function CanonicaGetStartedPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/get-started" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto w-full max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Get Started</p>
                        <h1 className="mb-4 max-w-full text-4xl font-bold sm:text-5xl">
                            Create your Canonica workspace.
                        </h1>
                        <p className="mb-12 max-w-full text-lg leading-relaxed text-[#a0a0c0]">
                            Sign in with Google, add your app, pick the pages where users get stuck, and get a widget key for your first support layer.
                        </p>

                        <div className="grid w-full gap-8 md:grid-cols-2">
                            {/* Left: criteria */}
                            <div>
                                <h2 className="mb-6 text-xl font-semibold">Canonica is a good fit when</h2>
                                <div className="space-y-4">
                                    {CRITERIA.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] text-indigo-400">
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
                            You do not need a full help center to start. Bring your best notes, recurring questions, setup instructions, and release updates.
                        </p>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-400">First session checklist</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {FIRST_SESSION.map((item, index) => (
                                    <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#101028] p-3">
                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-300">
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
                        <CanonicaLink basePath={basePath} href="/product" className="text-indigo-400 hover:text-indigo-300">
                            Learn more about how Canonica works
                        </CanonicaLink>
                    </p>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
